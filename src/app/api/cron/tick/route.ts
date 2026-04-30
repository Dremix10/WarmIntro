// Cron: every minute (vercel.json: "* * * * *")
//
// On each tick we do two things:
//
// 1) Planner — fire for users whose preferred-send-time matches *this minute*
//    (±1 min for cron drift), plus anyone with a recent planner_nudge signal.
//    Most ticks process 0–1 users because send times are spread across the day.
//
// 2) Watcher — process the next bucket of up to 50 gmail-connected users whose
//    last Watcher run is older than ~20 minutes (oldest first). Self-balancing:
//    at <1k users we cycle through everyone in ~21 min and idle for the rest;
//    at ≥1k users we run flat-out and the cycle stretches naturally (e.g. 1500
//    users → ~30-min cycle, 2000 → ~40-min cycle). No queue needed at this
//    scale — the 50-per-minute batch fits inside a 60s function because
//    Watcher is I/O-bound (Gmail history-id check + optional Claude classify
//    only when there are actual new messages).
//
// Cost guards already baked into runWatcher (see services/agents/watcher.ts):
//   - sinceTimestamp uses agent_runs.started_at from the previous run, so we
//     only fetch messages newer than the last poll — no re-classify of old mail.
//   - If pollInbox returns 0 messages, the loop exits without any Claude call.
//
// Future scale-out path (when we cross ~2k users or want sub-40-min freshness):
//   replace `dispatchWatcher` / `dispatchPlanner` in services/queue/dispatch.ts
//   with `qstash.publishJSON(...)` calls. The tick code does not change.

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { dispatchPlanner, dispatchWatcher } from "@/services/queue/dispatch";

export const runtime = "nodejs";
export const maxDuration = 60;

