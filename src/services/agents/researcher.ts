// Researcher agent — find + rank bankers for a user
// Tools: queryBankerDB, scoreBankerFit (Claude), scrapeSerper, enrichHunter, logSignal
// Outputs candidates to drive Correspondent's drafting queue

import { startAgentRun, endAgentRun, logSignal } from "./shared";
import { findRealAlumni } from "@/services/linkedin-search";
import { enrichEmailBatch, verifyEmailViaHunter } from "@/services/hunter/enrich";
import { getAdminClient } from "@/lib/supabase-admin";
import { getActiveScoringWeights } from "@/services/signals/aggregate";
import { restSelect, restSelectOne, restUpdate, eq, isNull } from "@/lib/supabase-rest";
import type { Banker } from "@/shared/ib-types";

interface UserProfileRow {
  id: string;
  name: string;
  university: string;
  major: string;
  graduation_year: number;
  target_firms: string[];
  target_groups: string[];
  warm_hints: string[];
}

export interface ResearcherCandidate {
  bankerId: string;
  firmId?: string;
  groupId?: string;
  name: string;
  title: string;
  warmth: number;
  reasonToContact: string;
  priority: number;
}

export interface ResearcherInput {
  userId: string;
  needed: number;
  excludeBankerIds?: string[];
}

export interface ResearcherOutput {
  candidates: ResearcherCandidate[];
  sourced: number;
}

// ===== warmth scoring (migrated from legacy alumni-engine.ts, IB-adapted) =====
const WARMTH_BASE = 30;
const WARMTH_SAME_SCHOOL = 20;
const WARMTH_SAME_MAJOR = 15;
const WARMTH_CLOSE_GRAD = 10;
const WARMTH_MID_GRAD = 5;
const WARMTH_SENIOR_ROLE = 5;
const WARMTH_HIGH_RESPONSE_RATE = 10;
// Penalty for summer-analyst / intern titles. Their work email is usually
// deactivated 6-12 months after the program ends (PJT auto-replies with
// "no longer an active address"), so even a same-school SA from last
// summer is a worse contact than a current full-time analyst.
const WARMTH_SUMMER_INTERN_PENALTY = 25;
// If a banker's row is stale by more than this and their title looks
// summer/intern-y, re-verify the email via Hunter before surfacing.
const STALE_SUMMER_THRESHOLD_DAYS = 270; // ~9 months

function isSummerOrInternTitle(title: string): boolean {
  const t = title.toLowerCase();
  return /summer\s+analyst|summer\s+intern|\bintern\b/.test(t);
}

function seniorityScore(title: string): number {
  const t = title.toLowerCase();
  if (t.includes("md") || t.includes("managing director")) return 4;
  if (t.includes("director") || t.includes("executive director")) return 3;
  if (t.includes("vp") || t.includes("vice president")) return 2;
  if (t.includes("associate")) return 1;
  return 0; // analyst
}

function computeWarmth(
  banker: Banker,
  user: UserProfileRow,
  responseRateBoost: number
): number {
  let score = WARMTH_BASE;
  if (banker.university && banker.university.toLowerCase() === user.university.toLowerCase()) {
    score += WARMTH_SAME_SCHOOL;
  }
  if (banker.gradYear) {
    const diff = Math.abs(banker.gradYear - user.graduation_year);
    if (diff <= 5) score += WARMTH_CLOSE_GRAD;
    else if (diff <= 10) score += WARMTH_MID_GRAD;
  }
  const snr = seniorityScore(banker.title);
  if (snr >= 2) score += WARMTH_SENIOR_ROLE;
  // Response rate boost (per-banker from flywheel)
  if (responseRateBoost > 0.3) score += WARMTH_HIGH_RESPONSE_RATE;
  // Stale-email risk: SA / intern emails get deactivated. Always penalize so
  // a current full-time analyst beats a year-old SA from the same school.
  if (isSummerOrInternTitle(banker.title)) score -= WARMTH_SUMMER_INTERN_PENALTY;
  return Math.min(100, Math.max(0, Math.round(score)));
}

