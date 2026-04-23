// Cron: every 15 minutes
// For each active user whose preferred_send_time has arrived OR has pending planner nudges,
// run the Planner. Also dispatches Watcher to catch up on inbox polling.

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { runPlanner } from "@/services/agents/planner";
import { runWatcher } from "@/services/agents/watcher";

export const runtime = "nodejs";
export const maxDuration = 60;

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.ALMA_CRON_SECRET;
  if (!secret) return true; // dev-mode: allow
  const auth = req.headers.get("Authorization");
  return auth === `Bearer ${secret}`;
}

function minutesIntoDay(date: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    return hour * 60 + minute;
  } catch {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }
}

function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((p) => parseInt(p, 10));
  return (h || 0) * 60 + (m || 0);
}

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return handleTick();
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return handleTick();
}

async function handleTick() {
  const admin = getAdminClient();
  const now = new Date();
  const TICK_WINDOW_MIN = 15;

  // Get all connected users with preferred times
  const { data: trustRows } = await admin
    .from("trust_levels")
    .select("user_id, preferred_send_time, preferred_timezone, tomorrow_override");

  // Also include users who have outstanding planner nudges (reply drafts to do) regardless of time
  const { data: recentNudges } = await admin
    .from("signals")
    .select("user_id")
    .eq("signal_type", "planner_nudge")
    .gte("occurred_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

  const nudgedUserIds = new Set((recentNudges ?? []).map((r) => r.user_id).filter(Boolean) as string[]);

  const triggered: Array<{ userId: string; reason: string }> = [];

  for (const t of trustRows ?? []) {
    const override = t.tomorrow_override as { sendTime?: string; skipDay?: boolean } | null;
    if (override?.skipDay) continue;
    const sendTime = override?.sendTime ?? t.preferred_send_time ?? "07:00";
    const nowMin = minutesIntoDay(now, t.preferred_timezone ?? "America/New_York");
    const targetMin = parseHHMM(sendTime);
    const withinWindow = Math.abs(nowMin - targetMin) < TICK_WINDOW_MIN;

    if (withinWindow || nudgedUserIds.has(t.user_id)) {
      triggered.push({ userId: t.user_id, reason: withinWindow ? "send_time" : "nudge" });
    }
  }

  // Run Planner for each triggered user (serial; 15 min window is generous)
  const results: Array<{ userId: string; reason: string; out: unknown; err?: string }> = [];
  for (const t of triggered) {
    try {
      const out = await runPlanner({ userId: t.userId, triggeredBy: t.reason === "nudge" ? "event" : "cron" });
      results.push({ userId: t.userId, reason: t.reason, out });
    } catch (err) {
      results.push({ userId: t.userId, reason: t.reason, out: null, err: String(err) });
    }
  }

  // Also run Watcher for each user every tick
  const { data: allActiveUsers } = await admin
    .from("profiles")
    .select("id")
    .not("gmail_refresh_token_encrypted", "is", null);

  const watcherResults: Array<{ userId: string; out: unknown; err?: string }> = [];
  for (const u of (allActiveUsers ?? []).slice(0, 50)) {
    try {
      const out = await runWatcher({ userId: u.id });
      watcherResults.push({ userId: u.id, out });
    } catch (err) {
      watcherResults.push({ userId: u.id, out: null, err: String(err) });
    }
  }

  return NextResponse.json({ plannerTriggered: triggered.length, watcherRuns: watcherResults.length, planners: results, watchers: watcherResults });
}