const TICK_WINDOW_MIN = 1;          // matches users whose send_time is within ±1 min of now
const WATCHER_BATCH_SIZE = 50;      // max gmail polls dispatched per tick
const WATCHER_CYCLE_MIN = 20;       // each gmail-connected user gets re-polled once per ~20 min
const PLANNER_DEDUP_MIN = 30;       // don't fire planner twice within 30 min for the same user

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
  const nowMs = now.getTime();

  // ---------- 1) PLANNER dispatch ----------

  // Users with completed onboarding (target_firms is the gate). Trust rows can
  // outlive a profile after a crashed signup; calling the planner for them just
  // emits noisy profile_not_found errors.
  const { data: completeProfiles } = await admin
    .from("profiles")
    .select("id")
    .not("target_firms", "is", null);
  const completeIds = new Set((completeProfiles ?? []).map((p) => p.id));

  const { data: rawTrustRows } = await admin
    .from("trust_levels")
    .select("user_id, preferred_send_time, preferred_timezone, tomorrow_override, daily_batch_size");
  const trustRows = (rawTrustRows ?? []).filter((t) => completeIds.has(t.user_id));

  // Pending planner_nudge signals from the last hour (replies waiting on a
  // response, etc.) — these get fired regardless of send-time match.
  const { data: recentNudges } = await admin
    .from("signals")
    .select("user_id")
    .eq("signal_type", "planner_nudge")
    .gte("occurred_at", new Date(nowMs - 60 * 60 * 1000).toISOString());
  const nudgedIds = new Set(
    (recentNudges ?? [])
      .map((r) => r.user_id)
      .filter((id): id is string => typeof id === "string" && completeIds.has(id))
  );

  // Dedup: skip users who already had a planner run in the last 30 min so cron
  // drift can't double-fire the same user when their send-time straddles two
  // adjacent ticks.
  const { data: recentPlannerRuns } = await admin
    .from("agent_runs")
    .select("user_id")
    .eq("agent", "planner")
    .gte("started_at", new Date(nowMs - PLANNER_DEDUP_MIN * 60_000).toISOString());
  const recentPlannerSet = new Set(
    (recentPlannerRuns ?? [])
      .map((r) => r.user_id)
      .filter((id): id is string => Boolean(id))
  );

  const plannerTriggered: Array<{ userId: string; reason: string; batchSize: number }> = [];

  for (const t of trustRows) {
    if (recentPlannerSet.has(t.user_id)) continue;
    const override = t.tomorrow_override as { sendTime?: string; skipDay?: boolean } | null;
    if (override?.skipDay) continue;
    const sendTime = override?.sendTime ?? t.preferred_send_time ?? "08:23";
    const userMin = minutesIntoDay(now, t.preferred_timezone ?? "America/New_York");
    const targetMin = parseHHMM(sendTime);
    const withinWindow = Math.abs(userMin - targetMin) < TICK_WINDOW_MIN;

    if (withinWindow || nudgedIds.has(t.user_id)) {
      // Daily batch size is clamped at 5 because a single Planner pass already
      // pushes Researcher + Correspondent + Critic across multiple Claude calls
      // per banker. Overflow gets picked up by the next tick.
      const batchSize = Math.min((t as { daily_batch_size?: number }).daily_batch_size ?? 5, 5);
      plannerTriggered.push({
        userId: t.user_id,
        reason: withinWindow ? "send_time" : "nudge",
        batchSize,
      });
    }
  }

  // Run planners in parallel. Most ticks have 0–1 users, but if multiple users
  // share a send-time we don't want them serialized.
  const plannerSettled = await Promise.allSettled(
    plannerTriggered.map((t) =>
      dispatchPlanner({
        userId: t.userId,
        triggeredBy: t.reason === "nudge" ? "event" : "cron",
        maxCandidates: t.batchSize,
      })
    )
  );

  const plannerResults = plannerSettled.map((r, i) => ({
    userId: plannerTriggered[i].userId,
    reason: plannerTriggered[i].reason,
    out: r.status === "fulfilled" ? r.value : null,
    err: r.status === "rejected" ? String(r.reason) : undefined,
  }));

  // ---------- 2) WATCHER dispatch ----------

  // Candidate users: gmail-connected.
  const { data: gmailUsers } = await admin
    .from("profiles")
    .select("id")
    .not("gmail_refresh_token_encrypted", "is", null);

  // Recent watcher runs in the last cycle window. Anyone NOT in this set has a
  // last run >WATCHER_CYCLE_MIN ago (or never) → they're due. We fetch a
  // slightly-bigger window (cycle + 5 min slack) so the ordering is stable
  // across cron drift.
  const cycleSlackMs = (WATCHER_CYCLE_MIN + 5) * 60_000;
  const { data: recentWatcherRuns } = await admin
    .from("agent_runs")
    .select("user_id, started_at")
    .eq("agent", "watcher")
    .gte("started_at", new Date(nowMs - cycleSlackMs).toISOString())
    .order("started_at", { ascending: false });

  const lastRunByUser = new Map<string, number>();
  for (const r of recentWatcherRuns ?? []) {
    if (!r.user_id) continue;
    if (!lastRunByUser.has(r.user_id)) {
      lastRunByUser.set(r.user_id, new Date(r.started_at).getTime());
    }
  }

  const cutoff = nowMs - WATCHER_CYCLE_MIN * 60_000;
  const dueUsers = (gmailUsers ?? [])
    .map((u) => ({ id: u.id, lastRun: lastRunByUser.get(u.id) }))
    .filter((u) => u.lastRun === undefined || u.lastRun < cutoff)
    .sort((a, b) => {
      // never-polled (or polled outside the lookback) first; then oldest-first
      if (a.lastRun === undefined && b.lastRun === undefined) return 0;
      if (a.lastRun === undefined) return -1;
      if (b.lastRun === undefined) return 1;
      return a.lastRun - b.lastRun;
    })
    .slice(0, WATCHER_BATCH_SIZE);

  // Parallel dispatch. Watcher is I/O-bound (Gmail history-id check + optional
  // Claude classify) so 50 in-flight async calls fit comfortably in a 60s
  // function and ~1 GB memory. The Anthropic side typically sees only a handful
  // of concurrent classify calls because most users have no new messages.
  const watcherSettled = await Promise.allSettled(
    dueUsers.map((u) => dispatchWatcher({ userId: u.id }))
  );

  const watcherResults = watcherSettled.map((r, i) => ({
    userId: dueUsers[i].id,
    out: r.status === "fulfilled" ? r.value : null,
    err: r.status === "rejected" ? String(r.reason) : undefined,
  }));

  return NextResponse.json({
    plannerTriggered: plannerTriggered.length,
    plannerRuns: plannerResults,
    watcherDue: dueUsers.length,
    watcherRuns: watcherResults,
    gmailConnectedTotal: (gmailUsers ?? []).length,
  });
}
