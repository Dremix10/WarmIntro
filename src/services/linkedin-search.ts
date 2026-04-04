interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

interface SerperResponse {
  organic: SerperResult[];
}

interface LinkedInProfile {
  name: string;
  linkedinUrl: string;
  headline: string;
}

const profileCache = new Map<string, LinkedInProfile | null>();

async function searchSerper(query: string, num: number = 3): Promise<SerperResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return [];
  }

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (!res.ok) {
    return [];
  }

  const data = (await res.json()) as SerperResponse;
  return data.organic ?? [];
}

function extractNameFromTitle(title: string): string {
  return title.split(" - ")[0].split(" | ")[0].trim();
}

export async function findLinkedInProfile(
  role: string,
  company: string,
  university: string
): Promise<LinkedInProfile | null> {
  const cacheKey = `${role}::${company}::${university}`;
  if (profileCache.has(cacheKey)) {
    return profileCache.get(cacheKey) ?? null;
  }

  // Try specific query first, then broader fallback
  const queries = [
    `site:linkedin.com/in "${role}" "${company}" "${university}"`,
    `site:linkedin.com/in "${company}" "${university}"`,
  ];

  for (const query of queries) {
    const results = await searchSerper(query, 3);
    const linkedinResult = results.find(
      (r) => r.link.includes("linkedin.com/in/")
    );

    if (linkedinResult) {
      const profile: LinkedInProfile = {
        name: extractNameFromTitle(linkedinResult.title),
        linkedinUrl: linkedinResult.link,
        headline: linkedinResult.snippet.slice(0, 200),
      };
      profileCache.set(cacheKey, profile);
      return profile;
    }
  }

  profileCache.set(cacheKey, null);
  return null;
}

export async function findLinkedInProfiles(
  searches: { role: string; company: string; university: string }[]
): Promise<(LinkedInProfile | null)[]> {
  const results = await Promise.all(
    searches.map((s) => findLinkedInProfile(s.role, s.company, s.university))
  );
  return results;
}

export async function findRealAlumni(
  company: string,
  university: string,
  count: number = 5
): Promise<LinkedInProfile[]> {
  const cacheKey = `real::${company}::${university}`;

  const query = `site:linkedin.com/in "${company}" "${university}"`;
  const results = await searchSerper(query, count + 2);

  const profiles: LinkedInProfile[] = [];
  const seenUrls = new Set<string>();

  for (const r of results) {
    if (!r.link.includes("linkedin.com/in/")) continue;
    if (seenUrls.has(r.link)) continue;
    seenUrls.add(r.link);

    profiles.push({
      name: extractNameFromTitle(r.title),
      linkedinUrl: r.link,
      headline: r.snippet.slice(0, 200),
    });

    if (profiles.length >= count) break;
  }

  return profiles;
}
