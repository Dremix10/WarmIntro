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
  sitelinks?: { title: string; link: string }[];
}

async function searchSerper(query: string): Promise<SerperResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: 5 }),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.organic ?? [];
}

export async function scrapeLinkedInProfile(name: string, university: string): Promise<ScrapedProfile | null> {
  // Search for their LinkedIn profile
  const linkedInResults = await searchSerper(`site:linkedin.com/in "${name}" "${university}"`);
  const linkedInResult = linkedInResults.find((r) => r.link.includes("linkedin.com/in/"));

  if (!linkedInResult) return null;

  // Also search broadly for more context
  const broadResults = await searchSerper(`"${name}" "${university}" experience education`);
  const snippets = [
    `LinkedIn Title: ${linkedInResult.title}`,
    `LinkedIn Snippet: ${linkedInResult.snippet}`,
    ...broadResults.slice(0, 3).map((r) => `${r.title}: ${r.snippet}`),
  ].join("\n\n");

  const safeName = sanitizeForPrompt(name, 100);
  const safeSnippets = sanitizeForPrompt(snippets, 3000);

  const prompt = `Extract profile information for ${safeName} at ${university} from these search results.

<user_data field="search_results">
${safeSnippets}
</user_data>

Return JSON:
{
  "major": string (their field of study, e.g. "Computer Science", "Mechanical Engineering"),
  "graduationYear": number (estimate from class year, sophomore/junior/senior status, or grad year mentioned. Current year is 2026. Freshman=2029, Sophomore=2028, Junior=2027, Senior=2026),
  "targetIndustries": string[] (infer 1-2 from their major/experience. Choose from: "Automotive & Manufacturing", "Technology", "Finance & Consulting", "Healthcare & Biotech", "Energy & Sustainability", "Consumer & Retail"),
  "skills": string[] (any skills, tools, or technologies mentioned, max 10),
  "experience": [{"company": string, "role": string, "duration": string, "highlights": string[]}] (any work experience found, empty array if none found)
}

Extract what you can find. Use reasonable defaults if data is limited. Do NOT make up specific company names or roles that aren't in the data.`;

  try {
    const parsed = await askClaudeJSON<Omit<ScrapedProfile, "linkedinUrl">>(prompt, {
      maxTokens: 1024,
    });

    return {
      ...parsed,
      linkedinUrl: linkedInResult.link,
    };
  } catch {
    return null;
  }
}
