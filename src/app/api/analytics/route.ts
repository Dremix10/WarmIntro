import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

// Simple admin analytics — protected by a secret query param
export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  // Only you can access this
  if (secret !== process.env.ANALYTICS_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient();

  const { data: events } = await supabase
    .from("events")
    .select("event, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!events) {
    return NextResponse.json({ error: "No data" }, { status: 500 });
  }

  // Aggregate by event type
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.event] = (counts[e.event] ?? 0) + 1;
  }

  // Today's counts
  const today = new Date().toISOString().slice(0, 10);
  const todayCounts: Record<string, number> = {};
  for (const e of events) {
    if (e.created_at.startsWith(today)) {
      todayCounts[e.event] = (todayCounts[e.event] ?? 0) + 1;
    }
  }

  // User count
  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    totalUsers: userCount ?? 0,
    allTime: counts,
    today: todayCounts,
    recentEvents: events.slice(0, 20),
  });
}
