import { NextResponse } from "next/server";
import type {
  GenerateOutreachRequest,
  GenerateOutreachResponse,
} from "@/shared/types";
import { generateOutreach } from "@/services/outreach-writer";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateOutreachRequest;

    if (!body.userProfile || !body.alumni || !body.company || !body.tone) {
      return NextResponse.json(
        { error: "userProfile, alumni, company, and tone are required" },
        { status: 400 }
      );
    }

    const drafts = await generateOutreach(
      body.userProfile,
      body.alumni,
      body.company,
      body.tone
    );

    const response: GenerateOutreachResponse = { drafts };

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate outreach";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
