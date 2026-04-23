// POST /api/drafts/[id]/stop — user vetoes a scheduled B-mode send during its preview window

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: draft } = await ctx.supabase.from("drafts").select("id, user_id").eq("id", id).single();
  if (!draft || draft.user_id !== ctx.user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await ctx.supabase
    .from("drafts")
    .update({ status: "skipped", scheduled_send_at: null, updated_at: new Date().toISOString() })
    .eq("id", id);

  // Increment stops count (auto-demote tracker)
  const { data: t } = await ctx.supabase.from("trust_levels").select("stops_count").eq("user_id", ctx.user.id).single();
  await ctx.supabase
    .from("trust_levels")
    .update({ stops_count: (t?.stops_count ?? 0) + 1 })
    .eq("user_id", ctx.user.id);

  return NextResponse.json({ ok: true });
}
