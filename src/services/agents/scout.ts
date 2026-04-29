// Scout agent — finds recent posts, mentions, and findings about a banker
// from the live web. Replaces the Proxycurl-style structured profile scrape
// with real-time Serper queries.
//
// The Correspondent calls scoutBankerFindings() before drafting. Each
// finding has a source URL (provenance baked in), so when the email cites
// "your post about X," the fact-checker can verify against the exact URL
// the Scout pulled it from.
//
// Cached for 14 days per banker. Re-scout is idempotent (UNIQUE on
// banker_id + url).

import { startAgentRun, endAgentRun, logSignal } from "./shared";
import { restSelect, restUpsert, eq, gte } from "@/lib/supabase-rest";

export interface ScoutedFinding {
  url: string;
  title: string;
  snippet: string | null;
  sourceType: "linkedin_post" | "article" | "press_mention" | "podcast" | "deal_announcement" | "other";
  publishedHint: string | null;
  scoutedAt: string;
}

interface ScoutInput {
  bankerId: string;
  bankerName: string;
  firmName?: string | null;
  linkedinUrl?: string | null;
  forceRefresh?: boolean;
}

interface SerperOrganic { title: string; link: string; snippet?: string; date?: string }
interface SerperResponse { organic?: SerperOrganic[] }

async function serperSearch(query: string, opts: { num?: number; recentOnly?: boolean } = {}): Promise<SerperOrganic[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];
  try {
    // qdr:y limits to past year. Useful for "recent post" queries but hurts
    // queries that just want to find the banker's profile/bio anywhere on
    // the web. Most junior bankers don't post often, so a year filter
    // empties the result set. Only apply on queries explicitly asking for
    // recent activity.
    const body: Record<string, unknown> = { q: query, num: opts.num ?? 8 };
    if (opts.recentOnly) body.tbs = "qdr:y";
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as SerperResponse;
    return json.organic ?? [];
  } catch {
    return [];
  }
}

function classifySource(url: string): ScoutedFinding["sourceType"] {
  const u = url.toLowerCase();
  if (u.includes("linkedin.com/posts/") || u.includes("linkedin.com/feed/update")) return "linkedin_post";
  if (u.includes("podcast") || u.includes("spotify.com/episode") || u.includes("apple.com/podcast")) return "podcast";
  if (u.includes("/press") || u.includes("/news") || /announce|acquir|merger|raise/.test(u)) return "deal_announcement";
  if (u.includes("bloomberg") || u.includes("wsj.com") || u.includes("reuters") || u.includes("ft.com") || u.includes("axios.com") || u.includes("forbes")) return "press_mention";
  if (u.includes("article") || u.includes("/blog/")) return "article";
  return "other";
}

