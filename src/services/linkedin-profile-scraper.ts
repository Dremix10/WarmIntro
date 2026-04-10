import { askClaudeJSON } from "./claude";
import { sanitizeForPrompt } from "./sanitize";

interface ScrapedProfile {
  major: string;
  graduationYear: number;
  targetIndustries: string[];
  skills: string[];
  experience: { company: string; role: string; duration: string; highlights: string[] }[];
  linkedinUrl: string;
}

interface SerperResult {
  title: string;
  link: string;
  snippet: string;
}

async function searchSerper(query: string, num = 5): Promise<SerperResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.organic ?? [];
}

export async function scrapeLinkedInProfile(name: string, university: string): Promise<ScrapedProfile | null> {
  // Run 3 searches in parallel for maximum data coverage
  const [linkedInResults, broadResults, projectResults] = await Promise.all([
    searchSerper(`site:linkedin.com/in "${name}" "${university}"`),
    searchSerper(`"${name}" "${university}"`, 10),
    searchSerper(`"${name}" "${university}" project intern hackathon`),
  ]);

  const linkedInResult = linkedInResults.find((r) => r.link.includes("linkedin.com/in/"));

  // Also check broad results for LinkedIn link (sometimes shows up there)
  const linkedInFromBroad = !linkedInResult
    ? broadResults.find((r) => r.link.includes("linkedin.com/in/"))
    : null;
  const bestLinkedIn = linkedInResult ?? linkedInFromBroad;

  // Aggregate all unique snippets for maximum context
  const allResults = [...linkedInResults, ...broadResults, ...projectResults];
  const seen = new Set<string>();
  const snippets: string[] = [];

  for (const r of allResults) {
    const key = r.link;
    if (seen.has(key)) continue;
    seen.add(key);
    snippets.push(`[${r.title}]: ${r.snippet}`);
    if (snippets.length >= 12) break;
  }

  if (snippets.length === 0) return null;

  const safeName = sanitizeForPrompt(name, 100);
  const safeSnippets = sanitizeForPrompt(snippets.join("\n\n"), 4000);

  const prompt = `Extract a detailed profile for ${safeName} at ${university} from these search results about them.

<user_data field="search_results">
${safeSnippets}
</user_data>

Return JSON:
{
  "major": string (their field of study — look for mentions of major, department, school, or degree),
  "graduationYear": number (current year is 2026. Estimate from class year, freshman/sophomore/junior/senior status, or "Class of XXXX". Freshman=2029, Sophomore=2028, Junior=2027, Senior=2026),
  "targetIndustries": string[] (infer 1-3 from their major, projects, and experience. Choose ONLY from: "Automotive & Manufacturing", "Technology", "Finance & Consulting", "Healthcare & Biotech", "Energy & Sustainability", "Consumer & Retail", "Design & Architecture"),
  "skills": string[] (extract ALL skills, tools, technologies, programming languages, and competencies mentioned across all results. Include inferred skills from activities like competitive programming, hackathons, research. Max 15),
  "experience": [{"company": string, "role": string, "duration": string, "highlights": string[]}] (extract ALL work experience, research positions, teaching roles, club leadership, hackathon projects, and competitions found. Each should be a separate entry. Use "Unknown" for duration if not mentioned)
}

Be thorough — these search results contain fragments across multiple sources. Piece together the full picture. For skills, infer from context: ICPC/competitive programming implies algorithms, data structures, C++/Python. Hackathons imply rapid prototyping. Research implies analytical skills.`;

  try {
    const parsed = await askClaudeJSON<Omit<ScrapedProfile, "linkedinUrl">>(prompt, {
      maxTokens: 1536,
    });

    return {
      ...parsed,
      linkedinUrl: bestLinkedIn?.link ?? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name + " " + university)}`,
    };
  } catch {
    return null;
  }
}
