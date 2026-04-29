// POST /api/planner/run-now — user-triggered immediate Planner invocation.
// Used after onboarding (to fill the queue immediately) or from /today ("Run Alma now" button).
// Cron crons still keep running on schedule; this is a user-initiated boost.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { runPlanner } from "@/services/agents/planner";
import { sendTelegram } from "@/lib/telegram";
import { logSignal } from "@/services/signals/log";

export const runtime = "nodejs";
export const maxDuration = 60;

// If a run takes longer than this, we log + alert even on success — slow
// runs are a UX bomb (user sees a spinner for 50+ seconds and abandons).
const SLOW_THRESHOLD_MS = 45_000;

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const startedAt = Date.now();
  const userId = ctx.user.id;
  const userEmail = ctx.user.email ?? "(unknown email)";

  try {
    // Cap per-invocation work HARD to stay under Vercel's 60s function limit.
    // Each candidate is 2-3 Claude calls (Correspondent + Critic) × up to 3
    // iterations = up to ~30s per candidate. 1 candidate fits comfortably.
    // Cron jobs run with full 5-candidate budget since they have longer budget.
    const result = await runPlanner({
      userId,
      triggeredBy: "user_command",
      maxCandidates: 1,
    });
    const durationMs = Date.now() - startedAt;

    // Slow-run alert: succeeded but the user waited too long. We still want
    // to know — eventually we'll either make it faster or chunk it. Telegram
    // is awaited (not fire-and-forget) so we can capture delivery status in
    // the signal — fire-and-forget swallowed the only signal we'd have that
    // the alert never reached us. Latency cost is ~200-500ms, fine.
    if (durationMs > SLOW_THRESHOLD_MS) {
      const tgResult = await sendTelegram(
        `🐢 Run Alma slow\n\nUser: ${userEmail}\nDuration: ${(durationMs / 1000).toFixed(1)}s (threshold ${SLOW_THRESHOLD_MS / 1000}s)\nResult: ${JSON.stringify(result).slice(0, 250)}`
      );
      await logSignal({
        userId,
        agent: "planner",
        signalType: "planner_run_slow",
        metadata: {
          durationMs,
          threshold: SLOW_THRESHOLD_MS,
          result: result as unknown as Record<string, unknown>,
          telegramSent: tgResult.sent,
          telegramReason: tgResult.reason ?? null,
        },
      });
    }

    return NextResponse.json({ ok: true, result, durationMs });
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack?.slice(0, 800) : undefined;

    // Hot alert: user waited, then it failed. Fire Telegram immediately —
    // don't wait for the 30-min Sentinel cron. Awaited so we can record
    // delivery status in the signal metadata for audit.
    const tgResult = await sendTelegram(
      `🔥 Run Alma FAILED\n\nUser: ${userEmail}\nDuration: ${(durationMs / 1000).toFixed(1)}s\nError: ${errMsg.slice(0, 300)}${errStack ? `\n\nStack:\n${errStack.slice(0, 500)}` : ""}`
    );

    // Log a structured signal so Sentinel sees it on the next sweep, AND
    // (critically) so we have an audit row independent of Telegram delivery.
    await logSignal({
      userId,
      agent: "planner",
      signalType: "planner_run_failed",
      metadata: {
        durationMs,
        error: errMsg.slice(0, 500),
        triggeredBy: "user_command",
        telegramSent: tgResult.sent,
        telegramReason: tgResult.reason ?? null,
      },
    });

    return NextResponse.json({ ok: false, error: errMsg, durationMs }, { status: 500 });
  }
}
