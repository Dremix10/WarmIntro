// Sweep alumni from target firms × {Rice, Brown} via Serper.
// Usage: npx tsx --env-file=.env.local scripts/sweep-alumni.ts [--enrich-emails]
//
// Reads firms from prod Supabase REST; for each firm × school, hits Serper
// for "site:linkedin.com/in <firm> <school>", filters to LinkedIn /in/ URLs,
// classifies title via Claude, dedupes against bankers table, inserts.
//
// Phase 2 (--enrich-emails): for each banker w/o email, calls Hunter.io to
// get an email + verification status. Skipped if HUNTER_API_KEY is missing.

import Anthropic from "@anthropic-ai/sdk";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SERPER_KEY = process.env.SERPER_API_KEY!;
const HUNTER_KEY = process.env.HUNTER_API_KEY ?? "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY || !SERPER_KEY || !ANTHROPIC_KEY) {
  console.error("Missing env. Need: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SERPER_API_KEY, ANTHROPIC_API_KEY.");
  process.exit(1);
}

const SCHOOLS = ["Rice University", "Brown University", "Massachusetts Institute of Technology"];
const RESULTS_PER_FIRM_SCHOOL = 8;
const RATE_LIMIT_DELAY_MS = 1100; // Serper ~1 qps to be safe

const restHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" } as const;

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY });

interface Firm {
  id: string;
  name: string;
  domain: string;
  tier: string;
}

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

interface ExistingBanker {
  linkedin_url: string | null;
}

interface ClassifiedProfile {
  firstName: string;
  lastName: string;
  title: string; // e.g. "Investment Banking Analyst"
  seniority: "analyst" | "associate" | "vp" | "director" | "md" | "intern" | "other";
  group: string | null; // e.g. "TMT", "M&A", "Healthcare"
  gradYear: number | null;
  isInvestmentBanking: boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function loadFirms(): Promise<Firm[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/firms?select=id,name,domain,tier&order=tier.asc`, { headers: restHeaders });
  if (!res.ok) throw new Error(`firms fetch ${res.status}`);
  return (await res.json()) as Firm[];
}

async function loadExistingLinkedInUrls(): Promise<Set<string>> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/bankers?select=linkedin_url&linkedin_url=not.is.null&limit=10000`, { headers: restHeaders });
  if (!res.ok) throw new Error(`bankers fetch ${res.status}`);
  const rows = (await res.json()) as ExistingBanker[];
  return new Set(rows.map((r) => normalizeLinkedInUrl(r.linkedin_url ?? "")).filter(Boolean));
}

function normalizeLinkedInUrl(url: string): string {
  return url.toLowerCase().replace(/\/+$/, "").replace(/\?.*$/, "");
}

async function searchSerper(query: string, num: number): Promise<SerperResult[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num }),
  });
  if (!res.ok) {
    console.warn(`  serper ${res.status} for "${query}"`);
    return [];
  }
  const data = (await res.json()) as { organic?: SerperResult[] };
  return data.organic ?? [];
}

async function classifyBatch(profiles: { name: string; headline: string }[]): Promise<ClassifiedProfile[]> {
  if (profiles.length === 0) return [];
  const prompt = `For each LinkedIn profile, decide if the person is currently in investment banking (or PE/restructuring at an IB) at the firm in question, and extract structured fields.

Return JSON array, one object per input, in the same order. Schema:
{
  "firstName": string,
  "lastName": string,
  "title": string,        // their actual role text e.g. "Investment Banking Analyst" or "Associate, M&A"
  "seniority": "analyst" | "associate" | "vp" | "director" | "md" | "intern" | "other",
  "group": string | null, // coverage or product group if mentioned: "TMT", "Healthcare", "M&A", "LevFin", "Restructuring", etc. null if not mentioned.
  "gradYear": number | null, // graduation year if extractable from headline
  "isInvestmentBanking": boolean // false for PWM, equity research, S&T, ops, internships at non-IB groups
}

Profiles:
${profiles.map((p, i) => `${i}. ${p.name} — ${p.headline}`).join("\n")}

Output: just the JSON array. No prose.`;

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content[0].type === "text" ? res.content[0].text : "";
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("classify: no JSON array");
  return JSON.parse(match[0]) as ClassifiedProfile[];
}

function extractName(title: string): string {
  return title.split(" - ")[0].split(" | ")[0].trim();
}

interface SweepCandidate {
  name: string;
  linkedinUrl: string;
  headline: string;
  university: string;
  firm: Firm;
}

