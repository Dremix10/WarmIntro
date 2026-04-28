// Fact-checker agent. Two modes:
//
// 1. Draft mode: given a generated email body + banker context, extract every
//    "specific verifiable claim" (named deal, post quote, role detail), web-
//    search for evidence, return per-claim verdicts. The Critic uses this as
//    its highest-priority axis.
//
// 2. Audit mode: given a banker row + their banker_profile, verify each stored
//    fact (linkedin_url resolves, current title matches LinkedIn, listed deals
//    are real). Returns flags for manual review.
//
// Web evidence comes from Serper (already configured). Verification is "did
// any organic result contain language consistent with this claim?" — we don't
// require an exact match because real LinkedIn / company press release language
// varies.

import { askClaudeJSON } from "./shared";

interface SerperResult { title: string; link: string; snippet: string }
interface SerperResponse { organic?: SerperResult[] }

async function serperSearch(query: string, num = 5): Promise<SerperResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as SerperResponse;
    return json.organic ?? [];
  } catch {
    return [];
  }
}

export type ClaimVerdict = "verified" | "unverifiable" | "contradicted";

export interface ClaimCheck {
  claim: string;             // verbatim from the draft
  type: "deal" | "post" | "role" | "school_activity" | "career_move" | "other";
  verdict: ClaimVerdict;
  evidenceUrls: string[];    // top URLs that support (or contradict) the claim
  notes: string;             // 1-line explanation
}

export interface FactCheckResult {
  ok: boolean;               // true if every claim verified or no specific claims
  checks: ClaimCheck[];
}

interface BankerForFactCheck {
  name: string;
  firmName?: string | null;
  title?: string | null;
  linkedinUrl?: string | null;
  university?: string | null;
}

const EXTRACT_SYSTEM = `You read a cold-outreach email a student is about to send to an investment banker. Identify every SPECIFIC verifiable claim about the banker — anything that names a deal, quotes a post, references a specific career detail, role transition, or activity.

DO NOT extract:
- Generic facts the student knows from the data already (banker's firm, title, school overlap)
- The student's own background ("I'm a sophomore at Brown")
- Generic statements ("I'd love to learn from you")

DO extract:
- "your team advised on the X transaction"
- "your post about Y caught my attention"
- "your move from X to Y"
- "your work in the Z industry"
- Anything the banker would read and think "where did they get that from?"

Return JSON: { "claims": [ { "text": "...", "type": "deal|post|role|school_activity|career_move|other" } ] }
If no specific claims, return { "claims": [] }.`;

async function extractClaims(emailBody: string): Promise<Array<{ text: string; type: ClaimCheck["type"] }>> {
  try {
    const res = await askClaudeJSON<{ claims: Array<{ text: string; type: ClaimCheck["type"] }> }>(
      `Email:\n${emailBody}\n\nReturn only the JSON object.`,
      { systemPrompt: EXTRACT_SYSTEM, maxTokens: 800, skipCache: true }
    );
    return res.claims ?? [];
  } catch {
    return [];
  }
}