// Filter results: must reference THIS specific banker, not just someone
// who shares the name. For common names ("Christian Saldana", "John Smith")
// the name alone is a terrible filter — Serper returns articles about high
// school football players, middle schoolers, etc. So we ALSO require either
// (a) the firm name appearing in the same result, OR (b) the result being
// the banker's own LinkedIn URL slug. Without this gate, the cache fills
// with wrong-person mentions that the Correspondent then treats as real.
function mentionsBanker(banker: ScoutInput, organic: SerperOrganic): boolean {
  const haystack = `${organic.title} ${organic.snippet ?? ""} ${organic.link}`.toLowerCase();
  const nameHit = haystack.includes(banker.bankerName.toLowerCase());
  if (!nameHit) return false;
  // Disambiguation: require firm OR the banker's exact LinkedIn slug
  // anywhere in the URL. The slug is unique per LinkedIn user, so its
  // presence is a strong "this is the right person" signal — works for
  // /in/<slug> (profile pages) AND /posts/<slug>_... (post pages) AND
  // /pulse/<slug>-... (article pages).
  const firmHit = banker.firmName ? haystack.includes(banker.firmName.toLowerCase()) : false;
  let slugHit = false;
  if (banker.linkedinUrl) {
    const slug = banker.linkedinUrl.replace(/.*linkedin\.com\/in\//, "").replace(/[/?#].*$/, "").toLowerCase();
    if (slug && slug.length >= 4 && organic.link.toLowerCase().includes(slug)) slugHit = true;
  }
  return firmHit || slugHit;
}

// Drop the generic LinkedIn directory pages — they aren't findings.
function isUsefulUrl(url: string): boolean {
  if (!url) return false;
  if (url.includes("/pub/dir/")) return false;
  if (url.includes("/in/") && !url.includes("/posts/") && !url.includes("/recent-activity/")) {
    // Plain /in/ profile page. It's the banker's own profile, not a
    // specific finding — Correspondent already has the linkedin_url.
    return false;
  }
  return true;
}

export async function scoutBankerFindings(input: ScoutInput): Promise<ScoutedFinding[]> {
  const ctx = await startAgentRun({
    agent: "scout",
    triggeredBy: "agent_dispatch",
    inputSummary: { bankerId: input.bankerId, bankerName: input.bankerName },
  });

  try {
    // Reuse fresh cached findings unless caller forces refresh.
    if (!input.forceRefresh) {
      const cached = await restSelect("banker_findings", {
        select: "url, title, snippet, source_type, published_hint, scouted_at",
        filters: { banker_id: eq(input.bankerId), expires_at: gte(new Date().toISOString()) },
        order: "scouted_at.desc",
        limit: 6,
      });
      if (cached.length >= 2) {
        await endAgentRun(ctx, { found: cached.length, source: "cache" });
        return cached.map((c) => ({
          url: c.url as string,
          title: c.title as string,
          snippet: (c.snippet as string | null) ?? null,
          sourceType: c.source_type as ScoutedFinding["sourceType"],
          publishedHint: (c.published_hint as string | null) ?? null,
          scoutedAt: c.scouted_at as string,
        }));
      }
    }

    // Build queries. Fan out in parallel — diverse queries return mostly
    // disjoint result spaces (LinkedIn / press / podcast / profile pages).
    // Each query is annotated whether it's "recent only" (year-filtered)
    // or general — most queries skip the year filter because junior
    // bankers rarely post, and we'd rather have a real bio mention than
    // nothing at all.
    const slug = input.linkedinUrl
      ?.replace(/.*linkedin\.com\/in\//, "")
      .replace(/[/?#].*$/, "");

    const queries: Array<{ q: string; recentOnly?: boolean }> = [];
    // 1. Recent activity by name + firm — year-filtered, looks for fresh news/posts.
    if (input.firmName) queries.push({ q: `"${input.bankerName}" "${input.firmName}"`, recentOnly: true });
    // 2. The banker's own LinkedIn profile + adjacent post pages.
    if (slug) queries.push({ q: `site:linkedin.com/in/${slug}` });
    if (slug) queries.push({ q: `site:linkedin.com/posts "${input.bankerName}"` });
    // 3. Broad name + firm search (no time filter) — bio pages, firm
    //    websites, deal announcements that may not be from "the past year".
    if (input.firmName) queries.push({ q: `"${input.bankerName}" "${input.firmName}"` });
    // 4. Deals + press.
    if (input.firmName) queries.push({ q: `"${input.bankerName}" "${input.firmName}" advised acquisition`, recentOnly: true });
    // 5. Podcast / interview surfaces.
    queries.push({ q: `"${input.bankerName}" interview podcast` });

    const allResults = (
      await Promise.all(queries.map((q) => serperSearch(q.q, { num: 8, recentOnly: q.recentOnly })))
    ).flat();

    const seen = new Set<string>();
    const findings: ScoutedFinding[] = [];
    for (const r of allResults) {
      if (findings.length >= 5) break;
      if (!isUsefulUrl(r.link)) continue;
      if (!mentionsBanker(input, r)) continue;
      const key = r.link.toLowerCase().replace(/[?#].*$/, "");
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push({
        url: r.link,
        title: r.title.slice(0, 200),
        snippet: r.snippet?.slice(0, 400) ?? null,
        sourceType: classifySource(r.link),
        publishedHint: r.date ?? null,
        scoutedAt: new Date().toISOString(),
      });
    }

    // Cache. UNIQUE(banker_id,url) makes upsert idempotent.
    if (findings.length > 0) {
      await restUpsert(
        "banker_findings",
        findings.map((f) => ({
          banker_id: input.bankerId,
          url: f.url,
          title: f.title,
          snippet: f.snippet,
          source_type: f.sourceType,
          published_hint: f.publishedHint,
          scouted_at: f.scoutedAt,
        })),
        { onConflict: "banker_id,url" }
      );
    }

    await logSignal({
      bankerId: input.bankerId,
      agent: "scout",
      signalType: "scout_completed",
      metadata: { found: findings.length, queries: queries.length },
    });
    await endAgentRun(ctx, { found: findings.length, source: "live" });
    return findings;
  } catch (err) {
    await endAgentRun(ctx, { error: String(err).slice(0, 200) }, "scout_failed");
    return [];
  }
}
