// GET /api/today — returns drafts + trust level + recent activity for the authenticated user

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function GET(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: drafts } = await ctx.supabase
    .from("drafts")
    .select("id, banker_id, type, subject, body, status, iteration_count, scheduled_send_at, created_at, fact_check, critic_override, bankers(name, title, email, linkedin_url, firm_id, firms(name))")
    .eq("user_id", ctx.user.id)
    .in("status", ["pending_critic", "needs_revision", "approved", "rejected_unresolvable"])
    .is("sent_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: trust } = await ctx.supabase
    .from("trust_levels")
    .select("*")
    .eq("user_id", ctx.user.id)
    .maybeSingle();

  const { data: recent } = await ctx.supabase
    .from("signals")
    .select("signal_type, metadata, occurred_at")
    .eq("user_id", ctx.user.id)
    .order("occurred_at", { ascending: false })
    .limit(15);

  const { data: pipeline } = await ctx.supabase
    .from("connections")
    .select("stage")
    .eq("user_id", ctx.user.id);

  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("target_firms, gmail_connected_at")
    .eq("id", ctx.user.id)
    .maybeSingle();

  const stageCounts: Record<string, number> = {};
  for (const c of pipeline ?? []) stageCounts[c.stage] = (stageCounts[c.stage] ?? 0) + 1;

  const needsSetup = !profile?.target_firms || profile.target_firms.length === 0;
  const needsGmail = !profile?.gmail_connected_at;

  return NextResponse.json({
    drafts: drafts ?? [],
    trust: trust ?? null,
    recent: recent ?? [],
    stageCounts,
    needsSetup,
    needsGmail,
  });
}
