import { NextResponse } from "next/server";
import type { UserProfile, Alumni, Company } from "@/shared/types";
import { generateFollowUp } from "@/services/outreach-writer";
import { getUser } from "@/lib/auth";

interface FollowUpRequest {
  userProfile: UserProfile;
  alumni: Alumni;
  company: Company;
  originalBody: string;
}

export async function POST(request: Request) {
  try {
    const auth = await getUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = (await request.json()) as FollowUpRequest;

    if (!body.userProfile || !body.alumni || !body.company || !body.originalBody) {
      return NextResponse.json(
        { error: "userProfile, alumni, company, and originalBody are required" },
        { status: 400 }
      );
    }

    const drafts = await generateFollowUp(
      body.userProfile,
      body.alumni,
      body.company,
      body.originalBody
    );

    return NextResponse.json({ drafts });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate follow-up";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
