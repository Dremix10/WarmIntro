import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");

  if (secret !== process.env.ANALYTICS_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createServerClient();

  const { data: events } = await supabase
    .from("events")
    .select("event, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (!events) {
    return NextResponse.json({ error: "No data" }, { status: 500 });
  }

  const counts: Record<string, number> = {};
  const today = new Date().toISOString().slice(0, 10);
  const todayCounts: Record<string, number> = {};

  for (const e of events) {
    counts[e.event] = (counts[e.event] ?? 0) + 1;
    if (e.created_at.startsWith(today)) {
      todayCounts[e.event] = (todayCounts[e.event] ?? 0) + 1;
    }
  }

  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: pilotCount } = await supabase
    .from("pilot_signups")
    .select("*", { count: "exact", head: true });

  const { count: demoSessionCount } = await supabase
    .from("demo_sessions")
    .select("*", { count: "exact", head: true });

  // Demo funnel
  const demoFunnel = {
    views: counts["demo_view"] ?? 0,
    parseStarted: counts["demo_parse_start"] ?? 0,
    parsed: counts["demo_parsed"] ?? 0,
    companiesFound: counts["demo_companies_found"] ?? 0,
    alumniFound: counts["demo_alumni_found"] ?? 0,
    resultsShown: counts["demo_results_shown"] ?? 0,
    linkedInClicks: counts["demo_linkedin_click"] ?? 0,
    messagesCopied: counts["demo_copy_message"] ?? 0,
    pilotSignups: counts["demo_pilot_signup"] ?? 0,
    errors: counts["demo_error"] ?? 0,
  };

  return NextResponse.json({
    totalUsers: userCount ?? 0,
    pilotSignups: pilotCount ?? 0,
    demoSessions: demoSessionCount ?? 0,
    demoFunnel,
    allTime: counts,
    today: todayCounts,
    recentEvents: events.slice(0, 30),
  });
}
