// scripts/backfill-scout.ts — one-shot Scout refresh for bankers
// whose banker_findings cache is empty.
//
// Why: tonight's Scout relaxation (df06b51 + the FINRA/RocketReach
// addition) accepts URL classes the old gates rejected (LinkedIn /in/
// profile pages, .edu alumni mentions, FINRA broker registrations,
// RocketReach bios). The 0-findings rows in the DB are all from runs
// before the relaxation. Re-scouting once now bootstraps the cache so
// the next batch of drafts has real anchors to use.
//
// Usage:
//   tsx scripts/backfill-scout.ts            # refresh recent drafts
//   tsx scripts/backfill-scout.ts --all      # refresh every banker
//
// Requires .env.local with NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, and SERPER_API_KEY.

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
// scout.ts reads process.env at function-call time (not import time),
// so static imports after loadEnvConfig are fine.
import { createClient } from "@supabase/supabase-js";
import { scoutBankerFindings } from "../src/services/agents/scout";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const all = process.argv.includes("--all");

  // Pull bankers we care about. Default: bankers we've drafted to in last
  // 7 days (the cohort that needs anchors right now). --all: every banker.
  let bankerIds: string[] = [];
  if (all) {
    const { data } = await admin
      .from("bankers")
      .select("id")
      .not("linkedin_url", "is", null);
    bankerIds = (data ?? []).map((b) => b.id as string);
  } else {
    const { data } = await admin
      .from("drafts")
      .select("banker_id")
      .not("banker_id", "is", null)
      .gt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    bankerIds = Array.from(new Set((data ?? []).map((d) => d.banker_id as string)));
  }

  if (bankerIds.length === 0) {
    console.log("No bankers to refresh.");
    return;
  }

  // Hydrate banker rows with the fields Scout needs.
  const { data: bankers } = await admin
    .from("bankers")
    .select("id, name, linkedin_url, firm_id")
    .in("id", bankerIds);
  const firms = await admin.from("firms").select("id, name");
  const firmNameById = new Map<string, string>();
  for (const f of firms.data ?? []) firmNameById.set(f.id as string, f.name as string);

  console.log(`Refreshing Scout for ${bankers?.length ?? 0} bankers (forceRefresh=true)…`);

  let succeeded = 0;
  let totalFindings = 0;
  for (const b of bankers ?? []) {
    const id = b.id as string;
    const name = b.name as string;
    const linkedinUrl = (b.linkedin_url as string | null) ?? undefined;
    const firmName = firmNameById.get((b.firm_id as string) ?? "") ?? null;

    process.stdout.write(`  • ${name.padEnd(28)} `);
    try {
      const findings = await scoutBankerFindings({
        bankerId: id,
        bankerName: name,
        firmName,
        linkedinUrl,
        forceRefresh: true,
      });
      console.log(`→ ${findings.length} findings`);
      succeeded++;
      totalFindings += findings.length;
      // Be polite to Serper — 6 queries per scout × N bankers, sequential.
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      console.log(`→ FAIL: ${String(err).slice(0, 100)}`);
    }
  }

  console.log("");
  console.log(`Done. ${succeeded}/${bankers?.length} bankers refreshed, ${totalFindings} total findings cached.`);
}

main().catch((err) => {
  console.error("backfill failed", err);
  process.exit(1);
});
