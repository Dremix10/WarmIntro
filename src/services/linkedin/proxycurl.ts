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
  const apiKey = process.env.PROXYCURL_API_KEY;
  if (!apiKey) {
    warnMissingKey();
    return [];
  }

  try {
    const query = [firmName, groupName, "investment banking"].filter(Boolean).join(" ");
    const url = new URL("https://nubela.co/proxycurl/api/v2/search/person/");
    url.searchParams.set("current_job_description_regex", query);
    url.searchParams.set("page_size", String(limit));

    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) return [];

    const json = (await res.json()) as { results?: Array<{ profile?: { full_name?: string; occupation?: string; linkedin_profile_url?: string } }> };
    return (
      json.results
        ?.map((r) => ({
          name: r.profile?.full_name ?? "",
          title: r.profile?.occupation ?? "",
          linkedinUrl: r.profile?.linkedin_profile_url ?? "",
        }))
        .filter((r) => r.name && r.linkedinUrl) ?? []
    );
  } catch (err) {
    console.warn("[proxycurl] discovery error", err);
    return [];
  }
}
