// POST /api/drafts/[id]/edit — user edits draft body

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { subject, body } = (await request.json()) as { subject?: string; body?: string };
  if (!body) return NextResponse.json({ error: "missing_body" }, { status: 400 });

  const { data: draft } = await ctx.supabase.from("drafts").select("id, user_id").eq("id", id).single();
  if (!draft || draft.user_id !== ctx.user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await ctx.supabase
    .from("drafts")
    .update({ subject, user_edited_body: body, body, status: "approved", updated_at: new Date().toISOString() })
    .eq("id", id);
  return NextResponse.json({ ok: true });
}
