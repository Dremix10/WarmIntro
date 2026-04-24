// POST /api/planner/run-now — user-triggered immediate Planner invocation.
// Used after onboarding (to fill the queue immediately) or from /today ("Run Alma now" button).
// Cron crons still keep running on schedule; this is a user-initiated boost.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { runPlanner } from "@/services/agents/planner";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const result = await runPlanner({ userId: ctx.user.id, triggeredBy: "user_command" });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
