// Proxycurl LinkedIn profile scraping
// Structured banker profile data: education, past positions, about, recent posts,
// recent deals mentioned, volunteering, skills, interests.
// Gracefully degrades when PROXYCURL_API_KEY absent.

import { getAdminClient } from "@/lib/supabase-admin";
import type { BankerProfile } from "@/shared/ib-types";

let warnedMissingKey = false;
function warnMissingKey() {
  if (warnedMissingKey) return;
  console.warn("[proxycurl] PROXYCURL_API_KEY not set — LinkedIn profile scraping disabled");
  warnedMissingKey = true;
}

interface ProxycurlProfileResponse {
  full_name?: string;
  headline?: string;
  summary?: string;
  education?: Array<{ school?: string; degree_name?: string; starts_at?: { year?: number }; ends_at?: { year?: number }; activities_and_societies?: string }>;
  experiences?: Array<{ company?: string; title?: string; starts_at?: { year?: number; month?: number }; ends_at?: { year?: number; month?: number } | null; description?: string }>;
  volunteer_work?: Array<{ title?: string; company?: string; description?: string }>;
  languages?: string[];
  certifications?: Array<{ name?: string; authority?: string }>;
  interests?: string[];
  activities?: Array<{ activity?: string; link?: string }>;
  // recent posts is fetched via a separate endpoint
}

interface ProxycurlPostsResponse {
  activities?: Array<{ title?: string; link?: string; activity_status?: string; engagement?: number }>;
}

export async function scrapeBankerLinkedIn(
  linkedinUrl: string,
  opts: { bankerId?: string; cacheResult?: boolean } = {}
): Promise<BankerProfile | null> {
  const apiKey = process.env.PROXYCURL_API_KEY;
  if (!apiKey) {
    warnMissingKey();
    return null;
  }

  try {
    const profileRes = await fetch(
      `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}&fallback_to_cache=on-error&use_cache=if-present`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!profileRes.ok) {
      console.warn(`[proxycurl] profile fetch failed ${profileRes.status} for ${linkedinUrl}`);
      return null;
    }
    const profile = (await profileRes.json()) as ProxycurlProfileResponse;

    // Fetch recent posts (separate endpoint, low cost per profile)
    let posts: ProxycurlPostsResponse["activities"] = [];
    try {
      const postsRes = await fetch(
        `https://nubela.co/proxycurl/api/v2/linkedin/profile/recent-activity?linkedin_profile_url=${encodeURIComponent(linkedinUrl)}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      if (postsRes.ok) {
        const postsJson = (await postsRes.json()) as ProxycurlPostsResponse;
        posts = postsJson.activities ?? [];
      }
    } catch {
      // posts failure is non-fatal
    }

    const bankerProfile: BankerProfile = {
      bankerId: opts.bankerId ?? "",
      education:
        profile.education?.map((e) => ({
          school: e.school ?? "",
          degree: e.degree_name,
          year: e.ends_at?.year,
          activities: e.activities_and_societies ? [e.activities_and_societies] : undefined,
        })) ?? [],
      pastPositions:
        profile.experiences?.map((x) => ({
          firm: x.company ?? "",
          role: x.title ?? "",
          from: x.starts_at?.year ? String(x.starts_at.year) : undefined,
          to: x.ends_at?.year ? String(x.ends_at.year) : undefined,
        })) ?? [],
      aboutSection: profile.summary,
      recentPosts:
        (posts ?? []).slice(0, 10).map((p) => ({
          url: p.link,
          content: p.title ?? "",
          engagement: p.engagement,
        })) ?? [],
      recentDealsMentioned: [], // extracted elsewhere (Curator pass)
      volunteering:
        profile.volunteer_work?.map((v) => ({ org: v.company ?? "", role: v.title })) ?? [],
      languages: profile.languages ?? [],
      certifications:
        profile.certifications?.map((c) => ({ name: c.name ?? "", issuer: c.authority })) ?? [],
      interests: profile.interests ?? [],
      scrapedAt: new Date().toISOString(),
      scrapeSource: "proxycurl",
    };

    if (opts.cacheResult && opts.bankerId) {
      try {
        const admin = getAdminClient();
        await admin.from("banker_profiles").upsert({
          banker_id: opts.bankerId,
          education: bankerProfile.education,
          past_positions: bankerProfile.pastPositions,
          about_section: bankerProfile.aboutSection,
          recent_posts: bankerProfile.recentPosts,
          recent_deals_mentioned: bankerProfile.recentDealsMentioned,
          volunteering: bankerProfile.volunteering,
          languages: bankerProfile.languages,
          certifications: bankerProfile.certifications,
          interests: bankerProfile.interests,
          scraped_at: bankerProfile.scrapedAt,
          scrape_source: "proxycurl",
        });
      } catch (err) {
        console.warn("[proxycurl] cache write failed", err);
      }
    }
    return bankerProfile;
  } catch (err) {
    console.warn("[proxycurl] network error", err);
    return null;
  }
}

/**
 * Search Proxycurl for new bankers at a firm (Curator's discovery tool).
 * Returns LinkedIn profile URLs that match the firm + group.
 */
export async function discoverBankersAtFirm(
  firmName: string,
  groupName: string | undefined,
  limit = 20
): Promise<Array<{ name: string; title: string; linkedinUrl: string }>> {
  // Proxycurl shut down. Fall back to Serper-based LinkedIn search — same
  // approach as scripts/sweep-alumni.ts, just one firm × school per Curator
  // tick. The Curator runs every 30 min on the VPS, so even at 1 query per
  // run it adds 48 firm × school combos per day.
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) return [];

  try {
    // Alternate between Rice and Brown each call so both schools get filled.
    const school = Math.random() < 0.5 ? "Rice University" : "Brown University";
    const query = `site:linkedin.com/in "${firmName}" "${school}"${groupName ? ` "${groupName}"` : ""}`;
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: limit }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { organic?: Array<{ title: string; link: string; snippet: string }> };
    const seen = new Set<string>();
    const results: Array<{ name: string; title: string; linkedinUrl: string }> = [];
    for (const r of data.organic ?? []) {
      if (!r.link.includes("linkedin.com/in/")) continue;
      const norm = r.link.toLowerCase().replace(/[/?].*$/, "");
      if (seen.has(norm)) continue;
      seen.add(norm);
      // Extract name from "<Name> - <Title> - <Company> | LinkedIn" pattern
      const name = r.title.split(" - ")[0].split(" | ")[0].trim();
      const titleGuess = r.title.split(" - ")[1]?.trim() ?? "";
      results.push({ name, title: titleGuess, linkedinUrl: r.link });
      if (results.length >= limit) break;
    }
    return results;
  } catch (err) {
    console.warn("[discovery] serper search error", err);
    return [];
  }
}
