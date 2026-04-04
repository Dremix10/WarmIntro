import type {
  UserProfile,
  Alumni,
  Company,
  OutreachDraft,
} from "@/shared/types";
import { askClaudeJSON } from "./claude";

interface DraftResponse {
  email: {
    subject: string;
    body: string;
  };
  linkedin: {
    body: string;
  };
}

export async function generateOutreach(
  userProfile: UserProfile,
  alumni: Alumni,
  company: Company,
  tone: "professional" | "casual" | "warm"
): Promise<OutreachDraft[]> {
  const toneGuide = {
    professional:
      "Formal but friendly. Use proper greetings and sign-offs. Emphasize qualifications.",
    casual:
      "Conversational and genuine. Like messaging a friend-of-a-friend. Use first names.",
    warm: "Enthusiastic but respectful. Lead with shared connections. Show genuine interest in their work.",
  };

  const userEmail = userProfile.email || `${userProfile.name.toLowerCase().replace(/\s+/g, ".")}@rice.edu`;
  const isWarmConnection = alumni.sharedBackground.length > 0;

  const prompt = `Write outreach messages from a college student to ${isWarmConnection ? "an alumni" : "a professional"} for networking.

STUDENT:
- Name: ${userProfile.name}
- Email: ${userEmail}
- University: ${userProfile.university} (Class of ${userProfile.graduationYear})
- Major: ${userProfile.major}
- Key skills: ${userProfile.skills.slice(0, 5).join(", ")}
- Experience: ${userProfile.experience.map((e) => `${e.role} at ${e.company}`).join("; ")}
- Target roles: ${userProfile.targetRoles.slice(0, 3).join(", ")}

${isWarmConnection ? "ALUMNI" : "TARGET CONTACT"}:
- Name: ${alumni.name}
- Role: ${alumni.currentRole} at ${alumni.currentCompany}
${alumni.graduationYear > 0 ? `- Graduated: ${alumni.university} ${alumni.graduationYear}, ${alumni.major}` : "- No university connection"}
- Shared background: ${alumni.sharedBackground.length > 0 ? alumni.sharedBackground.join(", ") : "None — this is a cold outreach"}
- Connection strength: ${alumni.connectionStrength}

COMPANY: ${company.name} — ${company.description}

TONE: ${toneGuide[tone]}

Return JSON:
{
  "email": {
    "subject": string (short, specific subject line${isWarmConnection ? " referencing shared connection" : ""}),
    "body": string (3-4 paragraphs: ${isWarmConnection ? "intro with shared connection" : "intro expressing genuine interest in their work"}, ${isWarmConnection ? "genuine interest in their work" : "brief background on yourself"}, specific ask for 15-min chat, warm sign-off. End with:

${userProfile.name}
${userProfile.university} '${String(userProfile.graduationYear).slice(2)} | ${userProfile.major}
${userEmail})
  },
  "linkedin": {
    "body": string (2-3 sentences max for connection request — ${isWarmConnection ? "mention shared background, " : ""}express interest, suggest connecting)
  }
}

Keep it authentic. Student asking for advice, not demanding referrals.${isWarmConnection ? " Reference specific shared experiences." : " Be respectful of their time since this is cold outreach."}`;

  const draft = await askClaudeJSON<DraftResponse>(prompt, {
    maxTokens: 1536,
  });

  const emailDraft: OutreachDraft = {
    id: `draft-email-${alumni.id}-${company.id}`,
    alumniId: alumni.id,
    companyId: company.id,
    subject: draft.email.subject,
    body: draft.email.body,
    channel: "email",
    tone,
  };

  const linkedinDraft: OutreachDraft = {
    id: `draft-linkedin-${alumni.id}-${company.id}`,
    alumniId: alumni.id,
    companyId: company.id,
    subject: "Connection request",
    body: draft.linkedin.body,
    channel: "linkedin",
    tone,
  };

  return [emailDraft, linkedinDraft];
}

export async function generateFollowUp(
  userProfile: UserProfile,
  alumni: Alumni,
  company: Company,
  originalBody: string
): Promise<OutreachDraft[]> {
  const prompt = `Write a polite follow-up message. The student sent an initial outreach that got no reply after ~1 week.

STUDENT: ${userProfile.name}, ${userProfile.university} '${String(userProfile.graduationYear).slice(2)} ${userProfile.major}
CONTACT: ${alumni.name}, ${alumni.currentRole} at ${company.name}

ORIGINAL MESSAGE (summarize, don't repeat):
${originalBody.slice(0, 500)}

Return JSON:
{
  "email": {
    "subject": string (short follow-up subject),
    "body": string (2-3 paragraphs: brief friendly reference to original message, add a new angle or specific question about their work, reiterate 15-min ask, sign-off with student's name and university)
  },
  "linkedin": {
    "body": string (1-2 sentences: casual bump, reference original note, suggest a quick call)
  }
}

Keep it SHORT and genuine. No desperation. Add value — reference something specific about ${company.name} or their role.`;

  const draft = await askClaudeJSON<DraftResponse>(prompt, {
    maxTokens: 1024,
  });

  return [
    {
      id: `followup-email-${alumni.id}-${company.id}`,
      alumniId: alumni.id,
      companyId: company.id,
      subject: draft.email.subject,
      body: draft.email.body,
      channel: "email",
      tone: "warm",
    },
    {
      id: `followup-linkedin-${alumni.id}-${company.id}`,
      alumniId: alumni.id,
      companyId: company.id,
      subject: "Follow-up",
      body: draft.linkedin.body,
      channel: "linkedin",
      tone: "warm",
    },
  ];
}
