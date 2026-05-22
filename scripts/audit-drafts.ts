// Run the fact-checker over every pending/sent draft in the DB and report
// per-draft verdicts. Use to test for false positives + false negatives on
// real Correspondent output.

import { factCheckDraft } from "../src/services/agents/fact-checker";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE env");
  process.exit(1);
}

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } as const;

interface DraftRow {
  id: string;
  banker_id: string;
  type: string;
  subject: string | null;
  body: string;
  status: string;
}
interface BankerRow {
  id: string;
  name: string;
  title: string | null;
  firm_id: string | null;
  linkedin_url: string | null;
  university: string | null;
}
interface FirmRow { id: string; name: string }

async function main() {
  // Pull all drafts that aren't skipped/rejected — anything the agent
  // produced and the user might see.
  const draftsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/drafts?select=id,banker_id,type,subject,body,status&status=in.(pending_critic,needs_revision,approved,sent)&type=in.(cold,followup)&limit=200`,
    { headers }
  );
  const drafts = (await draftsRes.json()) as DraftRow[];

  if (drafts.length === 0) {
    console.log("No drafts to audit.");
    return;
  }

  // Pre-fetch bankers + firms
  const bankerIds = [...new Set(drafts.map((d) => d.banker_id).filter(Boolean))];
  const bankersRes = await fetch(
    `${SUPABASE_URL}/rest/v1/bankers?select=id,name,title,firm_id,linkedin_url,university&id=in.(${bankerIds.join(",")})`,
    { headers }
  );
  const bankers = (await bankersRes.json()) as BankerRow[];
  const bankerById = new Map(bankers.map((b) => [b.id, b]));

  const firmsRes = await fetch(`${SUPABASE_URL}/rest/v1/firms?select=id,name`, { headers });
  const firms = (await firmsRes.json()) as FirmRow[];
  const firmName = new Map(firms.map((f) => [f.id, f.name]));

  console.log(`→ Auditing ${drafts.length} drafts via fact-checker…\n`);

  let cleanCount = 0;
  let totalClaims = 0;
  let totalUnverified = 0;
  const flagged: Array<{ draft: string; claim: string; verdict: string; notes: string }> = [];

  for (const d of drafts) {
    const banker = bankerById.get(d.banker_id);
    if (!banker) {
      console.log(`  [skip] draft ${d.id.slice(0, 8)} — banker not found`);
      continue;
    }
    process.stdout.write(`  ${banker.name} (${d.type}, ${d.status})… `);
    const result = await factCheckDraft(d.body, {
      name: banker.name,
      title: banker.title,
      firmName: banker.firm_id ? firmName.get(banker.firm_id) ?? null : null,
      linkedinUrl: banker.linkedin_url,
      university: banker.university,
    });
    totalClaims += result.checks.length;
    const unverified = result.checks.filter((c) => c.verdict !== "verified");
    totalUnverified += unverified.length;
    if (result.checks.length === 0) {
      cleanCount++;
      console.log("no specific claims (clean)");
    } else if (unverified.length === 0) {
      cleanCount++;
      console.log(`${result.checks.length} claim(s), all verified`);
    } else {
      console.log(`${result.checks.length} claim(s), ${unverified.length} unverified`);
      for (const c of unverified) {
        flagged.push({ draft: `${banker.name}/${d.id.slice(0, 8)}`, claim: c.claim, verdict: c.verdict, notes: c.notes });
      }
    }
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(`\n=== AUDIT SUMMARY ===`);
  console.log(`Drafts audited: ${drafts.length}`);
  console.log(`Clean (no unverified claims): ${cleanCount}`);
  console.log(`Total specific claims found: ${totalClaims}`);
  console.log(`Unverified claims: ${totalUnverified}`);
  console.log("");
  if (flagged.length > 0) {
    console.log("=== FLAGGED CLAIMS ===");
    for (const f of flagged.slice(0, 20)) {
      console.log(`  • ${f.draft}: "${f.claim.slice(0, 80)}"`);
      console.log(`    [${f.verdict}] ${f.notes}`);
    }
    if (flagged.length > 20) console.log(`  ...and ${flagged.length - 20} more`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
