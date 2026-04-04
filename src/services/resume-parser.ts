import type { UserProfile } from "@/shared/types";
import { askClaudeJSON } from "./claude";

const SYSTEM_PROMPT = `You are a resume parser. Extract structured data from resumes.
Return a JSON object matching this exact schema:
{
  "name": string,
  "email": string or null (extract if present in resume),
  "university": string,
  "graduationYear": number,
  "major": string,
  "skills": string[],
  "experience": [{ "company": string, "role": string, "duration": string, "highlights": string[] }],
  "targetIndustries": string[],
  "targetRoles": string[]
}

For targetIndustries, infer from their experience and skills. Choose from:
- "Automotive & Manufacturing"
- "Technology"
- "Finance & Consulting"
- "Healthcare & Biotech"
- "Energy & Sustainability"
- "Consumer & Retail"

For targetRoles, infer 3-5 realistic internship titles based on their major, skills, and experience.
Extract ALL skills mentioned, including tools, software, methodologies, and certifications.
Extract email if present in the resume header/contact info. Set to null if not found.`;

export async function parseResume(
  resumeText: string,
  university: string,
  email?: string
): Promise<UserProfile> {
  const prompt = `Parse this resume and extract structured profile data.
The student attends ${university}.

RESUME:
${resumeText}`;

  const parsed = await askClaudeJSON<Omit<UserProfile, "resumeText">>(prompt, {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 2048,
  });

  return {
    ...parsed,
    email: email || parsed.email || undefined,
    university,
    resumeText,
  };
}
