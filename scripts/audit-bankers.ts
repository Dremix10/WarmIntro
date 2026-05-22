// Run the fact-checker across every banker in the DB.
// Output: a per-banker flag list — fields that are missing, suspicious, or
// contradicted by web search. Use this to test for false-positives and
// false-negatives before launching the agent against real users.
//
// Usage: npx tsx --env-file=.env.local scripts/audit-bankers.ts
//        npx tsx --env-file=.env.local scripts/audit-bankers.ts --limit 10

import { auditBanker } from "../src/services/agents/fact-checker";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const restHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } as const;

interface BankerRow {
  id: string;
  name: string;
  title: string | null;
  firm_id: string | null;
  linkedin_url: string | null;
  university: string | null;
}
interface FirmRow { id: string; name: string }

// False-negative regression test: known-bad bankers the auditor MUST flag.
// Run with `--false-negative-test` flag to exercise.
const SYNTHETIC_BAD_BANKERS = [
  {
    id: "fn-test-1",
    name: "Maya Patel",
    title: "Associate",
    firmName: "Evercore",
    linkedinUrl: "https://www.linkedin.com/in/maya-patel-evercore",
    university: "Brown University",
  },
  {
    id: "fn-test-2",
    name: "Alex Chen",
    title: "VP, TMT",
    firmName: "Morgan Stanley",
    linkedinUrl: "https://www.linkedin.com/in/alex-chen-ms-tmt",
    university: "Brown University",
  },
  {
    id: "fn-test-3",
    name: "Zzqxv Made-Up-Person",
    title: "Analyst",
    firmName: "Goldman Sachs",
    linkedinUrl: null,
    university: "Brown University",
  },
];

async function runFalseNegativeTest() {
  console.log("=== FALSE-NEGATIVE TEST ===\n");
  console.log("Auditing 3 known-bad synthetic bankers. Each MUST flag.\n");
  let allFlagged = true;
  for (const b of SYNTHETIC_BAD_BANKERS) {
    process.stdout.write(`  ${b.name}… `);
    const result = await auditBanker(b);
    if (result.flags.length === 0) {
      console.log("MISSED — false negative");
      allFlagged = false;
    } else {
      console.log(`flagged ${result.flags.length}x: ${result.flags.map((f) => f.field).join(", ")}`);
    }
    await new Promise((r) => setTimeout(r, 1100));
  }
  console.log(`\n${allFlagged ? "✓ All synthetic bad rows flagged correctly" : "✗ Some synthetic bad rows slipped through"}`);
  process.exit(allFlagged ? 0 : 1);
}

async function main() {
  if (process.argv.includes("--false-negative-test")) {
    await runFalseNegativeTest();
    return;
  }
  const limitArg = process.argv.indexOf("--limit");
  const limit = limitArg >= 0 ? parseInt(process.argv[limitArg + 1], 10) || 100 : 100;

  console.log(`→ Loading bankers (limit ${limit})…`);
  const bankersRes = await fetch(
    `${SUPABASE_URL}/rest/v1/bankers?select=id,name,title,firm_id,linkedin_url,university&limit=${limit}`,
    { headers: restHeaders }
  );
  const bankers = (await bankersRes.json()) as BankerRow[];
  const firmsRes = await fetch(`${SUPABASE_URL}/rest/v1/firms?select=id,name`, { headers: restHeaders });
  const firms = (await firmsRes.json()) as FirmRow[];
  const firmName = new Map(firms.map((f) => [f.id, f.name]));

  console.log(`→ Auditing ${bankers.length} bankers via Serper search…\n`);

  const allFlags: Array<{ banker: string; field: string; verdict: string; notes: string }> = [];
  let cleanCount = 0;
  let i = 0;
  for (const b of bankers) {
    i++;
    process.stdout.write(`  [${i}/${bankers.length}] ${b.name}… `);
    try {
      const result = await auditBanker({
        id: b.id,
        name: b.name,
        title: b.title,
        firmName: b.firm_id ? firmName.get(b.firm_id) ?? null : null,
        linkedinUrl: b.linkedin_url,
        university: b.university,
      });
      if (result.flags.length === 0) {
        cleanCount++;
        console.log("clean");
      } else {
        console.log(`${result.flags.length} flag(s)`);
        for (const f of result.flags) {
          allFlags.push({ banker: b.name, field: f.field, verdict: f.verdict, notes: f.notes });
        }
      }
    } catch (err) {
      console.log(`ERROR ${String(err).slice(0, 80)}`);
    }
    // Rate-limit Serper at ~1 qps to be nice
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(`\n=== AUDIT SUMMARY ===`);
  console.log(`Clean: ${cleanCount} / ${bankers.length}`);
  console.log(`Flagged: ${bankers.length - cleanCount}`);
  console.log(`Total flags: ${allFlags.length}\n`);

  if (allFlags.length > 0) {
    console.log("=== FLAGS ===");
    const byVerdict: Record<string, number> = {};
    for (const f of allFlags) byVerdict[f.verdict] = (byVerdict[f.verdict] ?? 0) + 1;
    console.log("By verdict:", byVerdict);
    console.log("\nDetails (first 20):");
    for (const f of allFlags.slice(0, 20)) {
      console.log(`  • ${f.banker} — ${f.field} [${f.verdict}]: ${f.notes}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
