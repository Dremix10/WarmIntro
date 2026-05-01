// POST /api/admin/architect/run — fire the Architect on demand from
// /admin so the user can get a fresh digest right after a testing
// session instead of waiting until tomorrow's 16:00 UTC cron.
//
// Costs ~$0.05 in Anthropic credits per run (one Opus call). Logs a
// signal + sends Telegram digest the same way the cron path does.
// Returns the full structured report so the admin UI can render it
// inline without round-tripping back to the signals table.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { runArchitect } from "@/services/agents/architect";
import { restSelect, eq } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "dc118@rice.edu,evangelos_paraskeva@brown.edu")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(ctx.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { lookbackHours?: number };
  const lookbackHours = typeof body?.lookbackHours === "number" && body.lookbackHours > 0 && body.lookbackHours <= 168
    ? body.lookbackHours
    : 24;

  const result = await runArchitect({ lookbackHours });

  // Pull the full report straight from the signals row Architect just
  // wrote — saves the UI a second round-trip.
  const sigs = await restSelect("signals", {
    select: "metadata, occurred_at",
    filters: { agent: eq("architect"), signal_type: eq("architect_review_completed") },
    order: "occurred_at.desc",
    limit: 1,
  });
  const sig = sigs[0] ?? null;
  const report = (sig?.metadata as { report?: unknown } | null)?.report ?? null;

  return NextResponse.json({
    ok: true,
    summary: result,
    report,
    generatedAt: sig?.occurred_at ?? null,
  });
}
