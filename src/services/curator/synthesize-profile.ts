// Synthesize banker_profiles rows from existing banker_findings.
//
// Background: Proxycurl shut down, so banker_profiles.about_section +
// recent_posts have been empty across the entire bankers table. Every
// draft routes through Correspondent's "thin-data mode" because the
// data-state heuristic checks profile fields. The Architect's first
// digest flagged this as the upstream root cause of fabrications —
// when the model has no clean banker context, it invents one.
//
// We can't backfill LinkedIn-native data without a paid API, but we
// CAN take the Scout findings we already have (linkedin_post entries,
// authoritative-domain bios, podcast/press mentions) and synthesize a
// clean, fact-grounded about_section + recent_posts list. That gives
// Correspondent a structured banker context block instead of raw
// search snippets, which empirically reduces fabrication.
//
// Cost: ~$0.02 / banker (Sonnet, ~1KB in/out). Cheap enough to run
// across the full table on demand.

import { restSelectOne, restSelect, restUpsert, eq } from "@/lib/supabase-rest";
import { askClaudeJSON } from "@/services/agents/shared";

interface FindingRow {
  source_type: string;
  title: string | null;
  url: string;
  snippet: string | null;
}

interface SynthesisResult {
  bankerId: string;
  status: "synthesized" | "skipped_no_findings" | "skipped_already_has_profile" | "skipped_thin_signal" | "error";
  about?: string | null;
  postsAdded?: number;
  error?: string;
}

// LinkedIn UI noise we strip from post titles before storing.
const LINKEDIN_UI_NOISE = /\b(?:'s Post|View profile for|Report this post|Close menu|Brown University Graphic|Rice University Graphic)\b/gi;

function cleanPostTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  const cleaned = title.replace(LINKEDIN_UI_NOISE, "").replace(/\s+\.{3,}\s*$/, "").trim();
  if (cleaned.length < 20) return null; // too short to be useful as anchor
  return cleaned;
}

export async function synthesizeBankerProfile(bankerId: string, opts?: { force?: boolean }): Promise<SynthesisResult> {
  const banker = await restSelectOne("bankers", {
    select: "id, name, title, university, firm_id",
    filters: { id: eq(bankerId) },
  });
  if (!banker) return { bankerId, status: "error", error: "banker_not_found" };

  // Skip if already has a synthesized profile, unless force=true.
  const existing = await restSelectOne("banker_profiles", {
    select: "banker_id, about_section",
    filters: { banker_id: eq(bankerId) },
  });
  if (existing?.about_section && !opts?.force) {
    return { bankerId, status: "skipped_already_has_profile" };
  }

  let firmName: string | null = null;
  if (banker.firm_id) {
    const firm = await restSelectOne("firms", { select: "name", filters: { id: eq(banker.firm_id) } });
    firmName = firm?.name ?? null;
  }

  const findings = (await restSelect("banker_findings", {
    select: "source_type, title, url, snippet",
    filters: { banker_id: eq(bankerId) },
    limit: 20,
  })) as FindingRow[];

  // Need enough signal to synthesize meaningfully. linkedin_profile alone
  // is just "is this person on LinkedIn"; we need findings with content.
  const usefulFindings = findings.filter(
    (f) => f.source_type !== "linkedin_profile" || (f.snippet && f.snippet.length > 50)
  );
  if (usefulFindings.length < 2) {
    return { bankerId, status: "skipped_thin_signal" };
  }

  // Build recent_posts from linkedin_post findings (deterministic, no LLM).
  const recentPosts = findings
    .filter((f) => f.source_type === "linkedin_post")
    .map((f) => ({ content: cleanPostTitle(f.title), url: f.url }))
    .filter((p): p is { content: string; url: string } => Boolean(p.content))
    .slice(0, 3);

  // LLM-synthesize about_section. Strict grounding rules — only facts
  // present in the snippets, no invention, no career-arc framing. The
  // Critic's "Specificity" axis expects the about_section to ANCHOR
  // claims, not embellish them.
  const prompt = `You're writing a 2-3 sentence factual about-section for an investment banker. A college student will use this as context when writing them a cold email. Only include facts that appear in the WEB FINDINGS below. No prestige claims, no career-arc framing ("transitioned from X to Y"), no invented details. If you cannot verify enough to write 2 grounded sentences, return null.

BANKER:
- Name: ${banker.name}
- Title: ${banker.title ?? "(unknown)"}
- Firm: ${firmName ?? "(unknown)"}
- University: ${banker.university ?? "(unknown)"}

WEB FINDINGS:
${usefulFindings
  .map((f, i) => `[${i + 1}] type=${f.source_type} title="${f.title ?? ""}" url=${f.url}${f.snippet ? ` snippet="${f.snippet.slice(0, 250)}"` : ""}`)
  .join("\n")}

Output the JSON: {"about": string | null}

Length: 2-3 sentences (about-section, ~50-90 words). Should read like a verifiable resume blurb, not a marketing bio.`;

  let about: string | null = null;
  try {
    const result = await askClaudeJSON<{ about: string | null }>(prompt, {
      maxTokens: 256,
      agent: "curator",
    });
    about = typeof result?.about === "string" && result.about.trim().length > 30 ? result.about.trim() : null;
  } catch (err) {
    return { bankerId, status: "error", error: String(err) };
  }

  // Persist. Upsert so re-running with force=true overwrites cleanly.
  await restUpsert(
    "banker_profiles",
    [
      {
        banker_id: bankerId,
        about_section: about,
        recent_posts: recentPosts,
        // Other JSONB columns are NOT NULL with empty-array defaults — set
        // them only if we don't have a previous row to preserve.
        ...(existing ? {} : { education: [], past_positions: [], recent_deals_mentioned: [], volunteering: [], certifications: [], languages: [], interests: [] }),
        scraped_at: new Date().toISOString(),
        scrape_source: "curator_synthesis",
      },
    ],
    { onConflict: "banker_id" }
  );

  return {
    bankerId,
    status: "synthesized",
    about,
    postsAdded: recentPosts.length,
  };
}
