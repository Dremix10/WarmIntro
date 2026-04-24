// Cron: every 30 min — Sentinel monitoring (errors + credit balance + Telegram alerts)

import { NextResponse } from "next/server";
import { runSentinel } from "@/services/agents/sentinel";

export const runtime = "nodejs";
export const maxDuration = 60;

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.ALMA_CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("Authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runSentinel();
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runSentinel();
  return NextResponse.json(result);
}
