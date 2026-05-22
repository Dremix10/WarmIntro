import { NextResponse } from "next/server";
import { askClaudeJSON } from "@/services/claude";
import { getUser } from "@/lib/auth";

interface SummarizeRequest {
  transcript: string;
  alumniName: string;
  alumniRole: string;
  companyName: string;
}

interface SummarizeResponse {
  summary: string;
  keyTakeaways: string[];
  followUpActions: string[];
  sentiment: "positive" | "neutral" | "needs_attention";
}

export async function POST(request: Request) {
  try {
    const auth = await getUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = (await request.json()) as SummarizeRequest;

    if (!body.transcript || !body.alumniName || !body.companyName) {
      return NextResponse.json(
        { error: "transcript, alumniName, and companyName are required" },
        { status: 400 }
      );
    }

    const prompt = `Summarize this coffee chat / networking conversation between a college student and ${body.alumniName} (${body.alumniRole} at ${body.companyName}).

TRANSCRIPT/NOTES:
${body.transcript.slice(0, 3000)}

Return JSON:
{
  "summary": string (2-3 sentence summary of the conversation),
  "keyTakeaways": string[] (3-5 bullet points of important things learned),
  "followUpActions": string[] (2-3 specific next steps for the student),
  "sentiment": "positive" | "neutral" | "needs_attention" (how receptive was the contact)
}

Focus on actionable insights — referral opportunities, hiring timeline, team info, advice given.`;

    const result = await askClaudeJSON<SummarizeResponse>(prompt, {
      maxTokens: 1024,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to summarize";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
