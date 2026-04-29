// POST /api/drafts/[id]/skip — user skips this draft, no send.
// Also deletes the corresponding Gmail draft (if any) to keep both
// surfaces in sync.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { deleteGmailDraft } from "@/services/gmail/send";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: draft } = await ctx.supabase
    .from("drafts")
    .select("id, user_id, gmail_draft_id")
    .eq("id", id)
    .single();
  if (!draft || draft.user_id !== ctx.user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (draft.gmail_draft_id) {
    try {
      await deleteGmailDraft({ userId: ctx.user.id, gmailDraftId: draft.gmail_draft_id });
    } catch (err) {
      console.warn(`[skip] deleteGmailDraft failed for ${id}`, err);
    }
  }

  await ctx.supabase
    .from("drafts")
    .update({ status: "skipped", gmail_draft_id: null, updated_at: new Date().toISOString() })
    .eq("id", id);
  return NextResponse.json({ ok: true });
}
