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
}

interface RecurringPattern {
  name: string;
  frequencyEstimate: string;
  whyItHappens: string;
  positiveFix: string;
  exampleBefore: string;
  exampleAfter: string;
}

interface ArchitectReport {
  recurringPatterns: RecurringPattern[];
  oneSentenceTakeaway: string;
}

const ARCHITECT_SYSTEM_PROMPT = `You are a senior prompt engineer reviewing recent output failures from an AI that drafts cold-outreach emails for college students reaching out to investment bankers.

Your job: read the failed drafts + their Critic feedback + any user skip reasons. Find the 2-3 recurring failure patterns. For each, propose a POSITIVE, example-driven prompt addition that would prevent it.

Good suggestions look like this — note the structure: name the pattern, explain why the model falls for it, then write a concrete instruction WITH a before/after example so the model sees what success looks like.

Example of a great suggestion:

  Pattern: "School name-drop opener" — happens when banker data is thin and the model falls back to 'saw you went to Brown.'
  Why: shows the model ran a query, not that it noticed anything specific. Critic flags as 'could go to any Brown alum.'
  Positive fix: "When the only shared anchor is school, lead with one specific thing about YOU instead — a class, a club, a real reason for IB. The school overlap is context, not the opener."
  Example before: "Saw you went to Brown. I'm interested in IB."
  Example after: "I'm a Brown CS sophomore taking APMA 1650 — trying to figure out if probability rigor maps onto deal work."

What NOT to do:
- Don't write rules in negative form ("Don't do X"). Write what TO do instead.
- Don't pile on more bans to a long DO-NOT list. The model regresses on those.
- Don't suggest deleting working sections of the prompt.

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
    select: "id, type, status, body, iteration_count, skip_reason, fact_check, created_at",
    filters: { skip_reason: "not.is.null", created_at: gte(sinceIso) },
    order: "created_at.desc",
    limit: 30,
  });

  const draftMap = new Map<string, Record<string, unknown>>();
  // Hydrate draft rows for the rejected critic_reviews.
  if (draftIds.length > 0) {
    const drafts = await restSelect("drafts", {
      select: "id, type, status, body, iteration_count, skip_reason, fact_check",
      filters: { id: `in.(${draftIds.join(",")})` },
      limit: 100,
    });
    for (const d of drafts) draftMap.set(d.id as string, d);
  }
  for (const d of skipped) {
    if (!draftMap.has(d.id as string)) draftMap.set(d.id as string, d);
  }

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
    });
  }
  return out;
}

function formatTelegramDigest(report: ArchitectReport, draftsReviewed: number): string {
  const lines: string[] = [];
  lines.push(`🏗 Architect digest — ${draftsReviewed} failed drafts in last 24h`);
  lines.push("");
  lines.push(`*${report.oneSentenceTakeaway}*`);
  lines.push("");
  for (const p of report.recurringPatterns.slice(0, 3)) {
    lines.push(`▸ *${p.name}* (${p.frequencyEstimate})`);
    lines.push(`  Why: ${p.whyItHappens}`);
    lines.push(`  Fix: ${p.positiveFix}`);
    if (p.exampleBefore) lines.push(`  Before: "${p.exampleBefore}"`);
    if (p.exampleAfter) lines.push(`  After: "${p.exampleAfter}"`);
    lines.push("");
  }
  return lines.join("\n");
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

    const userPrompt = `Review the following ${failures.length} failed drafts. Find 2-3 recurring patterns. For each, write a positive, example-driven prompt addition.

FAILURES:
${JSON.stringify(failures, null, 2)}

Return JSON of shape:
{
  "recurringPatterns": [
    {
      "name": "short label",
      "frequencyEstimate": "e.g. '6 of 12 drafts'",
      "whyItHappens": "1 sentence on the root cause",
      "positiveFix": "the instruction to add to the prompt — positive form, no 'don't'",
      "exampleBefore": "concrete bad opener line",
      "exampleAfter": "concrete fixed opener line"
    }
  ],
  "oneSentenceTakeaway": "the single most impactful change to make this week"
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
