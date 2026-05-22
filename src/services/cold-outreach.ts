import type { Alumni, WarmPath } from "@/shared/types";
import { askClaudeJSON } from "./claude";
import { findRealAlumni } from "./linkedin-search";

export async function generateColdOutreach(
  companyId: string,
  companyName: string,
  university: string,
  userMajor: string,
  userGradYear: number
): Promise<WarmPath[]> {
  const realProfiles = await findRealAlumni(companyName, university, 5);

  if (realProfiles.length > 0) {
    const alumni: Alumni[] = realProfiles.map((p, i) => ({
      id: `real-${companyId}-${i}`,
      name: p.name,
      university: university,
      graduationYear: 0,
      major: "Unknown",
      currentCompany: companyName,
      currentRole: p.headline.split(" at ")[0].split(" - ")[0].slice(0, 60),
      linkedinUrl: p.linkedinUrl,
      connectionStrength: "medium" as const,
      sharedBackground: [university],
    }));

    const prompt = `Generate warm introduction paths for a ${university} ${userMajor} student (class of ${userGradYear}) reaching out to these REAL people found on LinkedIn at ${companyName}.

CONTACTS:
${JSON.stringify(alumni.map((a) => ({ name: a.name, role: a.currentRole, company: a.currentCompany })), null, 2)}

For each contact, return a JSON array with objects matching:
{
  "narrative": string (2-3 sentences: why this person is a good contact based on their role, suggest they might be a ${university} alum),
  "suggestedOpener": string (a natural opening message — mention ${university}, express interest in their work at ${companyName}, 1-2 sentences)
}`;

    const paths = await askClaudeJSON<{ narrative: string; suggestedOpener: string }[]>(prompt, {
      maxTokens: 1536,
    });

    return alumni.map((a, i) => ({
      alumni: a,
      narrative: paths[i]?.narrative ?? `${a.name} works at ${companyName} and may have a connection to ${university}.`,
      suggestedOpener: paths[i]?.suggestedOpener ?? `Hi ${a.name}! I'm a ${university} student interested in ${companyName} — would love to connect.`,
      warmthScore: 40,
    }));
  }

  const prompt = `A ${university} ${userMajor} student (class of ${userGradYear}) wants to connect with people at ${companyName}, but we couldn't find specific ${university} alumni there.

Generate 3 suggested outreach strategies. For each, return a JSON array with:
{
  "name": string (use a role description like "Engineering Manager" instead of a fake name),
  "role": string (the type of person to look for),
  "narrative": string (2-3 sentences: why this type of person is good to reach out to),
  "suggestedOpener": string (a cold but warm opening message, 1-2 sentences)
}`;

  const suggestions = await askClaudeJSON<
    { name: string; role: string; narrative: string; suggestedOpener: string }[]
  >(prompt, { maxTokens: 1024 });

  return suggestions.map((s, i) => ({
    alumni: {
      id: `cold-${companyId}-${i}`,
      name: s.name,
      university: "N/A",
      graduationYear: 0,
      major: "N/A",
      currentCompany: companyName,
      currentRole: s.role,
      linkedinUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(s.role + " " + companyName)}`,
      email: undefined,
      connectionStrength: "weak" as const,
      sharedBackground: [],
    },
    narrative: s.narrative,
    suggestedOpener: s.suggestedOpener,
    warmthScore: 15,
  }));
}
