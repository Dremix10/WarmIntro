// Cron: daily — Architect runs the prompt-quality review of recent
// failures and posts a digest to Telegram. Runs at low cadence because
// it costs ~Opus tokens per run and we only need 1-2 reviews per week
// to drive prompt iteration. Daily lets us catch fast regressions.

import { NextResponse } from "next/server";
import { runArchitect } from "@/services/agents/architect";

export const runtime = "nodejs";
export const maxDuration = 60;

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.ALMA_CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("Authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runArchitect();
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runArchitect();
  return NextResponse.json(result);
}
