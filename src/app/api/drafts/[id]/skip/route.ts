// POST /api/drafts/[id]/skip — user skips this draft, no send

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: draft } = await ctx.supabase.from("drafts").select("id, user_id").eq("id", id).single();
  if (!draft || draft.user_id !== ctx.user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await ctx.supabase.from("drafts").update({ status: "skipped", updated_at: new Date().toISOString() }).eq("id", id);
  return NextResponse.json({ ok: true });
}
