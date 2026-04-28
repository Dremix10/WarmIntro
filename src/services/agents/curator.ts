// Curator agent — 24/7 database steward
// Enrichment backfill, freshness, dedup, discovery, quality audit, schema proposals

import { startAgentRun, endAgentRun, logSignal, askClaudeJSON } from "./shared";
import { scrapeBankerLinkedIn, discoverBankersAtFirm } from "@/services/linkedin/proxycurl";
import { enrichEmailBatch } from "@/services/hunter/enrich";
import { FIRM_SEEDS, buildGroupSeeds } from "@/data/seed/firms-groups";
import {
  restSelect,
  restSelectOne,
  restInsert,
  restUpsert,
  restUpdate,
  restDelete,
  restCount,
  eq,
  inList,
  isNull,
  notNull,
  lt,
} from "@/lib/supabase-rest";

export type CuratorMode = "hot" | "daily" | "weekly" | "seed";

export interface CuratorOutput {
  mode: CuratorMode;
  seeded: { firms: number; groups: number };
  enriched: { profiles: number; emails: number };
  discovered: number;
  deduped: number;
  proposalsDrafted: number;
  stalenessRefreshed: number;
}

export async function runCurator(mode: CuratorMode): Promise<CuratorOutput> {
  const ctx = await startAgentRun({
    agent: "curator",
    triggeredBy: "cron",
    inputSummary: { mode },
  });

  const out: CuratorOutput = {
    mode,
    seeded: { firms: 0, groups: 0 },
    enriched: { profiles: 0, emails: 0 },
    discovered: 0,
    deduped: 0,
    proposalsDrafted: 0,
    stalenessRefreshed: 0,
  };

  try {
    if (mode === "seed" || mode === "daily" || mode === "weekly") {
      out.seeded = await seedFirmsAndGroups();
    }
    if (mode === "hot" || mode === "daily") {
      out.enriched = await enrichmentBackfill();
    }
    if (mode === "daily") {
      out.discovered = await discoverNewBankers();
    }
    if (mode === "weekly") {
      out.deduped = await dedupBankers();
      out.stalenessRefreshed = await refreshStaleProfiles();
      out.proposalsDrafted = await generateSchemaProposals();
    }

    await logSignal({
      agent: "curator",
      signalType: `curator_run_${mode}`,
      metadata: out as unknown as Record<string, unknown>,
    });
    await endAgentRun(ctx, out as unknown as Record<string, unknown>);
    return out;
  } catch (err) {
    await endAgentRun(ctx, out as unknown as Record<string, unknown>, String(err));
    return out;
  }
}

// ===== Seeding =====
async function seedFirmsAndGroups(): Promise<{ firms: number; groups: number }> {
  const firmCount = await restCount("firms");
  if (firmCount >= FIRM_SEEDS.length) return { firms: 0, groups: 0 };

  await restUpsert(
    "firms",
    FIRM_SEEDS.map((f) => ({
      id: f.id,
      name: f.name,
      tier: f.tier,
      domain: f.domain,
      hq_city: f.hqCity,
    })),
    { onConflict: "id" }
  );

  const groupSeeds = buildGroupSeeds().map((g) => ({
    id: `${g.firmId}-${g.slug}`,
    firm_id: g.firmId,
    name: g.name,
    kind: g.kind,
  }));
  await restUpsert("groups", groupSeeds, { onConflict: "id" });

  return { firms: FIRM_SEEDS.length, groups: groupSeeds.length };
}