async function sweep(): Promise<{ candidates: SweepCandidate[]; existing: Set<string> }> {
  console.log("→ Loading firms + existing bankers");
  const firms = await loadFirms();
  const existing = await loadExistingLinkedInUrls();
  console.log(`  ${firms.length} firms · ${existing.size} existing bankers`);

  const candidates: SweepCandidate[] = [];
  const seen = new Set<string>(existing);

  for (const firm of firms) {
    for (const school of SCHOOLS) {
      const query = `site:linkedin.com/in "${firm.name}" "${school}"`;
      const results = await searchSerper(query, RESULTS_PER_FIRM_SCHOOL + 2);
      let added = 0;
      for (const r of results) {
        if (!r.link.includes("linkedin.com/in/")) continue;
        const norm = normalizeLinkedInUrl(r.link);
        if (seen.has(norm)) continue;
        seen.add(norm);
        candidates.push({
          name: extractName(r.title),
          linkedinUrl: r.link,
          headline: r.snippet.slice(0, 300),
          university: school,
          firm,
        });
        added++;
        if (added >= RESULTS_PER_FIRM_SCHOOL) break;
      }
      console.log(`  ${firm.name} × ${school.replace(" University", "")}: +${added} candidates`);
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }

  console.log(`\n→ Total new candidates: ${candidates.length}`);
  return { candidates, existing };
}

async function classifyAll(candidates: SweepCandidate[]): Promise<Array<SweepCandidate & ClassifiedProfile>> {
  const out: Array<SweepCandidate & ClassifiedProfile> = [];
  // Batch 5 at a time so Claude calls stay cheap and recoverable
  for (let i = 0; i < candidates.length; i += 5) {
    const batch = candidates.slice(i, i + 5);
    try {
      const classified = await classifyBatch(batch.map((c) => ({ name: c.name, headline: c.headline })));
      for (let j = 0; j < batch.length; j++) {
        if (!classified[j]) continue;
        out.push({ ...batch[j], ...classified[j] });
      }
      console.log(`  classified ${Math.min(i + 5, candidates.length)} / ${candidates.length}`);
    } catch (err) {
      console.warn(`  batch ${i}-${i + 5} failed: ${String(err).slice(0, 100)}`);
    }
  }
  return out;
}

async function insertBankers(rows: Array<SweepCandidate & ClassifiedProfile>): Promise<number> {
  const ibOnly = rows.filter(
    (r) =>
      r.isInvestmentBanking &&
      ["analyst", "associate", "vp", "director", "md"].includes(r.seniority)
  );
  console.log(`\n→ ${ibOnly.length} of ${rows.length} are IB at a target seniority`);

  const payload = ibOnly.map((r) => ({
    firm_id: r.firm.id,
    name: `${r.firstName} ${r.lastName}`.trim() || r.name,
    // bankers.title is NOT NULL. Claude classifier sometimes returns null
    // when the LinkedIn snippet has no title text (often happens for new-
    // grad analysts whose profiles only show school + firm). Fall back to
    // a seniority-derived label so the insert succeeds — Researcher will
    // still display these correctly.
    title: r.title || (r.seniority === "analyst" ? "Investment Banking Analyst"
      : r.seniority === "associate" ? "Investment Banking Associate"
      : r.seniority === "vp" ? "Vice President, Investment Banking"
      : r.seniority === "director" ? "Director, Investment Banking"
      : r.seniority === "md" ? "Managing Director"
      : "Investment Banking"),
    seniority: r.seniority,
    grad_year: r.gradYear,
    university: r.university,
    linkedin_url: r.linkedinUrl,
    email_verified: false,
    source: "serper",
  }));

  if (payload.length === 0) return 0;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/bankers`, {
    method: "POST",
    headers: { ...restHeaders, Prefer: "return=representation,resolution=ignore-duplicates" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`insert bankers ${res.status}: ${txt.slice(0, 300)}`);
  }
  const inserted = (await res.json()) as Array<{ id: string }>;
  return inserted.length;
}

async function enrichEmails(): Promise<{ enriched: number; tried: number }> {
  if (!HUNTER_KEY) {
    console.log("\n→ Skip Hunter enrichment (HUNTER_API_KEY not set)");
    return { enriched: 0, tried: 0 };
  }

  // Get bankers without emails (newest first — likely from this sweep)
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bankers?select=id,name,firm_id&email=is.null&limit=200&order=created_at.desc`,
    { headers: restHeaders }
  );
  const targets = (await res.json()) as Array<{ id: string; name: string; firm_id: string }>;

  // Get firm domains
  const firms = await loadFirms();
  const firmById = new Map(firms.map((f) => [f.id, f]));

  let enriched = 0;
  let tried = 0;
  for (const banker of targets) {
    const firm = firmById.get(banker.firm_id);
    if (!firm?.domain) continue;
    const [first, ...rest] = banker.name.split(" ");
    const last = rest.join(" ");
    if (!first || !last) continue;
    tried++;

    const url = new URL("https://api.hunter.io/v2/email-finder");
    url.searchParams.set("domain", firm.domain);
    url.searchParams.set("first_name", first);
    url.searchParams.set("last_name", last);
    url.searchParams.set("api_key", HUNTER_KEY);

    const hRes = await fetch(url.toString());
    if (!hRes.ok) {
      console.warn(`  hunter ${hRes.status} for ${banker.name} @ ${firm.domain}`);
      continue;
    }
    const data = (await hRes.json()) as { data?: { email: string | null; verification?: { status: string } } };
    const email = data.data?.email;
    if (!email) continue;
    const verified = data.data?.verification?.status === "valid";

    await fetch(`${SUPABASE_URL}/rest/v1/bankers?id=eq.${banker.id}`, {
      method: "PATCH",
      headers: restHeaders,
      body: JSON.stringify({ email, email_verified: verified, updated_at: new Date().toISOString() }),
    });
    enriched++;
    console.log(`  ✓ ${banker.name} → ${email}${verified ? " (verified)" : ""}`);
    await sleep(250); // Hunter is generous, but be polite
  }
  return { enriched, tried };
}

async function main() {
  const enrichOnly = process.argv.includes("--enrich-only");
  const enrichToo = process.argv.includes("--enrich-emails") || enrichOnly;

  if (!enrichOnly) {
    const { candidates } = await sweep();
    if (candidates.length === 0) {
      console.log("No new candidates — sweep complete.");
    } else {
      console.log(`\n→ Classifying ${candidates.length} via Claude`);
      const classified = await classifyAll(candidates);
      const inserted = await insertBankers(classified);
      console.log(`\n✓ Inserted ${inserted} new bankers`);
    }
  }

  if (enrichToo) {
    console.log("\n→ Hunter email enrichment");
    const { enriched, tried } = await enrichEmails();
    console.log(`\n✓ Enriched ${enriched} of ${tried} attempts`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
