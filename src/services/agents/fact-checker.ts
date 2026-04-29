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

const EXTRACT_SYSTEM = `You read a cold-outreach email a student is about to send to an investment banker. Identify every SPECIFIC verifiable claim about the banker.

A claim qualifies ONLY if you can write a SUBSTANTIVE web search query that would corroborate it. If the most precise query you can write is something like "did <banker> go to Rice" or "is <banker> at Morgan Stanley", that's a weak claim — it references background we already have, not a specific event. Drop it.

A strong claim names a specific deal, post, transition with both endpoints, dated event, publication, or program. The verification query for a strong claim contains at least two distinct named entities (deal name, year, firm, publication, deal value, etc.) beyond the banker's own name.

For each claim you keep, you MUST write the EXACT Serper search query you'd run to verify it — the query a careful human would Google. The query is what gates the claim.

DROP (do not extract):
- Generic background: firm, title, school overlap, graduation timeline ("after Rice", "fellow Owl", "since college")
- The student's own background
- Vague descriptors of the banker's work without a named specific ("your tech work", "your industry experience")
- Any claim where the best verification query you can construct contains only the banker's name + a single common-knowledge token

KEEP:
- Named deal: "your team advised on the Stripe IPO" → query: "Christian Saldana Morgan Stanley Stripe IPO"
- Specific post or quote: "your post about AI M&A consolidation" → query: "Christian Saldana LinkedIn AI M&A consolidation 2025"
- Dated transition: "your move from Goldman to Evercore in 2022" → query: "Christian Saldana Goldman Sachs Evercore 2022"
- Specific program/award: "your CFA Level III pass last year" → query: "Christian Saldana CFA Level III 2025"

Return JSON: { "claims": [ { "text": "<verbatim from the email>", "type": "deal|post|role|school_activity|career_move|other", "verificationQuery": "<exact Google query a human would type>" } ] }
If no specific claims meet the bar, return { "claims": [] } — that's the correct answer for an email with no fact-laden specifics.`;

interface ExtractedClaim {
  text: string;
  type: ClaimCheck["type"];
  verificationQuery: string;
}

// Throws if Claude refuses or returns malformed JSON. Critic catches that
// and routes the draft to needs_revision — a silent empty-array return would
// have let unfact-checked drafts pass under the false guise of "no specific
// claims," which is the worst possible failure mode.
async function extractClaims(
  emailBody: string,
  banker: BankerForFactCheck
): Promise<ExtractedClaim[]> {
  const res = await askClaudeJSON<{ claims: ExtractedClaim[] }>(
    `Email:\n${emailBody}\n\nBanker known facts (do NOT extract these as claims):\n- name: ${banker.name}\n- title: ${banker.title ?? "?"}\n- firm: ${banker.firmName ?? "?"}\n- university: ${banker.university ?? "?"}\n\nReturn only the JSON object.`,
    { systemPrompt: EXTRACT_SYSTEM, maxTokens: 900, skipCache: true }
  );
  if (!res || !Array.isArray(res.claims)) {
    throw new Error("fact_check_extract_invalid_shape");
  }

  // Code-side filter: drop claims whose verificationQuery doesn't pass the
  // bar the prompt set. The model is supposed to self-police but we don't
  // trust it blindly — this is the safety net for "after Rice"-style
  // weak-claim leaks.
  const knownTokens = new Set(
    [banker.name, banker.title, banker.firmName, banker.university]
      .filter((v): v is string => Boolean(v))
      .flatMap((v) => v.toLowerCase().split(/\s+/))
      .filter((w) => w.length > 2)
  );

  return res.claims.filter((c) => {
    if (!c.text || !c.verificationQuery || typeof c.verificationQuery !== "string") return false;
    const q = c.verificationQuery.trim();
    const tokens = q.split(/\s+/);
    if (tokens.length < 4) return false;
    // Count "novel" tokens — anything not part of the banker's known facts.
    const novel = tokens
      .map((t) => t.toLowerCase().replace(/[^\w]/g, ""))
      .filter((t) => t.length >= 2 && !knownTokens.has(t) && !STOP_WORDS.has(t));
    // Require at least 2 distinct novel tokens. A query that's just
    // "<banker name> <firm name> + filler" doesn't pass — it's testing
    // background, not a specific claim.
    const distinctNovel = new Set(novel);
    return distinctNovel.size >= 2;
  });
}

// Stop-words excluded from "meaningful" word count + n-gram matching to
// prevent generic phrases like "your team advised on the" from trivially
// matching any banker's M&A page.
const STOP_WORDS = new Set([
  "the", "and", "for", "you", "your", "with", "from", "that", "this", "have",
  "has", "had", "was", "were", "are", "been", "being", "their", "they", "them",
  "our", "out", "about", "over", "under", "into", "than", "then", "when",
  "where", "which", "what", "who", "how", "why", "but", "any", "all", "some",
  "team", "work", "role", "year", "years", "time", "made", "make", "doing",
]);

function meaningfulWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

function extractNamedEntities(claim: string): string[] {
  // Heuristic: capitalized words 2+ letters (deal codenames, firm names),
  // dollar amounts, year references. The presence of one of these in the
  // haystack is a stronger signal than common-word n-grams.
  const out: string[] = [];
  const proper = claim.match(/\b[A-Z][a-zA-Z]{1,}\b/g) ?? [];
  for (const p of proper) if (p.length > 2) out.push(p.toLowerCase());
  const money = claim.match(/\$\s?\d+(?:[.,]\d+)?\s?(?:[BM]|billion|million)?/gi) ?? [];
  for (const m of money) out.push(m.toLowerCase().replace(/\s/g, ""));
  const years = claim.match(/\b(19|20)\d{2}\b/g) ?? [];
  for (const y of years) out.push(y);
  return [...new Set(out)];
}

