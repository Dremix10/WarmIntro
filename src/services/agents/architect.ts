// Architect — the prompt-engineer agent. Lives in the feedback loop:
// observes Critic verdicts, user skip reasons, fact-check failures, and
// high-edit-distance drafts. Asks Claude (acting as a senior prompt
// engineer) to identify recurring failure patterns and suggest positive,
// example-driven prompt additions to address them.
//
// v1 (this file): observation + suggestion. Posts a daily Telegram digest
// + writes signals so we can audit. Admin reviews suggestions and edits
// the BASE_VOICE / Critic prompts manually.
//
// v2 (later): prompts move into a versioned `prompts` table. Architect
// proposes new versions. Admin approves. Active version loaded at
// runtime.
//
// v3 (later still): A/B test old vs new prompt automatically; auto-roll
// forward when new version produces higher Critic-approve rate. With
// rollback safety nets.

import { startAgentRun, endAgentRun, askClaudeJSON, logSignal } from "./shared";
import { restSelect, eq, gte } from "@/lib/supabase-rest";
import { sendTelegram } from "@/lib/telegram";
import { OPUS_MODEL } from "@/services/claude";

export interface ArchitectOutput {
  draftsReviewed: number;
  patternsFound: number;
  topPattern: string | null;
  digestSent: boolean;
}

interface DraftFailure {
  draftId: string;
  type: string;
  status: string;
  iteration: number;
  bodyExcerpt: string;
  criticVerdict: string | null;
  criticScore: number | null;
  criticFeedback: string | null;
  skipReason: string | null;
  factCheckClaims: string[];
  // Upstream root-cause signals — populated by enrichWithUpstreamSignals
  // so the Architect can diagnose whether a failure is downstream
  // (Correspondent prompt issue) or upstream (Scout starvation, banker
  // data thinness, Researcher selection issue, etc.).
  upstream: {
    bankerFindingCount: number;       // Scout output for this banker
    bankerHasProfile: boolean;        // banker_profiles row exists
    bankerHasRecentDeals: boolean;    // banker_deals rows exist
    bankerEmailVerified: boolean;
    iterationRegression: boolean;      // iter N re-introduced a phrase that
                                       // was rejected on an earlier iter
    cumulativeStackedConstraints: boolean; // iter has >=2 distinct prior
                                       // rejection axes — model regression
                                       // on these is empirically observed
  };
}

interface RecurringPattern {
  name: string;
  frequencyEstimate: string;
  layer: "prompt" | "upstream_data" | "iteration_regression" | "other";
  whyItHappens: string;
  positiveFix: string;
  exampleBefore: string;
  exampleAfter: string;
}

interface ArchitectReport {
  recurringPatterns: RecurringPattern[];
  oneSentenceTakeaway: string;
}

const ARCHITECT_SYSTEM_PROMPT = `You are a senior prompt engineer + systems analyst reviewing recent failures from an AI pipeline that drafts cold-outreach emails for students reaching out to investment bankers.

Your job: find the 2-3 recurring failure patterns AND diagnose each at the correct layer. A failure can come from:

  (a) the Correspondent's PROMPT — the model is told the right thing but reaches for an AI-tell anyway. Fix: positive, example-driven prompt addition.
  (b) UPSTREAM DATA STARVATION — Scout returned 0 findings, banker_profile is missing, banker_deals is empty. The model has nothing real to anchor on, so it fabricates. Fix: surface this as a Researcher / Scout / Curator issue, not a Correspondent prompt fix.
  (c) ITERATION REGRESSION — the model dropped iter 0's correction when addressing iter 1's complaint. Empirically observed: Opus 4.7 trades old constraints for new ones when feedback stacks. Fix: tighten the revise loop (lower MAX_ITERATIONS, dedupe constraints, pin literal banned strings at top of prompt instead of in cumulative prose).

Each input row carries an 'upstream' object with bankerFindingCount, bankerHasProfile, bankerHasRecentDeals, iterationRegression, cumulativeStackedConstraints. USE THESE to decide which layer each pattern lives at. A pattern where every example has bankerFindingCount=0 is upstream starvation, not prompt failure. A pattern where iterationRegression=true on iter 2 is iteration-regression, not prompt failure.

POSITIVE-INSTRUCTION DIRECTIVE — your suggestions follow the same rule as the prompts you're improving:
- Tell the system what TO do, with a concrete example. Not a list of "don't"s.
- A great suggestion: name the pattern, explain why the model/system falls for it, propose a concrete fix at the right layer with a before/after example.
- Bad suggestions: "ban X phrase," "delete Y section." The model regresses on stacked bans, and we already have a deterministic guardrail for literal banned phrases.

EXAMPLE of a great pattern + fix:

  Pattern: "Prestige-credential fabrication" (e.g. 'Harvard Corporate Governance Roundtable')
  Layer: upstream data starvation
  Why: the model invents prestige-sounding credentials when banker data is thin (no Scout findings, no profile, no deals). All 6 fabrications in last 5 days had bankerFindingCount <= 1 AND bankerHasProfile = false.
  Fix at the right layer: the Correspondent prompt is fine — the upstream Scout/Curator path is starving the model. Either (a) gate drafting on having >= 1 verified anchor in the data, OR (b) when no anchors exist, force the Correspondent into a 'thin-data mode' that explicitly anchors on student-side specifics + a clear ask, with no banker-specific claims at all.
  Example before (bad opener under thin data): "Saw you were on the Harvard Corporate Governance Roundtable…"
  Example after (thin-data mode): "I'm a Brown CS sophomore taking APMA 1650 — keep coming back to Goldman's TMT group when reading about deal structuring. 15 min next week?"

What NOT to do:
- Don't propose adding more bans to the prompt — the BANNED_PHRASES guardrail in guardrails.ts already enforces deterministic phrase blocks; the model regresses on long DO-NOT lists.
- Don't propose deleting working sections of the prompt.
- Don't put every failure on the prompt layer. If the data shows upstream starvation, say that out loud.

Output strictly as JSON matching the requested shape.`;

