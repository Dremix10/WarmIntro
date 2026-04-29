// POST /api/drafts/[id]/approve — user approves a pending draft. Will be
// sent on next planner tick (Trust B/A) or via Auto-send (Trust C).
//
// Critic-override gate: if the latest critic_review for this draft has
// verdict="reject", we require an explicit { override: true } in the body.
// Without it we return 409 + the rejected claims, and the UI surfaces a
// "Send anyway" affordance. The override:true call writes drafts.critic_override
// = true and logs a critic_override signal so the audit trail is unambiguous.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { logSignal } from "@/services/signals/log";
import { ensureGmailDraft } from "@/services/gmail/sync-draft";

interface ApproveBody { override?: boolean }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = (await request.json().catch(() => ({}))) as ApproveBody;
  const override = payload.override === true;

  const { data: draft } = await ctx.supabase
    .from("drafts")
    .select("id, user_id, banker_id, type, status, fact_check")
    .eq("id", id)
    .single();
  if (!draft || draft.user_id !== ctx.user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Read the LATEST critic_review for this draft. If it rejected, we gate
  // the approve.
  const { data: latestReview } = await ctx.supabase
    .from("critic_reviews")
    .select("verdict, feedback, overall_score")
    .eq("draft_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const wasRejected = latestReview?.verdict === "reject" || latestReview?.verdict === "escalate_to_planner";

  if (wasRejected && !override) {
    return NextResponse.json(
      {
        error: "critic_rejected",
        message: "Critic flagged this draft. Re-call with override:true to send anyway.",
        criticVerdict: latestReview.verdict,
        criticFeedback: latestReview.feedback,
        criticScore: latestReview.overall_score,
        factCheck: draft.fact_check,
      },
      { status: 409 }
    );
  }

  await ctx.supabase
    .from("drafts")
    .update({
      status: "approved",
      critic_override: wasRejected ? true : false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (wasRejected) {
    await logSignal({
      userId: ctx.user.id,
      bankerId: draft.banker_id ?? undefined,
      draftId: id,
      agent: "planner",
      signalType: "critic_override",
      metadata: {
        type: draft.type,
        criticVerdict: latestReview.verdict,
        criticScore: latestReview.overall_score,
        criticFeedback: latestReview.feedback?.slice(0, 280) ?? null,
      },
    });
  }

  // Mirror to Gmail Drafts now that the row is approved. Best-effort —
  // failure here doesn't block the approve. /today still surfaces the
  // draft for manual action either way.
  try {
    await ensureGmailDraft(id);
  } catch (err) {
    console.warn(`[approve] ensureGmailDraft failed for ${id}`, err);
  }

  return NextResponse.json({ ok: true, criticOverride: wasRejected });
}
