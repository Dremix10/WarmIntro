// POST /api/setup/profile — upsert extended IB profile (target firms/groups, story, warm hints)
// Uses UPSERT so it creates the profile row if missing (signup doesn't auto-create one).

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase-admin";

interface SetupProfileRequest {
  targetFirms?: string[];
  targetGroups?: string[];
  warmHints?: string[];
  storyOneLiner?: string;
  name?: string;
  major?: string;
  graduationYear?: number;
  university?: string;
  resumeText?: string;
}

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as SetupProfileRequest;

  // Admin client — avoids RLS issues on first-time insert, and we're already
  // authenticated (verified user id via getUser).
  const admin = getAdminClient();

  // Look up existing row. If none, we'll upsert with defaults; if exists, we'll merge.
  const { data: existing } = await admin
    .from("profiles")
    .select("name, major, graduation_year, university, resume_text")
    .eq("id", ctx.user.id)
    .maybeSingle();

  // Build the upsert payload. NOT NULL columns (name, major, graduation_year)
  // must have values — use body, existing, or safe defaults (from auth user metadata).
  const fallbackName = ctx.user.user_metadata?.full_name ?? ctx.user.email?.split("@")[0] ?? "Student";
  const fallbackMajor = "Undeclared";
  const fallbackGradYear = new Date().getFullYear() + 3;
  const fallbackUniversity =
    ctx.user.email?.endsWith("@brown.edu") ? "Brown University" : "Rice University";

  const payload: Record<string, unknown> = {
    id: ctx.user.id,
    email: ctx.user.email,
    name: body.name ?? existing?.name ?? fallbackName,
    major: body.major ?? existing?.major ?? fallbackMajor,
    graduation_year: body.graduationYear ?? existing?.graduation_year ?? fallbackGradYear,
    university: body.university ?? existing?.university ?? fallbackUniversity,
    updated_at: new Date().toISOString(),
  };

  if (body.targetFirms) payload.target_firms = body.targetFirms;
  if (body.targetGroups) payload.target_groups = body.targetGroups;
  if (body.warmHints) payload.warm_hints = body.warmHints;
  if (body.storyOneLiner !== undefined) payload.story_one_liner = body.storyOneLiner;
  if (body.resumeText !== undefined) payload.resume_text = body.resumeText;

  const { error } = await admin.from("profiles").upsert(payload as never, { onConflict: "id" });

  if (error) {
    console.error("[setup/profile] upsert failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Re-contextualization: if resume_text actually changed, the user's voice +
  // background context is stale on every pending draft. Wipe pending drafts so
  // the next Planner run regenerates from fresh context. (Sent drafts are kept
  // — we can't unsend, but their connections record still tracks the thread.)
  const oldResume = (existing?.resume_text as string | null) ?? "";
  const newResume = (body.resumeText ?? "").trim();
  const resumeChanged = newResume.length > 0 && newResume !== (oldResume ?? "").trim();
  let staleDraftsDropped = 0;
  if (resumeChanged) {
    // Drop dependent rows first (FKs)
    const { data: stale } = await admin
      .from("drafts")
      .select("id")
      .eq("user_id", ctx.user.id)
      .is("sent_at", null)
      .in("status", ["pending_critic", "needs_revision", "approved"]);
    const ids = (stale ?? []).map((r) => r.id);
    if (ids.length > 0) {
      await admin.from("critic_reviews").delete().in("draft_id", ids);
      await admin.from("signals").delete().in("draft_id", ids);
      await admin.from("drafts").delete().in("id", ids);
      staleDraftsDropped = ids.length;
    }
  }

  return NextResponse.json({ ok: true, resumeChanged, staleDraftsDropped });
}
