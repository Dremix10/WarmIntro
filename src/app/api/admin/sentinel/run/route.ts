// POST /api/admin/sentinel/run — fire Sentinel on demand from /admin so the
// admin can re-check things between cron firings. Useful right after a wave
// of welcomes goes out and the admin wants to know within minutes whether
// any got eaten by Defender, instead of waiting for the next 15:00 UTC cron.
//
// No external API costs — Sentinel is pure DB joins + Hunter API balance
// check + Telegram. Cheap to fire.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/services/auth/admin";
import { runSentinel } from "@/services/agents/sentinel";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(ctx.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const result = await runSentinel();
  return NextResponse.json({ ok: true, result });
}
