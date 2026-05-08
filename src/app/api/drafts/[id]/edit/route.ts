// POST /api/drafts/[id]/edit — user edits draft body. Logs a `draft_edited`
// signal and, on the FIRST edit, snapshots the AI-authored body into
// pre_edit_ai_body so we can learn from "AI wrote X, user shipped Y" diffs.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { logSignal } from "@/services/signals/log";
import { ensureGmailDraft } from "@/services/gmail/sync-draft";
import { sanitizeEmailSubject } from "@/services/guardrails";
import type { Database } from "@/lib/database.types";

type DraftUpdate = Database["public"]["Tables"]["drafts"]["Update"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { subject, body } = (await request.json()) as { subject?: string; body?: string };
  if (!body) return NextResponse.json({ error: "missing_body" }, { status: 400 });
  const cleanedSubject = sanitizeEmailSubject(subject ?? "");

  const { data: draft } = await ctx.supabase
    .from("drafts")
    .select("id, user_id, banker_id, type, status, body, subject, pre_edit_ai_body")
    .eq("id", id)
    .single();
  if (!draft || draft.user_id !== ctx.user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const subjectChanged = cleanedSubject !== (draft.subject ?? "");
  const bodyChanged = body !== draft.body;
  const charsBefore = (draft.body ?? "").length;
  const charsAfter = body.length;

  const update: DraftUpdate = {
    subject: cleanedSubject,
    body,
    user_edited_body: body,
    status: "approved",
    updated_at: new Date().toISOString(),
  };
  if (!draft.pre_edit_ai_body) update.pre_edit_ai_body = draft.body;

  const { data: updated, error: updateError } = await ctx.supabase
    .from("drafts")
    .update(update)
    .eq("id", id)
    .select("id, subject, body, status, updated_at")
    .single();
  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message ?? "edit_update_failed" },
      { status: 500 },
    );
  }

  await logSignal({
    userId: ctx.user.id,
    bankerId: draft.banker_id ?? undefined,
    draftId: id,
    agent: "planner",
    signalType: "draft_edited",
    metadata: {
      type: draft.type,
      fromStatus: draft.status,
      hadPriorEdit: Boolean(draft.pre_edit_ai_body),
      bodyChanged,
      subjectChanged,
      charsBefore,
      charsAfter,
      charDelta: charsAfter - charsBefore,
    },
  });

  // Push the edited body to Gmail Drafts so the two surfaces stay in
  // sync. ensureGmailDraft uses PUT on the existing gmail_draft_id
  // when present, so the user sees the updated content in place.
  try {
    await ensureGmailDraft(id);
  } catch (err) {
    console.warn(`[edit] ensureGmailDraft failed for ${id}`, err);
  }

  return NextResponse.json({
    ok: true,
    subject: updated.subject || null,
    body: updated.body,
    status: updated.status,
    updatedAt: updated.updated_at,
  });
}