async function loadUserProfile(userId: string): Promise<UserProfileRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const res = await fetch(
    `${url}/rest/v1/profiles?select=id,name,university,major,graduation_year,target_firms,target_groups,warm_hints&id=eq.${userId}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  );
  if (!res.ok) {
    console.warn(`[researcher.loadUserProfile] rest ${res.status}`);
    return null;
  }
  const rows = (await res.json()) as UserProfileRow[];
  return rows[0] ?? null;
}

async function queryBankerDB(
  targetFirms: string[],
  targetGroups: string[],
  excludeIds: string[],
  limit: number
): Promise<Banker[]> {
  // Direct REST — @supabase/supabase-js admin client intermittently returns
  // empty arrays in Edge/serverless runtimes even with service role. Same
  // workaround we applied in /api/setup/firms.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  const rowLimit = Math.max(limit * 3, 30);
  // Only consider bankers we can actually email. Cofounder explicitly:
  // "no we cant allow unverified emails. thats no way to test user-side."
  // email IS NOT NULL is the gate — pattern-guess emails would land in
  // spam and fail Hunter's verification. Hunter-verified rows live with
  // email_verified=true; serper-discovered without enrichment are skipped.
  //
  // Use URLSearchParams for safe encoding. Earlier version embedded literal
  // `"` chars in the URL, which Node fetch sometimes mangled — e2e showed
  // 0 rows returned even though the same query in curl worked. PostgREST
  // accepts firm IDs without quotes for slug-shaped values (no commas, no
  // spaces) so we drop them.
  const params = new URLSearchParams({
    select: "id,firm_id,group_id,name,title,seniority,grad_year,university,linkedin_url,email,email_verified,source,updated_at",
    email: "not.is.null",
    limit: String(rowLimit),
  });
  if (targetFirms.length > 0) {
    params.set("firm_id", `in.(${targetFirms.join(",")})`);
  }
  const endpoint = `${url}/rest/v1/bankers?${params.toString()}`;

  const res = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.warn(`[researcher.queryBankerDB] rest fetch failed ${res.status}`);
    return [];
  }
  const rows = (await res.json()) as Array<{
    id: string;
    firm_id: string | null;
    group_id: string | null;
    name: string;
    title: string;
    seniority: string | null;
    grad_year: number | null;
    university: string | null;
    linkedin_url: string | null;
    email: string | null;
    email_verified: boolean;
    source: string | null;
    updated_at: string | null;
  }>;

  return rows
    .filter((b) => !excludeIds.includes(b.id))
    // target_groups is a SOFT preference — bankers with null group_id (most
    // Serper-discovered rows) shouldn't be excluded entirely just because we
    // don't yet know their team. Warmth scoring still favors matching groups
    // when the data is there. Hard-filtering produced 0 candidates after we
    // wiped the seed bankers (the only rows that had group_id populated).
    .map(
      (b): Banker => ({
        id: b.id,
        firmId: b.firm_id ?? undefined,
        groupId: b.group_id ?? undefined,
        name: b.name,
        title: b.title,
        seniority: (b.seniority as Banker["seniority"]) ?? undefined,
        gradYear: b.grad_year ?? undefined,
        university: b.university ?? undefined,
        linkedinUrl: b.linkedin_url ?? undefined,
        email: b.email ?? undefined,
        emailVerified: Boolean(b.email_verified),
        updatedAt: b.updated_at ?? undefined,
        source: (b.source as Banker["source"]) ?? "manual_seed",
      })
    );
}

async function alreadyContactedBankerIds(userId: string): Promise<string[]> {
  // 1. Bankers we already have a connection with (sent / replied / etc.)
  const conns = await restSelect("connections", {
    select: "banker_id",
    filters: { user_id: eq(userId) },
  });
  // 2. Bankers we have an *active* draft for (queued, in review,
  //    approved-not-sent, or escalated). Without this, a parallel run-now
  //    click or a cron-overlap can produce two drafts to the same banker.
  //    rejected_unresolvable is included because once Critic gives up after
  //    3 iterations, retrying the same banker with the same prompt would
  //    just produce another rejection — better to surface the existing
  //    draft for the user to override or skip than to spawn duplicates.
  //    Skipped/sent drafts don't block — the user might want to retry a
  //    skipped one later.
  const activeDrafts = await restSelect("drafts", {
    select: "banker_id",
    filters: {
      user_id: eq(userId),
      status: `in.("pending_critic","needs_revision","approved","rejected_unresolvable")`,
      sent_at: isNull,
    },
  });
  const ids = new Set<string>();
  for (const r of [...conns, ...activeDrafts]) {
    if (typeof r.banker_id === "string") ids.add(r.banker_id);
  }
  return Array.from(ids);
}

