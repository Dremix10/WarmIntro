// POST /api/setup/profile — update extended IB profile (target firms/groups, story, warm hints)

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

interface SetupProfileRequest {
  targetFirms?: string[];
  targetGroups?: string[];
  warmHints?: string[];
  storyOneLiner?: string;
  name?: string;
  major?: string;
  graduationYear?: number;
}

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as SetupProfileRequest;

  const updates: Record<string, unknown> = {};
  if (body.targetFirms) updates.target_firms = body.targetFirms;
  if (body.targetGroups) updates.target_groups = body.targetGroups;
  if (body.warmHints) updates.warm_hints = body.warmHints;
  if (body.storyOneLiner !== undefined) updates.story_one_liner = body.storyOneLiner;
  if (body.name) updates.name = body.name;
  if (body.major) updates.major = body.major;
  if (body.graduationYear) updates.graduation_year = body.graduationYear;
  updates.updated_at = new Date().toISOString();

  await ctx.supabase.from("profiles").update(updates as never).eq("id", ctx.user.id);
  return NextResponse.json({ ok: true });
}
