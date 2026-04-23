// Cron: every 30 minutes — Curator hot tasks (enrichment backfill, new banker discovery)

import { NextResponse } from "next/server";
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
  const result = await runCurator("hot");
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runCurator("hot");
  return NextResponse.json(result);
}