// ===== Enrichment backfill =====
async function enrichmentBackfill(): Promise<{ profiles: number; emails: number }> {
  let profiles = 0;
  let emails = 0;

  const needProfile = await restSelect("bankers", {
    select: "id, linkedin_url",
    filters: { linkedin_url: notNull },
    limit: 20,
  });

  for (const b of needProfile) {
    const existing = await restSelectOne("banker_profiles", {
      select: "banker_id",
      filters: { banker_id: eq(b.id) },
    });
    if (existing) continue;
    if (!b.linkedin_url) continue;
    const scraped = await scrapeBankerLinkedIn(b.linkedin_url, { bankerId: b.id, cacheResult: true });
    if (scraped) profiles++;
  }

  const needEmail = await restSelect("bankers", {
    select: "id, name, firm_id",
    filters: { email: isNull, name: notNull, firm_id: notNull },
    limit: 30,
  });

  if (needEmail.length > 0) {
    const firmIds = Array.from(new Set(needEmail.map((b) => b.firm_id).filter((v): v is string => Boolean(v))));
    const firms = firmIds.length
      ? await restSelect("firms", { select: "id, domain", filters: { id: inList(firmIds) } })
      : [];
    const firmDomains = new Map(firms.map((f) => [f.id, f.domain]));

    const requests = needEmail
      .map((b) => {
        const domain = firmDomains.get(b.firm_id ?? "");
        if (!domain || !b.name) return null;
        const parts = b.name.trim().split(/\s+/);
        if (parts.length < 2) return null;
        return {
          firstName: parts[0],
          lastName: parts[parts.length - 1],
          domain,
          bankerId: b.id,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const results = await enrichEmailBatch(requests);
    emails = results.filter((r) => r?.email).length;
  }

  return { profiles, emails };
}

// ===== Discovery =====
async function discoverNewBankers(): Promise<number> {
  const MIN_PER_FIRM = 5;
  const [firms, bankerCounts] = await Promise.all([
    restSelect("firms", { select: "id, name", limit: 30 }),
    restSelect("bankers", { select: "firm_id" }),
  ]);

  const firmBankerCount: Record<string, number> = {};
  for (const b of bankerCounts) {
    if (b.firm_id) firmBankerCount[b.firm_id] = (firmBankerCount[b.firm_id] ?? 0) + 1;
  }

  const targets: Array<{ firm_id: string; firm_name: string; group_name: string }> = [];
  for (const f of firms) {
    if ((firmBankerCount[f.id] ?? 0) < MIN_PER_FIRM) {
      targets.push({ firm_id: f.id, firm_name: f.name, group_name: "TMT" });
    }
  }
  if (targets.length === 0 && firms.length > 0) {
    for (const f of firms.slice(0, 3)) {
      targets.push({ firm_id: f.id, firm_name: f.name, group_name: "TMT" });
    }
  }

  let count = 0;
  for (const t of targets.slice(0, 2)) {
    // Two firms per tick × ~5 results = ~10 candidates. Source is now
    // serper (proxycurl is shut down). University is left null on
    // discovery; the Curator's enrichment pass or the user-facing
    // researcher matches school based on profile snippets.
    const discovered = await discoverBankersAtFirm(t.firm_name, t.group_name, 5);
    for (const d of discovered) {
      if (!d.name || !d.linkedinUrl) continue;
      await restUpsert(
        "bankers",
        {
          name: d.name,
          title: d.title || "Investment Banking",
          firm_id: t.firm_id,
          linkedin_url: d.linkedinUrl,
          email_verified: false,
          source: "serper",
        },
        { onConflict: "linkedin_url" }
      );
      count++;
    }
  }
  return count;
}

// ===== Dedup =====
async function dedupBankers(): Promise<number> {
  const allBankers = await restSelect("bankers", {
    select: "id, name, firm_id, linkedin_url, created_at, email",
    order: "created_at.asc",
  });
  if (allBankers.length === 0) return 0;

  const duplicates: Array<{ keep_id: string; remove_id: string }> = [];
  const byLinkedin = new Map<string, string>();
  const byNameFirm = new Map<string, string>();

  for (const b of allBankers) {
    if (b.linkedin_url) {
      const seen = byLinkedin.get(b.linkedin_url);
      if (seen) duplicates.push({ keep_id: seen, remove_id: b.id });
      else byLinkedin.set(b.linkedin_url, b.id);
    }
    if (b.name && b.firm_id) {
      const key = `${b.name.toLowerCase()}::${b.firm_id}`;
      const seen = byNameFirm.get(key);
      if (seen && seen !== b.id && !duplicates.some((d) => d.remove_id === b.id || d.keep_id === b.id)) {
        duplicates.push({ keep_id: seen, remove_id: b.id });
      } else {
        byNameFirm.set(key, b.id);
      }
    }
  }

  if (duplicates.length === 0) return 0;

  let merged = 0;
  for (const dup of duplicates) {
    await restUpdate("connections", { banker_id: dup.keep_id }, { banker_id: eq(dup.remove_id) });
    await restUpdate("drafts", { banker_id: dup.keep_id }, { banker_id: eq(dup.remove_id) });
    await restUpdate("signals", { banker_id: dup.keep_id }, { banker_id: eq(dup.remove_id) });
    await restUpdate("banker_deals", { banker_id: dup.keep_id }, { banker_id: eq(dup.remove_id) });
    await restDelete("bankers", { id: eq(dup.remove_id) });
    merged++;
  }
  return merged;
}

// ===== Staleness =====
async function refreshStaleProfiles(): Promise<number> {
  const STALE_DAYS = 60;
  const threshold = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const stale = await restSelect("banker_profiles", {
    select: "banker_id, scraped_at",
    filters: { scraped_at: lt(threshold) },
    limit: 10,
  });

  let count = 0;
  for (const row of stale) {
    const banker = await restSelectOne("bankers", {
      select: "linkedin_url",
      filters: { id: eq(row.banker_id) },
    });
    if (!banker?.linkedin_url) continue;
    const scraped = await scrapeBankerLinkedIn(banker.linkedin_url, { bankerId: row.banker_id, cacheResult: true });
    if (scraped) count++;
  }
  return count;
}

// ===== Schema proposals =====
async function generateSchemaProposals(): Promise<number> {
  try {
    const recentSignalTypes = await restSelect("signals", {
      select: "signal_type",
      order: "occurred_at.desc",
      limit: 200,
    });

    if (recentSignalTypes.length < 20) return 0;

    const typeCount: Record<string, number> = {};
    for (const s of recentSignalTypes) typeCount[s.signal_type] = (typeCount[s.signal_type] ?? 0) + 1;

    const hotTypes = Object.entries(typeCount).filter(([, n]) => n > 30);
    if (hotTypes.length === 0) return 0;

    const prompt = `You are a database curator for an AI recruiting app. Recent signals:
${JSON.stringify(typeCount, null, 2)}

If any signal_type is hot and would benefit from its own column/index for fast querying, propose a minimal DDL change (add column, add index, or normalize to new table).

Return JSON: {"proposals": [{"change_type": "add_column"|"add_table"|"add_index"|"alter_column"|"drop_unused"|"other", "sql": string, "rationale": string}]}

Constraints: Don't propose anything that drops or modifies existing columns. Only additive, reversible changes. Max 2 proposals per run.`;

    const { proposals } = await askClaudeJSON<{ proposals: Array<{ change_type: string; sql: string; rationale: string }> }>(
      prompt,
      { maxTokens: 1024, skipCache: true }
    );

    let drafted = 0;
    for (const p of (proposals ?? []).slice(0, 2)) {
      await restInsert("schema_proposals", {
        change_type: p.change_type,
        sql: p.sql,
        rationale: p.rationale,
        status: "pending",
      });
      drafted++;
    }
    return drafted;
  } catch {
    return 0;
  }
}
