import { askClaudeJSON } from "./claude";
import { sanitizeForPrompt } from "./sanitize";

interface FoundPerson {
  name: string;
  role: string;
  company: string;
  linkedinUrl: string;
  headline: string;
}

interface PersonWithMessage extends FoundPerson {
  narrative: string;
  suggestedOpener: string;
  category: string;
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

function extractNameFromTitle(title: string): string {
  return title.split(" - ")[0].split(" | ")[0].trim();
}

export async function findRealPeopleForRole(
  role: string,
  university: string,
  count = 3
): Promise<FoundPerson[]> {
  // Search for real people on LinkedIn with this role from this university
  const query = `site:linkedin.com/in "${role}" "${university}"`;
  const results = await searchSerper(query, count + 2);

  const people: FoundPerson[] = [];
  const seenUrls = new Set<string>();

  for (const r of results) {
    if (!r.link.includes("linkedin.com/in/")) continue;
    if (seenUrls.has(r.link)) continue;
    seenUrls.add(r.link);

    const name = extractNameFromTitle(r.title);
    // Extract role and company from title/snippet
    const titleParts = r.title.split(" - ");
    const headline = titleParts[1]?.trim() ?? r.snippet.slice(0, 100);

    // Try to extract company from headline
    const atMatch = headline.match(/(?:at|@)\s+(.+?)(?:\s*[|·\-]|$)/i);
    const company = atMatch?.[1]?.trim() ?? "";

    people.push({
      name,
      role: headline.split(" at ")[0].split(" - ")[0].slice(0, 80),
      company: company || "Unknown",
      linkedinUrl: r.link,
      headline: r.snippet.slice(0, 200),
    });

    if (people.length >= count) break;
  }

  return people;
}

export async function findAndGenerateConnections(
  userName: string,
  university: string,
  major: string,
  gradYear: number,
  targetRoles: string[],
  targetIndustries: string[]
): Promise<{ categories: { name: string; reason: string }[]; people: PersonWithMessage[] }> {
  // Step 1: Deduce top 2-3 categories of people to connect with
  const safeMajor = sanitizeForPrompt(major, 100);
  const safeRoles = targetRoles.slice(0, 5).map((r) => sanitizeForPrompt(r, 80));
  const safeIndustries = targetIndustries.slice(0, 3).map((i) => sanitizeForPrompt(i, 60));

  const categoryPrompt = `A ${university} student studying ${safeMajor} (class of ${gradYear}) is looking for internship connections.
Their target roles: ${safeRoles.join(", ")}
Their target industries: ${safeIndustries.join(", ")}

Deduce the top 3 specific categories of professionals they should connect with on LinkedIn.
Each category should be a specific role type, not an industry.

Return JSON:
[
  { "name": string (e.g. "Senior Architects at Top Firms", "Sustainability Consultants", "Urban Design Directors"), "reason": string (1 sentence: why this person type is valuable for this student), "searchRole": string (the LinkedIn role title to search for, e.g. "Architect", "Urban Planner", "Sustainability Director") }
]

Be specific to their major and interests. Not generic.`;

  const categories = await askClaudeJSON<{ name: string; reason: string; searchRole: string }[]>(
    categoryPrompt, { maxTokens: 512 }
  );

  // Step 2: Find real people for each category via Serper (parallel)
  const allPeople: PersonWithMessage[] = [];

  const searchResults = await Promise.all(
    categories.slice(0, 3).map(async (cat) => {
      const people = await findRealPeopleForRole(cat.searchRole, university, 2);
      return { category: cat, people };
    })
  );

  // Step 3: Generate personalized messages for all found people
  const foundPeople = searchResults.flatMap((sr) =>
    sr.people.map((p) => ({ ...p, category: sr.category.name }))
  );

  if (foundPeople.length === 0) {
    return { categories: categories.map((c) => ({ name: c.name, reason: c.reason })), people: [] };
  }

  const safeUserName = sanitizeForPrompt(userName, 100);
  const messagePrompt = `Generate personalized LinkedIn connection request messages for a ${university} ${safeMajor} student (${safeUserName}, class of ${gradYear}).

IMPORTANT: The student's only confirmed background is ${university} and ${safeMajor}. Do NOT claim they are in any clubs or organizations unless it directly relates to their major.

PEOPLE TO MESSAGE:
${JSON.stringify(foundPeople.map((p) => ({ name: p.name, role: p.role, company: p.company, headline: p.headline, category: p.category })), null, 2)}

For each person, return a JSON array:
[
  {
    "name": string (match exactly),
    "narrative": string (1-2 sentences: why this specific person is worth connecting with based on their role and the student's goals),
    "suggestedOpener": string (2-3 sentence LinkedIn connection request. Mention ${university}. Be genuine and specific to their role. Do NOT mention clubs the student isn't in.)
  }
]`;

  const messages = await askClaudeJSON<{ name: string; narrative: string; suggestedOpener: string }[]>(
    messagePrompt, { maxTokens: 1536 }
  );

  const peopleWithMessages: PersonWithMessage[] = foundPeople.map((p, i) => ({
    ...p,
    narrative: messages[i]?.narrative ?? `${p.name} works as ${p.role} — a great connection for your career goals.`,
    suggestedOpener: messages[i]?.suggestedOpener ?? `Hi ${p.name}! I'm a ${university} ${safeMajor} student and would love to connect about your work in ${p.role}.`,
  }));

  return {
    categories: categories.map((c) => ({ name: c.name, reason: c.reason })),
    people: peopleWithMessages,
  };
}
