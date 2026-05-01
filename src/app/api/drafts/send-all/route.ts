// POST /api/drafts/send-all — sends every approved-not-sent draft for
// the current user via Gmail. Returns per-draft outcome so the UI can
// surface partial results. Capped at 5 drafts per call so a long Gmail
// run doesn't blow the 60s function limit. Hit the button again to
// keep going.
//
// Each draft routes through outreach.sendDraft so the CAS guard,
// connection upsert, signal log, and error revert match the single-send
// path exactly. Result type is extended with a "skipped" outcome for
// drafts that were already in 'sending' state (planner racing the user).

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { sendDraft } from "@/services/outreach/sendDraft";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_CAP = 5;

interface PerDraftResult {
  draftId: string;
  banker: string;
  outcome: "sent" | "skipped" | "failed";
  error?: string;
}

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = getAdminClient();

  // Quick gate: if Gmail isn't connected, fail fast before iterating.
  // The helper enforces this per-draft too, but bailing here saves five
  // round-trips on the most common misconfig.
  const { data: profile } = await admin
    .from("profiles")
    .select("gmail_email")
    .eq("id", ctx.user.id)
    .maybeSingle();
  if (!profile?.gmail_email) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
  }

  const { data: drafts } = await admin
    .from("drafts")
    .select("id")
    .eq("user_id", ctx.user.id)
    .eq("status", "approved")
    .is("sent_at", null)
    .limit(BATCH_CAP);

  const queue = drafts ?? [];
  const results: PerDraftResult[] = [];

  for (const d of queue) {
    const r = await sendDraft({ userId: ctx.user.id, draftId: d.id, via: "send_all" });
    if (r.ok) {
      if (r.status === "sent") {
        results.push({ draftId: d.id, banker: r.bankerName, outcome: "sent" });
      } else {
        // skipped_already_sending — count as skipped, not error.
        results.push({ draftId: d.id, banker: r.bankerName, outcome: "skipped" });
      }
    } else {
      results.push({
        draftId: d.id,
        banker: "bankerName" in r ? r.bankerName : "?",
        outcome: "failed",
        error: r.error,
      });
    }
  }

  const sent = results.filter((r) => r.outcome === "sent").length;
  const skipped = results.filter((r) => r.outcome === "skipped").length;
  const failed = results.filter((r) => r.outcome === "failed").length;
  return NextResponse.json({ ok: true, sent, skipped, failed, results });
}
