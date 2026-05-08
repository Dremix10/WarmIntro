// ensureGmailDraft — given a draft row, push it to the user's Gmail
// Drafts folder if not already there, and store the Gmail draft ID.
//
// Runs in two contexts:
// 1. Planner end-of-pipeline (any trust level) — every approved draft
//    gets a Gmail-side mirror so the user can preview in Gmail.
// 2. /api/drafts/[id]/approve override path — user clicked "Send anyway",
//    same need to reflect into Gmail.
//
// Idempotent: if gmail_draft_id is already populated, this is a no-op.
// Updates the existing Gmail draft if the body changed (the user-edit
// path) so Gmail stays in sync with our DB.

import { saveToDrafts } from "./send";
import { getGmailThreadHeadersForConnection } from "./thread-context";
import { getAdminClient } from "@/lib/supabase-admin";

export async function ensureGmailDraft(draftId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data: draft } = await admin
    .from("drafts")
    .select("id, user_id, banker_id, connection_id, type, subject, body, gmail_draft_id, sent_at, status")
    .eq("id", draftId)
    .single();
  if (!draft || draft.sent_at) return null;
  if (draft.status !== "approved") return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("gmail_email")
    .eq("id", draft.user_id)
    .single();
  if (!profile?.gmail_email) return null;

  const { data: banker } = await admin
    .from("bankers")
    .select("email")
    .eq("id", draft.banker_id ?? "")
    .maybeSingle();
  if (!banker?.email) return null;

  const threadHeaders = draft.type === "cold"
    ? {}
    : await getGmailThreadHeadersForConnection({
        userId: draft.user_id,
        connectionId: draft.connection_id,
        bankerId: draft.banker_id,
      });

  // If we already saved a Gmail draft, update it in place (PUT) rather
  // than creating a duplicate. Keeps Gmail Drafts list clean across
  // user-edit-then-resave cycles.
  const result = await saveToDrafts({
    userId: draft.user_id,
    fromEmail: profile.gmail_email,
    toEmail: banker.email,
    subject: draft.subject ?? "",
    body: draft.body,
    existingDraftId: draft.gmail_draft_id ?? undefined,
    ...threadHeaders,
  });
  if (!result) return null;

  if (result.draftId !== draft.gmail_draft_id) {
    await admin
      .from("drafts")
      .update({ gmail_draft_id: result.draftId, updated_at: new Date().toISOString() })
      .eq("id", draftId);
  }
  return result.draftId;
}
