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

async function serperSearch(query: string, num = 8): Promise<SerperOrganic[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num, tbs: "qdr:y" }), // qdr:y = past year
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

// Filter results: must reference the banker by name in title or snippet.
// Stops Serper from returning generic "Morgan Stanley TMT outlook" articles
// that don't actually mention the specific banker.
function mentionsBanker(banker: ScoutInput, organic: SerperOrganic): boolean {
  const haystack = `${organic.title} ${organic.snippet ?? ""}`.toLowerCase();
  return haystack.includes(banker.bankerName.toLowerCase());
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

    // Build queries. We fan them out in parallel — the diverse ones return
    // mostly disjoint results (LinkedIn vs press vs podcast), and total
    // Scout latency is what matters under the 60s function budget. Rather
    // than serial-with-early-exit (saves 1-2 Serper calls but burns 4-6
    // seconds per banker), we just take the cost of 4 parallel calls and
    // dedupe results client-side.
    const queries: string[] = [];
    queries.push(`"${input.bankerName}" ${input.firmName ?? ""} 2025 2026`.trim());
    queries.push(`"${input.bankerName}" linkedin post`);
    if (input.firmName) queries.push(`"${input.bankerName}" "${input.firmName}" deal acquisition`);
    queries.push(`"${input.bankerName}" interview podcast`);

    const allResults = (await Promise.all(queries.map((q) => serperSearch(q, 8)))).flat();

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
