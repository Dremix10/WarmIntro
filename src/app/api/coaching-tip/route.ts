import { NextResponse } from "next/server";
import { askClaudeJSON } from "@/services/claude";
import { getUser } from "@/lib/auth";

interface CoachingTipRequest {
  stage: string;
  alumniName: string;
  alumniRole: string;
  companyName: string;
  userMajor: string;
}

interface CoachingTipResponse {
  tip: string;
  nextAction: string;
}

// Cache tips to avoid redundant API calls
const tipCache = new Map<string, CoachingTipResponse>();

export async function POST(request: Request) {
  try {
    const auth = await getUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = (await request.json()) as CoachingTipRequest;

    if (!body.stage || !body.alumniName || !body.alumniRole || !body.companyName) {
      return NextResponse.json(
        { error: "stage, alumniName, alumniRole, and companyName are required" },
        { status: 400 }
      );
    }

    const cacheKey = `${body.stage}::${body.companyName}::${body.alumniRole}`;
    if (tipCache.has(cacheKey)) {
      return NextResponse.json(tipCache.get(cacheKey)!);
    }

    const stageContext: Record<string, string> = {
      replied: `The alumni (${body.alumniName}, ${body.alumniRole} at ${body.companyName}) just replied to the student's outreach. The student studies ${body.userMajor}.`,
      coffee: `The student just booked a coffee chat with ${body.alumniName} (${body.alumniRole} at ${body.companyName}). The student studies ${body.userMajor}.`,
      referral: `${body.alumniName} (${body.alumniRole} at ${body.companyName}) just agreed to refer the student (${body.userMajor} major) for a position.`,
    };

    const prompt = `You are a career coaching AI. Give a brief, actionable coaching tip for a college student networking for internships.

SITUATION: ${stageContext[body.stage] ?? "Student is networking."}

Return JSON:
{
  "tip": string (2-3 sentences of specific, actionable advice for this exact stage — what to prepare, what to say, what NOT to do),
  "nextAction": string (one specific next step they should take right now, under 15 words)
}

Be specific and practical, not generic. Reference the company and role.`;

    const result = await askClaudeJSON<CoachingTipResponse>(prompt, {
      maxTokens: 512,
    });

    tipCache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate tip";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