async function gatherFailures(sinceIso: string): Promise<DraftFailure[]> {
  // Pull recent rejected/escalated/skipped drafts joined to their latest
  // Critic verdict. We deliberately bias toward failures because that's
  // where the prompt-quality signal lives.
  const rejects = await restSelect("critic_reviews", {
    select: "id, draft_id, verdict, overall_score, feedback, created_at",
    filters: { created_at: gte(sinceIso), verdict: `in.("reject","escalate_to_planner")` },
    order: "created_at.desc",
    limit: 50,
  });

  const draftIds = Array.from(
    new Set((rejects as Array<{ draft_id: string }>).map((r) => r.draft_id))
  );
  const skipped = await restSelect("drafts", {
    select: "id, type, status, body, banker_id, iteration_count, skip_reason, fact_check, created_at",
    filters: { skip_reason: "not.is.null", created_at: gte(sinceIso) },
    order: "created_at.desc",
    limit: 30,
  });

  const draftMap = new Map<string, Record<string, unknown>>();
  // Hydrate draft rows for the rejected critic_reviews.
  if (draftIds.length > 0) {
    const drafts = await restSelect("drafts", {
      select: "id, type, status, body, banker_id, iteration_count, skip_reason, fact_check",
      filters: { id: `in.(${draftIds.join(",")})` },
      limit: 100,
    });
    for (const d of drafts) draftMap.set(d.id as string, d);
  }
  for (const d of skipped) {
    if (!draftMap.has(d.id as string)) draftMap.set(d.id as string, d);
  }

  // Build the upstream-signal lookup tables in batch — one query per
  // table, indexed by banker_id.
  const bankerIds = Array.from(
    new Set(
      Array.from(draftMap.values())
        .map((d) => d.banker_id as string | null)
        .filter((b): b is string => typeof b === "string")
    )
  );
  const findingsByBanker = new Map<string, number>();
  const profileByBanker = new Set<string>();
  const dealsByBanker = new Set<string>();
  const verifiedByBanker = new Set<string>();

  if (bankerIds.length > 0) {
    const findings = await restSelect("banker_findings", {
      select: "banker_id",
      filters: { banker_id: `in.(${bankerIds.join(",")})` },
      limit: 1000,
    });
    for (const f of findings) {
      const k = f.banker_id as string;
      findingsByBanker.set(k, (findingsByBanker.get(k) ?? 0) + 1);
    }
    const profiles = await restSelect("banker_profiles", {
      select: "banker_id",
      filters: { banker_id: `in.(${bankerIds.join(",")})` },
      limit: 500,
    });
    for (const p of profiles) profileByBanker.add(p.banker_id as string);
    const deals = await restSelect("banker_deals", {
      select: "banker_id",
      filters: { banker_id: `in.(${bankerIds.join(",")})` },
      limit: 500,
    });
    for (const dd of deals) dealsByBanker.add(dd.banker_id as string);
    const bankers = await restSelect("bankers", {
      select: "id, email_verified",
      filters: { id: `in.(${bankerIds.join(",")})` },
      limit: 500,
    });
    for (const b of bankers) if (b.email_verified) verifiedByBanker.add(b.id as string);
  }

  // Iteration-regression detection: for each draft with iter >= 2, look
  // at draft_iterations.critic_feedback strings for a banned-phrase
  // mention in iter 0; check if iter N's body contains the same phrase.
  const multiIterDraftIds = Array.from(draftMap.entries())
    .filter(([, d]) => ((d.iteration_count as number) ?? 0) >= 2)
    .map(([id]) => id);
  const iterationRegressionByDraft = new Set<string>();
  const stackedConstraintsByDraft = new Set<string>();
  if (multiIterDraftIds.length > 0) {
    const iterations = await restSelect("draft_iterations", {
      select: "draft_id, iteration, body, critic_feedback",
      filters: { draft_id: `in.(${multiIterDraftIds.join(",")})` },
      order: "iteration.asc",
      limit: 500,
    });
    const byDraft = new Map<string, Array<{ iteration: number; body: string; feedback: string | null }>>();
    for (const r of iterations) {
      const did = r.draft_id as string;
      const arr = byDraft.get(did) ?? [];
      arr.push({
        iteration: r.iteration as number,
        body: (r.body as string) ?? "",
        feedback: (r.critic_feedback as string | null) ?? null,
      });
      byDraft.set(did, arr);
    }
    for (const [did, iters] of byDraft) {
      // Stacked-constraints heuristic: any draft with two or more rejected
      // iterations was hit on at least two distinct rejection paths.
      const rejectedIters = iters.filter((i) => i.feedback);
      if (rejectedIters.length >= 2) stackedConstraintsByDraft.add(did);

      // Regression heuristic: if iter 0's feedback mentions banned phrases
      // by name AND a later iter's body contains one of those phrases,
      // that's a regression.
      const iter0 = iters.find((i) => i.iteration === 0);
      const phraseMatch = iter0?.feedback?.match(/Banned phrases? (?:detected|found)\s*:\s*(.+?)(?:\n|$)/i);
      if (phraseMatch) {
        const phrases = phraseMatch[1].split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
        for (const it of iters) {
          if (it.iteration === 0) continue;
          const bodyLower = it.body.toLowerCase();
          if (phrases.some((p) => bodyLower.includes(p))) {
            iterationRegressionByDraft.add(did);
            break;
          }
        }
      }
    }
  }

  const buildUpstream = (bankerId: string | null | undefined, draftId: string): DraftFailure["upstream"] => {
    const bid = bankerId ?? "";
    return {
      bankerFindingCount: findingsByBanker.get(bid) ?? 0,
      bankerHasProfile: profileByBanker.has(bid),
      bankerHasRecentDeals: dealsByBanker.has(bid),
      bankerEmailVerified: verifiedByBanker.has(bid),
      iterationRegression: iterationRegressionByDraft.has(draftId),
      cumulativeStackedConstraints: stackedConstraintsByDraft.has(draftId),
    };
  };

  const out: DraftFailure[] = [];
  // For each rejected critic_review, emit one DraftFailure row.
  for (const r of rejects as Array<{ draft_id: string; verdict: string; overall_score: number | null; feedback: string | null }>) {
    const d = draftMap.get(r.draft_id);
    if (!d) continue;
    const factCheck = (d.fact_check as { checks?: Array<{ claim: string; verdict: string }> } | null) ?? null;
    const claims = factCheck?.checks?.filter((c) => c.verdict !== "verified").map((c) => c.claim) ?? [];
    out.push({
      draftId: r.draft_id,
      type: (d.type as string) ?? "cold",
      status: (d.status as string) ?? "unknown",
      iteration: (d.iteration_count as number) ?? 0,
      bodyExcerpt: typeof d.body === "string" ? d.body.slice(0, 400) : "",
      criticVerdict: r.verdict ?? null,
      criticScore: r.overall_score ?? null,
      criticFeedback: r.feedback ?? null,
      skipReason: (d.skip_reason as string | null) ?? null,
      factCheckClaims: claims,
      upstream: buildUpstream(d.banker_id as string | null, r.draft_id),
    });
  }
  // Add skipped drafts that didn't have a Critic reject (skipped post-approve).
  for (const d of skipped) {
    if (out.some((o) => o.draftId === d.id)) continue;
    const factCheck = (d.fact_check as { checks?: Array<{ claim: string; verdict: string }> } | null) ?? null;
    const claims = factCheck?.checks?.filter((c) => c.verdict !== "verified").map((c) => c.claim) ?? [];
    out.push({
      draftId: d.id as string,
      type: (d.type as string) ?? "cold",
      status: (d.status as string) ?? "unknown",
      iteration: (d.iteration_count as number) ?? 0,
      bodyExcerpt: typeof d.body === "string" ? d.body.slice(0, 400) : "",
      criticVerdict: null,
      criticScore: null,
      criticFeedback: null,
      skipReason: (d.skip_reason as string | null) ?? null,
      factCheckClaims: claims,
      upstream: buildUpstream(d.banker_id as string | null, d.id as string),
    });
  }
  return out;
}