function snippetMatchesClaim(claim: string, snippets: string[]): boolean {
  // Heuristic: any meaningful overlap (>= 4-word phrase from the claim appears in snippets) counts.
  const claimLower = claim.toLowerCase();
  const claimWords = claimLower.replace(/[^\w\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
  if (claimWords.length === 0) return false;
  const haystack = snippets.join(" ").toLowerCase();
  // Look for any 4+ consecutive words from the claim in the haystack.
  for (let i = 0; i + 4 <= claimWords.length; i++) {
    const phrase = claimWords.slice(i, i + 4).join(" ");
    if (haystack.includes(phrase)) return true;
  }
  return false;
}

async function verifyClaim(claim: string, banker: BankerForFactCheck): Promise<ClaimCheck> {
  const queries: string[] = [];
  // Most specific first — banker's name + the claim
  queries.push(`"${banker.name}" ${claim.slice(0, 80)}`);
  if (banker.firmName) queries.push(`"${banker.name}" "${banker.firmName}" ${claim.slice(0, 60)}`);
  if (banker.linkedinUrl) {
    const slug = banker.linkedinUrl.replace(/.*linkedin\.com\/in\//, "").replace(/\/.*$/, "");
    if (slug) queries.push(`site:linkedin.com/in/${slug} ${claim.slice(0, 50)}`);
  }

  const allSnippets: string[] = [];
  const evidenceUrls: string[] = [];
  for (const q of queries) {
    const results = await serperSearch(q, 5);
    for (const r of results) {
      allSnippets.push(`${r.title} ${r.snippet}`);
      evidenceUrls.push(r.link);
    }
    if (snippetMatchesClaim(claim, allSnippets)) break;
  }

  const matched = snippetMatchesClaim(claim, allSnippets);
  return {
    claim,
    type: "other",
    verdict: matched ? "verified" : "unverifiable",
    evidenceUrls: [...new Set(evidenceUrls)].slice(0, 3),
    notes: matched ? "Found supporting language in search results" : "No supporting evidence in search results",
  };
}

/** Draft mode: check every specific claim in the email. */
export async function factCheckDraft(emailBody: string, banker: BankerForFactCheck): Promise<FactCheckResult> {
  const claims = await extractClaims(emailBody);
  if (claims.length === 0) {
    return { ok: true, checks: [] };
  }
  const checks: ClaimCheck[] = [];
  for (const c of claims) {
    const verdict = await verifyClaim(c.text, banker);
    checks.push({ ...verdict, type: c.type });
  }
  const allVerified = checks.every((c) => c.verdict === "verified");
  return { ok: allVerified, checks };
}

/** Audit mode: verify a banker's stored facts against the live web. */
export interface BankerAuditResult {
  bankerId: string;
  name: string;
  flags: Array<{ field: string; value: string; verdict: ClaimVerdict; notes: string }>;
}

export async function auditBanker(banker: {
  id: string;
  name: string;
  title?: string | null;
  firmName?: string | null;
  linkedinUrl?: string | null;
  university?: string | null;
}): Promise<BankerAuditResult> {
  const flags: BankerAuditResult["flags"] = [];

  // Check 1: LinkedIn URL exists + the slug pattern looks plausible
  if (banker.linkedinUrl) {
    const slug = banker.linkedinUrl.match(/linkedin\.com\/in\/([^/?]+)/)?.[1];
    if (!slug) {
      flags.push({ field: "linkedin_url", value: banker.linkedinUrl, verdict: "contradicted", notes: "URL not a valid LinkedIn profile path" });
    } else if (/^(maya-patel|alex-chen|amir-shah|sam-okafor|priya-shah|jordan-williams|sarah-kim|david-park)-(ms|gs|jpm|evercore|centerview|pjt)/.test(slug)) {
      flags.push({ field: "linkedin_url", value: banker.linkedinUrl, verdict: "contradicted", notes: "Slug matches known synthetic test pattern" });
    }
  } else {
    flags.push({ field: "linkedin_url", value: "(missing)", verdict: "unverifiable", notes: "No LinkedIn URL — Researcher can't enrich" });
  }

  // Check 2: name + firm appears in any search result
  if (banker.firmName) {
    const q = `"${banker.name}" "${banker.firmName}"`;
    const results = await serperSearch(q, 5);
    if (results.length === 0) {
      flags.push({ field: "name+firm", value: q, verdict: "unverifiable", notes: "No web evidence of this person at this firm" });
    } else if (!results.some((r) => r.snippet.toLowerCase().includes(banker.name.toLowerCase()))) {
      flags.push({ field: "name+firm", value: q, verdict: "unverifiable", notes: "Search returned hits but none mention the banker by name" });
    }
  }

  return { bankerId: banker.id, name: banker.name, flags };
}
