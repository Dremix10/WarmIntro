// GET /api/agents/runs — recent agent runs for /agents transparency view

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function GET(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "30", 10));

  const { data: runs } = await ctx.supabase
    .from("agent_runs")
    .select("*")
    .or(`user_id.eq.${ctx.user.id},user_id.is.null`)
    .order("started_at", { ascending: false })
    .limit(limit);

  const { data: flywheel } = await ctx.supabase
    .from("flywheel_releases")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(5);

  return NextResponse.json({ runs: runs ?? [], flywheel: flywheel ?? [] });
}
