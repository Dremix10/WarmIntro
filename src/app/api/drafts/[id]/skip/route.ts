// POST /api/drafts/[id]/skip — user skips this draft.
//
// Body (all optional):
//   reason: string       — what was wrong with the draft. Saved as
//                          drafts.skip_reason and emitted as a signal so
//                          we can mine skip patterns for prompt iteration.
//   regenerate: boolean  — if true, after marking the old draft skipped,
//                          immediately fire a fresh Correspondent + Critic
//                          run for the same banker, threading the user's
//                          reason in as cumulative critic feedback. The
//                          response includes the new draft id.
//
// Also deletes the corresponding Gmail draft (if any) so both surfaces
// stay in sync.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { deleteGmailDraft } from "@/services/gmail/send";
import { runCorrespondent } from "@/services/agents/correspondent";
import { runCritic } from "@/services/agents/critic";
import { logSignal } from "@/services/signals/log";
import type { DraftType } from "@/shared/ib-types";

export const runtime = "nodejs";

interface SkipBody {
  reason?: string;
  regenerate?: boolean;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as SkipBody;
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  const regenerate = body?.regenerate === true;

  const { data: draft } = await ctx.supabase
    .from("drafts")
    .select("id, user_id, banker_id, connection_id, type, subject, body, gmail_draft_id, sent_at, status")
    .eq("id", id)
    .single();
  if (!draft || draft.user_id !== ctx.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Guard: don't let a Skip click overwrite a draft that's already been
  // sent. dc118 hit this — sent a draft via override, then the lingering
  // /today UI element (stale cache) still showed Skip. Click set status
  // to "skipped" while sent_at remained set, leaving an inconsistent
  // row that confused the connections-based exclusion logic.
  if (draft.sent_at) {
    return NextResponse.json({
      ok: true,
      alreadySent: true,
      sentAt: draft.sent_at,
    });
  }

  if (draft.gmail_draft_id) {
    try {
      await deleteGmailDraft({ userId: ctx.user.id, gmailDraftId: draft.gmail_draft_id });
    } catch (err) {
      console.warn(`[skip] deleteGmailDraft failed for ${id}`, err);
    }
  }

  await ctx.supabase
    .from("drafts")
    .update({
      status: "skipped",
      gmail_draft_id: null,
      skip_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  await logSignal({
    userId: ctx.user.id,
    bankerId: draft.banker_id ?? undefined,
    draftId: id,
    agent: "planner",
    signalType: "draft_skipped",
    metadata: { draft_id: id, banker_id: draft.banker_id, reason: reason || null, regenerated: regenerate },
  });

  if (!regenerate) {
    return NextResponse.json({ ok: true });
  }

  if (!draft.banker_id) {
    // Defensive: shouldn't happen — skip routes only fire on real drafts
    // tied to a banker — but the generated types allow null so guard it.
    return NextResponse.json({ ok: true, regenerated: false, reason: "no_banker" });
  }

  // Regenerate path: pull every prior Critic verdict on the skipped draft
  // and append the user's reason as one more verdict, then re-run the
  // Correspondent → Critic loop once. The unique-active-draft index is
  // satisfied because the old row is now `skipped`.
  const { data: priorReviews } = await ctx.supabase
    .from("critic_reviews")
    .select("feedback, created_at")
    .eq("draft_id", id)
    .order("created_at", { ascending: true });

  const priorFeedback = (priorReviews ?? [])
    .map((r) => (typeof r.feedback === "string" ? r.feedback : ""))
    .filter(Boolean);

  const revisionFeedbackHistory = reason
    ? [...priorFeedback, `USER SKIPPED THIS DRAFT. Treat their reason as the highest-priority verdict, more important than any prior Critic feedback: ${reason}`]
    : priorFeedback;
  revisionFeedbackHistory.push(
    `PREVIOUS SKIPPED DRAFT TO AVOID REPEATING:\nSubject: ${draft.subject ?? "(none)"}\nBody:\n${(draft.body ?? "").slice(0, 1200)}\n\nThe replacement must be materially different. Do not reuse the same opener, central hook, or wording pattern.`
  );

  try {
    const fresh = await runCorrespondent({
      userId: ctx.user.id,
      type: draft.type as DraftType,
      bankerId: draft.banker_id,
      connectionId: draft.connection_id ?? undefined,
      revisionFeedbackHistory: revisionFeedbackHistory.length > 0 ? revisionFeedbackHistory : undefined,
      iteration: 0,
    });

    if (!fresh.draftId) {
      // Researcher had nothing fresh to anchor on, or the model returned
      // unusable output. Surface the failure so the UI doesn't hang.
      return NextResponse.json({
        ok: true,
        regenerated: false,
        reason: fresh.rejectedForNoAnchor ? "no_anchor" : "regenerate_failed",
      });
    }

    const review = await runCritic({ draftId: fresh.draftId });

    return NextResponse.json({
      ok: true,
      regenerated: true,
      newDraftId: fresh.draftId,
      criticVerdict: review.verdict,
      criticScore: review.overallScore ?? null,
    });
  } catch (err) {
    return NextResponse.json({
      ok: true,
      regenerated: false,
      reason: "regenerate_error",
      error: String(err).slice(0, 300),
    });
  }
}
