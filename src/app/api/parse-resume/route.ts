import { NextResponse } from "next/server";
import type { ParseResumeRequest, ParseResumeResponse } from "@/shared/types";
import { parseResume } from "@/services/resume-parser";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ParseResumeRequest;

    if (!body.resumeText) {
      return NextResponse.json(
        { error: "resumeText is required" },
        { status: 400 }
      );
    }

    if (body.resumeText.length > 15000) {
      return NextResponse.json(
        { error: "Resume text too long (max 15,000 characters)" },
        { status: 400 }
      );
    }

    // university is a hint, not required — for @gmail.com or any non-school
    // email, the parser extracts the school from the resume itself.
    const profile = await parseResume(body.resumeText, body.university ?? "", body.email);
    const response: ParseResumeResponse = { profile };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
