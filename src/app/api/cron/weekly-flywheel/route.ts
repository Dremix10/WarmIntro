// Cron: weekly Sunday 11 PM UTC — flywheel batch + Curator weekly quality audit

import { NextResponse } from "next/server";
import { runWeeklyFlywheel } from "@/services/signals/aggregate";
import { runCurator } from "@/services/agents/curator";

export const runtime = "nodejs";
export const maxDuration = 300;

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.ALMA_CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("Authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return handle();
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return handle();
}

async function handle() {
  const [flywheel, curator] = await Promise.all([runWeeklyFlywheel(), runCurator("weekly")]);
  return NextResponse.json({ flywheel, curator });
}