function snippetMatchesClaim(claim: string, snippets: string[]): boolean {
  // A claim is "verified" only if BOTH:
  //   1. A 6+ consecutive meaningful-word phrase (stop-words excluded) appears
  //      in the haystack, OR a named entity from the claim appears verbatim.
  //   2. At least one named-entity token from the claim is present in the
  //      haystack — this stops "your team advised on a recent transaction"
  //      from matching every banker's profile.
  // If the claim has no named entities (rare; the entire claim is generic),
  // we require a longer 8-word phrase match to compensate.
  const haystack = snippets.join(" ").toLowerCase();
  const words = meaningfulWords(claim);
  const entities = extractNamedEntities(claim);

  let phraseMatch = false;
  const phraseLen = entities.length > 0 ? 6 : 8;
  for (let i = 0; i + phraseLen <= words.length; i++) {
    const phrase = words.slice(i, i + phraseLen).join(" ");
    if (haystack.includes(phrase)) { phraseMatch = true; break; }
  }

  let entityMatch = entities.length === 0; // no entities → skip this gate
  for (const e of entities) {
    if (haystack.includes(e)) { entityMatch = true; break; }
  }

  return phraseMatch && entityMatch;
}

// Claims like "you're now a Director at Evercore" are structural — they
// assert (title, firm) about the banker. We can verify them more reliably by
// checking our stored DB tokens against Serper directly, bypassing the
// brittle "verbatim phrase appears in snippet" matching. Returns null if the
// claim isn't a clean structural assertion. The DB is NEVER the sole source
// — Serper still has to corroborate name + title + firm together. So a wrong
// DB value can't smuggle a fake claim through.
async function verifyStructuralRoleClaim(
  claim: string,
  banker: BankerForFactCheck
): Promise<ClaimCheck | null> {
  if (!banker.title || !banker.firmName) return null;

  const claimLower = claim.toLowerCase();
  const firmLower = banker.firmName.toLowerCase();

  // Title strings often look like "Director at Evercore" or "Managing
  // Director" or "VP". Strip any " at <firm>" suffix, then take the role
  // tokens (lowered minimum to 2 chars so "VP" / "MD" survive). This is the
  // role keyword we'll search for, distinct from the firm.
  const roleStringRaw = banker.title.toLowerCase().replace(/\s+at\s+.+$/, "").trim();
  const roleTokens = roleStringRaw
    .replace(/[^a-z\s&]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
  if (roleTokens.length === 0) return null;

  // Claim must reference the role AND the firm to qualify as structural.
  // "you're a Director at Evercore" → role=director, firm=evercore → match.
  // "your team's TMT work" → no role/firm tokens → null, fall through.
  const roleInClaim = roleTokens.some((t) => claimLower.includes(t));
  const firmInClaim = claimLower.includes(firmLower);
  if (!roleInClaim || !firmInClaim) return null;

  // Serper still gates the verdict — this is what prevents a stale DB from
  // smuggling a fake claim through. Search for name + role + firm; verify
  // only if all three tokens appear in any returned snippet/title together.
  const primaryRole = roleTokens.join(" ");
  const q = `"${banker.name}" "${primaryRole}" "${banker.firmName}"`;
  const results = await serperSearch(q, 5);
  const haystack = results.map((r) => `${r.title} ${r.snippet}`).join(" ").toLowerCase();
  const evidenceUrls = results.map((r) => r.link);

  const nameInResults = haystack.includes(banker.name.toLowerCase());
  const roleInResults = roleTokens.some((t) => haystack.includes(t));
  const firmInResults = haystack.includes(firmLower);

  if (nameInResults && roleInResults && firmInResults) {
    return {
      claim,
      type: "role",
      verdict: "verified",
      evidenceUrls: [...new Set(evidenceUrls)].slice(0, 3),
      notes: `Web search corroborates ${banker.title} at ${banker.firmName} for ${banker.name}.`,
    };
  }
  // DB has the title but Serper can't corroborate — could be stale DB or
  // the wrong banker matched. Do NOT verify. The user sees this as a real
  // miss in the UI and either edits or overrides knowingly.
  return {
    claim,
    type: "role",
    verdict: "unverifiable",
    evidenceUrls: [...new Set(evidenceUrls)].slice(0, 3),
    notes: `Internal DB has ${banker.title} at ${banker.firmName} but web search couldn't corroborate name + role + firm together.`,
  };
}

async function verifyClaim(
  claim: string,
  banker: BankerForFactCheck,
  verificationQuery: string
): Promise<ClaimCheck> {
  // Try structural matching first (title/firm assertions). Falls through to
  // generic phrase-matching if the claim isn't structural.
  const structural = await verifyStructuralRoleClaim(claim, banker);
  if (structural) return structural;

  // Use the LLM-supplied verification query as the primary search — that's
  // the query the model already justified writing. Fall back to name+claim
  // and LinkedIn-scoped only if the primary returns nothing useful.
  const queries: string[] = [verificationQuery];
  queries.push(`"${banker.name}" ${claim.slice(0, 80)}`);
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
  const claims = await extractClaims(emailBody, banker);
  if (claims.length === 0) {
    return { ok: true, checks: [] };
  }
  const checks: ClaimCheck[] = [];
  for (const c of claims) {
    const verdict = await verifyClaim(c.text, banker, c.verificationQuery);
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
