// LinkedIn banker discovery via Google Serper. Used by the Curator's
// 24/7 discovery loop to find new bankers at target firms by school.
//
// Proxycurl (the previous structured-scrape provider) shut down. We do
// NOT scrape LinkedIn profile pages anymore — Serper's organic results
// give us names, titles, and profile URLs from LinkedIn's public listing
// pages, which is enough for the Researcher to score warmth.

export async function discoverBankersAtFirm(
  firmName: string,
  groupName: string | undefined,
  limit = 20
): Promise<Array<{ name: string; title: string; linkedinUrl: string }>> {
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
    if (!res.ok) {
      // Surface rate-limit / 5xx so observability can see why Curator's
      // discovered-count is zero, instead of silently returning empty.
      const text = await res.text().catch(() => "");
      console.warn(`[discovery] serper ${res.status} for "${firmName}": ${text.slice(0, 200)}`);
      return [];
    }
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

      // Validate the parsed name. Serper occasionally returns LinkedIn snippets
      // with non-name leading text ("Connect with Maria on LinkedIn", "View
      // John's profile"). Reject anything that doesn't look like a real name
      // — saves the Correspondent from quoting nonsense at a real banker.
      const looksLikeName =
        name.length >= 3 &&
        name.length <= 50 &&
        /^[A-Z][a-zA-Z'’.\-]*(?:\s+[A-Z][a-zA-Z'’.\-]*){0,4}$/.test(name) &&
        !/(connect|view|profile|linkedin|sign in|join|see all|contact|members|company)/i.test(name);
      if (!looksLikeName) continue;

      results.push({ name, title: titleGuess, linkedinUrl: r.link });
      if (results.length >= limit) break;
    }
    return results;
  } catch (err) {
    console.warn("[discovery] serper search error", err);
    return [];
  }
}
