// Hunter.io email enrichment
// Gracefully degrades to null when HUNTER_API_KEY is absent.

import { getAdminClient } from "@/lib/supabase-admin";

interface HunterFinderResponse {
  data?: {
    email: string | null;
    score: number;
    verification?: { status: string };
    pattern?: string;
  };
}

let warnedMissingKey = false;

function warnMissingKey(): void {
  if (warnedMissingKey) return;
  console.warn("[hunter] HUNTER_API_KEY not set — email enrichment disabled, returning null");
  warnedMissingKey = true;
}

export interface EnrichedEmail {
  email: string;
  confidence: number; // 0–1
  source: "hunter" | "cache" | "pattern_guess";
  pattern?: string;
  verified: boolean;
}

/**
 * Find a banker's email by name + company domain.
 * Caches in Supabase `bankers` table (if bankerId provided).
 * Returns null if Hunter API key missing or no result found.
 */
export async function enrichEmailViaHunter(
  firstName: string,
  lastName: string,
  domain: string,
  opts: { bankerId?: string; cacheResult?: boolean } = {}
): Promise<EnrichedEmail | null> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    warnMissingKey();
    return null;
  }

  try {
    const url = new URL("https://api.hunter.io/v2/email-finder");
    url.searchParams.set("domain", domain);
    url.searchParams.set("first_name", firstName);
    url.searchParams.set("last_name", lastName);
    url.searchParams.set("api_key", apiKey);

    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      console.warn(`[hunter] find failed ${res.status} for ${firstName} ${lastName} @ ${domain}`);
      return null;
    }

    const json = (await res.json()) as HunterFinderResponse;
    const email = json.data?.email;
    if (!email) return null;

    const result: EnrichedEmail = {
      email,
      confidence: (json.data?.score ?? 0) / 100,
      source: "hunter",
      pattern: json.data?.pattern,
      verified: json.data?.verification?.status === "valid",
    };

    if (opts.cacheResult && opts.bankerId) {
      try {
        const admin = getAdminClient();
        await admin
          .from("bankers")
          .update({ email: result.email, email_verified: result.verified, source: "hunter", updated_at: new Date().toISOString() })
          .eq("id", opts.bankerId);
      } catch (err) {
        console.warn("[hunter] cache write failed", err);
      }
    }
    return result;
  } catch (err) {
    console.warn("[hunter] network error", err);
    return null;
  }
}

interface HunterVerifierResponse {
  data?: {
    status?: "valid" | "invalid" | "accept_all" | "webmail" | "disposable" | "unknown";
    result?: "deliverable" | "undeliverable" | "risky" | "unknown";
    score?: number;
  };
}

export interface VerifyResult {
  deliverable: boolean;
  status: string; // hunter's raw status
  score: number; // 0..100
}

/**
 * Verify an existing email address via Hunter's /email-verifier endpoint.
 * Returns null when Hunter is not configured or the request fails — caller
 * should treat null as "couldn't determine, leave the banker alone."
 *
 * Costs one verification credit per call. Use sparingly — only for stale
 * banker rows we suspect have moved on (e.g. expired summer-analyst
 * addresses), not for every Researcher run.
 */
export async function verifyEmailViaHunter(email: string): Promise<VerifyResult | null> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    warnMissingKey();
    return null;
  }
  try {
    const url = new URL("https://api.hunter.io/v2/email-verifier");
    url.searchParams.set("email", email);
    url.searchParams.set("api_key", apiKey);
    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) {
      console.warn(`[hunter] verify failed ${res.status} for ${email}`);
      return null;
    }
    const json = (await res.json()) as HunterVerifierResponse;
    const status = json.data?.status ?? "unknown";
    const result = json.data?.result ?? "unknown";
    const score = json.data?.score ?? 0;
    return {
      // Treat 'risky' and 'undeliverable' as not-deliverable. 'accept_all'
      // is ambiguous (server accepts everything) — we accept it to avoid
      // false negatives but mark score-based.
      deliverable: result === "deliverable" || (status === "accept_all" && score >= 50),
      status: `${status}:${result}`,
      score,
    };
  } catch (err) {
    console.warn("[hunter] verify network error", err);
    return null;
  }
}

/**
 * Batch enrich — parallelizes up to 5 at a time to respect rate limits.
 */
export async function enrichEmailBatch(
  requests: Array<{ firstName: string; lastName: string; domain: string; bankerId?: string }>
): Promise<Array<EnrichedEmail | null>> {
  const CONCURRENCY = 5;
  const results: Array<EnrichedEmail | null> = new Array(requests.length).fill(null);
  for (let i = 0; i < requests.length; i += CONCURRENCY) {
    const batch = requests.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((r) => enrichEmailViaHunter(r.firstName, r.lastName, r.domain, { bankerId: r.bankerId, cacheResult: true }))
    );
    for (let j = 0; j < batchResults.length; j++) {
      results[i + j] = batchResults[j];
    }
  }
  return results;
}