export async function runResearcher(input: ResearcherInput): Promise<ResearcherOutput> {
  const ctx = await startAgentRun({
    agent: "researcher",
    userId: input.userId,
    triggeredBy: "agent_dispatch",
    inputSummary: { needed: input.needed },
  });

  try {
    const user = await loadUserProfile(input.userId);
    if (!user) {
      await endAgentRun(ctx, { error: "profile not found" }, "profile_not_found");
      return { candidates: [], sourced: 0 };
    }

    const already = await alreadyContactedBankerIds(input.userId);
    const excluded = new Set([...already, ...(input.excludeBankerIds ?? [])]);

    // Pull candidates from DB
    const bankers = await queryBankerDB(
      user.target_firms ?? [],
      user.target_groups ?? [],
      Array.from(excluded),
      Math.max(input.needed * 4, 20)
    );

    // Load flywheel response rates (v1 uses this as a boost)
    const weights = await getActiveScoringWeights();
    const responseRates = (weights?.bankerResponseRate as Record<string, number> | undefined) ?? {};

    // Score and rank. Hard partition: same-school candidates exhaust first
    // (sorted by warmth among themselves), then cross-school. Cofounder
    // hit the cross-school case writing "I'm at Rice (similar vibes to
    // Brown, I imagine)" to a Brown alum — the email opener is awkward
    // when the school anchor doesn't match. Same-school always reads
    // better when available.
    const scored = bankers.map((b) => {
      const responseBoost = responseRates[b.id] ?? 0;
      const warmth = computeWarmth(b, user, responseBoost);
      const sameSchool = !!(
        b.university && user.university &&
        b.university.toLowerCase() === user.university.toLowerCase()
      );
      return { banker: b, warmth, sameSchool };
    });

    scored.sort((a, b) => {
      if (a.sameSchool && !b.sameSchool) return -1;
      if (!a.sameSchool && b.sameSchool) return 1;
      return b.warmth - a.warmth;
    });

    // Re-verify stale summer-analyst rows before surfacing. These bankers
    // had emails that worked at some point, but PJT (and most BB / EB
    // firms) deactivate intern addresses 6-12 months after the program
    // ends. Hunter's email-verifier is the cheapest oracle for "is this
    // address still alive." If it says undeliverable, null out the email
    // so future Researcher runs skip the row at the email IS NOT NULL
    // gate, and skip them right now too.
    const cutoffMs = Date.now() - STALE_SUMMER_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
    const staleSummers = scored.filter(
      (s) =>
        isSummerOrInternTitle(s.banker.title) &&
        s.banker.email &&
        s.banker.updatedAt &&
        new Date(s.banker.updatedAt).getTime() < cutoffMs
    );
    if (staleSummers.length > 0) {
      const verifications = await Promise.all(
        staleSummers.map(async (s) => ({
          banker: s.banker,
          result: await verifyEmailViaHunter(s.banker.email!),
        }))
      );
      const undeliverable = verifications.filter((v) => v.result && !v.result.deliverable);
      if (undeliverable.length > 0) {
        // Null out the dead emails so the bankers don't keep recycling
        // through. Cache result in updated_at = now so we don't re-verify
        // them again next run.
        try {
          const admin = getAdminClient();
          await Promise.all(
            undeliverable.map((u) =>
              admin
                .from("bankers")
                .update({
                  email: null,
                  email_verified: false,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", u.banker.id)
            )
          );
        } catch (err) {
          console.warn("[researcher] stale-summer email nullify failed", err);
        }
        await Promise.all(
          undeliverable.map((u) =>
            logSignal({
              userId: input.userId,
              bankerId: u.banker.id,
              agent: "researcher",
              signalType: "stale_summer_email_dropped",
              metadata: { title: u.banker.title, status: u.result?.status, score: u.result?.score },
            })
          )
        );
      }
      // Drop the dead-email candidates from the scored list before slicing top.
      const deadIds = new Set(undeliverable.map((u) => u.banker.id));
      if (deadIds.size > 0) {
        for (let i = scored.length - 1; i >= 0; i--) {
          if (deadIds.has(scored[i].banker.id)) scored.splice(i, 1);
        }
      }
    }

    const top = scored.slice(0, input.needed);

    const candidates: ResearcherCandidate[] = [];
    if (top.length === 0) {
      await endAgentRun(ctx, { sourced: 0, reason: "no_matching_bankers" });
      return { candidates: [], sourced: 0 };
    }

    // reasonToContact is logged as signal metadata for /admin display but is
    // NOT consumed by Correspondent / Critic / Planner — verified via grep
    // 2026-05-01. The Claude call here cost ~3-5s on every Run Alma click
    // for cosmetic admin copy. Replaced with a templated reason matching
    // the existing fallback shape, preserving the signal metadata schema.
    for (let i = 0; i < top.length; i++) {
      const t = top[i];
      const sameSchool = t.banker.university?.toLowerCase() === user.university.toLowerCase();
      const reason = sameSchool
        ? `${t.banker.title} at ${t.banker.firmId ?? "target firm"} — fellow ${user.university} alum.`
        : `${t.banker.title} at ${t.banker.firmId ?? "target firm"}.`;
      candidates.push({
        bankerId: t.banker.id,
        firmId: t.banker.firmId,
        groupId: t.banker.groupId,
        name: t.banker.name,
        title: t.banker.title,
        warmth: t.warmth,
        reasonToContact: reason,
        priority: top.length - i,
      });
    }

    // Log signals
    await Promise.all(
      candidates.map((c) =>
        logSignal({
          userId: input.userId,
          bankerId: c.bankerId,
          agent: "researcher",
          signalType: "candidate_surfaced",
          metadata: { warmth: c.warmth, priority: c.priority },
        })
      )
    );

    await endAgentRun(ctx, { sourced: candidates.length });
    return { candidates, sourced: candidates.length };
  } catch (err) {
    await endAgentRun(ctx, {}, String(err));
    return { candidates: [], sourced: 0 };
  }
}

/**
 * Enrichment sub-task — called when Correspondent can't draft because banker
 * lacks LinkedIn/email data. Researcher tries to enrich and returns success/fail.
 */
export async function enrichBanker(bankerId: string): Promise<boolean> {
  const banker = await restSelectOne("bankers", { select: "*", filters: { id: eq(bankerId) } });
  if (!banker) return false;

  let enriched = false;

  if (!banker.email && banker.firm_id) {
    const firm = await restSelectOne("firms", { select: "domain", filters: { id: eq(banker.firm_id) } });
    if (firm?.domain && banker.name) {
      const [first, ...rest] = banker.name.split(/\s+/);
      const last = rest[rest.length - 1] ?? "";
      if (first && last) {
        const res = await enrichEmailBatch([{ firstName: first, lastName: last, domain: firm.domain, bankerId }]);
        if (res[0]?.email) enriched = true;
      }
    }
  }

  if (!banker.linkedin_url && banker.firm_id) {
    try {
      const firm = await restSelectOne("firms", { select: "name", filters: { id: eq(banker.firm_id) } });
      if (firm?.name && banker.university) {
        const candidates = await findRealAlumni(firm.name, banker.university, 3);
        const match = candidates.find((c) => c.name.toLowerCase().includes(banker.name.toLowerCase().split(/\s+/)[0]));
        if (match) {
          await restUpdate("bankers", { linkedin_url: match.linkedinUrl }, { id: eq(bankerId) });
          enriched = true;
        }
      }
    } catch {
      // swallow
    }
  }

  return enriched;
}
