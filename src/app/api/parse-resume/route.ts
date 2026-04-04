import { NextResponse } from "next/server";
import type { ParseResumeRequest, ParseResumeResponse } from "@/shared/types";
import { parseResume } from "@/services/resume-parser";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ParseResumeRequest;

    if (!body.resumeText || !body.university) {
      return NextResponse.json(
        { error: "resumeText and university are required" },
        { status: 400 }
      );
    }

    const profile = await parseResume(body.resumeText, body.university, body.email);
    const response: ParseResumeResponse = { profile };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