// Telegram caps single messages at 4096 chars. The Architect's full
// report routinely exceeds that (the verbatim positiveFix + before +
// after fields are 200-500 chars each × 3 patterns). Truncate each
// field aggressively in the digest; the full report is always in the
// architect_review_completed signal for /admin events.
const TG_MAX_PATTERNS = 3;
const TG_MAX_LEN = 3800; // headroom under the 4096 hard cap
function clip(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function formatTelegramDigest(report: ArchitectReport, draftsReviewed: number): string {
  const lines: string[] = [];
  lines.push(`🏗 Architect digest — ${draftsReviewed} failed drafts in last 24h`);
  lines.push("");
  lines.push(clip(report.oneSentenceTakeaway, 400));
  lines.push("");
  for (const p of report.recurringPatterns.slice(0, TG_MAX_PATTERNS)) {
    lines.push(`▸ ${clip(p.name, 90)}  ·  ${p.frequencyEstimate}  ·  ${p.layer}`);
    lines.push(`  Why: ${clip(p.whyItHappens, 280)}`);
    lines.push(`  Fix: ${clip(p.positiveFix, 320)}`);
    if (p.exampleAfter) lines.push(`  After: "${clip(p.exampleAfter, 220)}"`);
    lines.push("");
  }
  lines.push(`(full report in /admin → architect_review_completed signal)`);
  let out = lines.join("\n");
  if (out.length > TG_MAX_LEN) out = out.slice(0, TG_MAX_LEN - 1) + "…";
  return out;
}

export async function runArchitect(opts: { lookbackHours?: number } = {}): Promise<ArchitectOutput> {
  const ctx = await startAgentRun({ agent: "architect", triggeredBy: "cron", inputSummary: { lookbackHours: opts.lookbackHours ?? 24 } });
  const out: ArchitectOutput = { draftsReviewed: 0, patternsFound: 0, topPattern: null, digestSent: false };

  try {
    const sinceIso = new Date(Date.now() - (opts.lookbackHours ?? 24) * 60 * 60 * 1000).toISOString();
    const failures = await gatherFailures(sinceIso);
    out.draftsReviewed = failures.length;

    if (failures.length < 3) {
      // Not enough signal — don't spam Telegram with thin reports.
      await logSignal({
        agent: "architect",
        signalType: "architect_review_skipped",
        metadata: { reason: "too_few_failures", count: failures.length },
      });
      await endAgentRun(ctx, out as unknown as Record<string, unknown>);
      return out;
    }

    const userPrompt = `Review the following ${failures.length} failed drafts. Find 2-3 recurring patterns. For each, diagnose at the correct layer (prompt / upstream_data / iteration_regression / other) using the 'upstream' fields on each row.

Aggregates worth computing as you go:
- How many failures had bankerFindingCount = 0 AND bankerHasProfile = false?  (signal of upstream data starvation)
- How many had iterationRegression = true?  (signal of iteration-regression)
- How many had cumulativeStackedConstraints = true?  (signal that the revise loop is overloaded)

FAILURES:
${JSON.stringify(failures, null, 2)}

Return JSON of shape:
{
  "recurringPatterns": [
    {
      "name": "short label",
      "frequencyEstimate": "e.g. '6 of 12 drafts'",
      "layer": "prompt | upstream_data | iteration_regression | other",
      "whyItHappens": "1-2 sentences on the root cause, grounded in the upstream fields",
      "positiveFix": "the change to make at the right layer, written as positive instruction with no 'don't'",
      "exampleBefore": "concrete bad opener / failure example",
      "exampleAfter": "concrete fixed opener / behavior example"
    }
  ],
  "oneSentenceTakeaway": "the single most impactful change to make this week, name the layer it lives at"
}`;

    const report = await askClaudeJSON<ArchitectReport>(userPrompt, {
      systemPrompt: ARCHITECT_SYSTEM_PROMPT,
      model: OPUS_MODEL,
      maxTokens: 2048,
      agent: "architect",
    });

    out.patternsFound = report.recurringPatterns.length;
    out.topPattern = report.recurringPatterns[0]?.name ?? null;

    await logSignal({
      agent: "architect",
      signalType: "architect_review_completed",
      metadata: {
        draftsReviewed: failures.length,
        patternsFound: report.recurringPatterns.length,
        report,
      },
    });

    const digest = formatTelegramDigest(report, failures.length);
    const tg = await sendTelegram(digest);
    out.digestSent = tg.sent;

    await endAgentRun(ctx, out as unknown as Record<string, unknown>);
    return out;
  } catch (err) {
    await endAgentRun(ctx, out as unknown as Record<string, unknown>, String(err));
    return out;
  }
}
