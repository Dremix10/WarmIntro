// POST /api/admin/curator/run — fire the Curator on demand from /admin so
// the admin can grow the banker pool without waiting for daily cron.
//
// Use case: a tester exhausted the same-school candidates at their target
// firms (Rice user, 4 Rice bankers with email at the 5 target firms,
// already touched all 4) — Researcher falls back to cross-school which
// reads weak. Triggering the Curator's "daily" mode runs seedFirmsAndGroups
// + enrichmentBackfill (Hunter emails) + discoverNewBankers (Serper-
// driven). Hunter calls cost real credits; cap to one run at a time via
// the agent_runs row.
//
// Returns the CuratorOutput so the admin UI can show what changed.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isAdmin } from "@/services/auth/admin";
import { runCurator, type CuratorMode } from "@/services/agents/curator";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(ctx.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { mode?: CuratorMode };
  const mode: CuratorMode = body.mode === "weekly" || body.mode === "hot" || body.mode === "seed"
    ? body.mode
    : "daily"; // default daily — covers seed + enrichment + discovery

  const result = await runCurator(mode);
  return NextResponse.json({ ok: true, result });
}
