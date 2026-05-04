// Send-a-draft orchestrator. The single entry point used by:
//   - /api/drafts/[id]/send         (button, single send)
//   - /api/drafts/send-all          (batch loop)
//   - /api/drafts/[id]/mark_sent    (user copies + sends elsewhere)
//   - agents/planner.ts             (autopilot, Trust A and Trust B post-window)
//
// Full design (Option C+ with Choice 1 guards) lives in
// docs/refactor-plan.md (D6). Highlights:
//
//   1. CAS on drafts.status before Gmail. A two-step UPDATE atomically
//      claims a row that's currently 'approved', falling back to
//      reclaiming a 'sending' row whose send_started_at is older than
//      5 minutes. If neither claim succeeds, return early.
//
//   2. Gmail-failure revert. On gmail_rejected / no_access_token /
//      exception we explicitly write status back to 'approved' so the
//      user can retry; otherwise the row sits in 'sending' until the
//      stale window opens.
//
//   3. DB-after-Gmail failure (the dual-write hazard). If Gmail returns
//      200 but the post-Gmail DB write throws, we log loud and leave
//      the row in 'sending' so the next claim picks it up. We surface
//      a distinct 'gmail_succeeded_db_failed' result variant so the UI
//      can show a friendlier message than "send failed."
//
//   4. Sentinel watches for rows wedged in 'sending' > 10 min and for
//      bursts of 'draft_send_failed' signals (D6 Check 5 + Check 6).

import { getAdminClient } from "@/lib/supabase-admin";
import { sendEmailAsUser, sendGmailDraft, saveToDrafts, isGmailSendSuccess } from "@/services/gmail/send";
import type { GmailSendError, GmailSendResult } from "@/services/gmail/send";
import { logSignal } from "@/services/signals/log";
import { upsertConnectionAtStage, type BankerSnapshot } from "@/services/pipeline/upsertConnectionAtStage";

export type SendVia =
  | "send_button"
  | "send_all"
  | "user_marked_sent"
  | "planner_autopilot_A"
  | "planner_preview_veto_B";

export interface SendDraftInput {
  userId: string;
  draftId: string;
  via: SendVia;
}

// Discriminated union of every outcome the caller might get back. Each
// variant has a unique (ok, status) pair; downstream narrowing relies
// on this. If you add a variant, update toHttpResponse() at the bottom
// of this file — assertNever will cause TS to error if you forget.
export type SendDraftResult =
  | {
      ok: true;
      status: "sent";
      messageId: string;
      threadId: string;
      bankerName: string;
    }
  | {
      ok: true;
      status: "skipped_already_sending";
      bankerName: string;
    }
  | {
      ok: false;
      status: "not_found";
      httpStatus: 404;
      error: string;
    }
  | {
      ok: false;
      status: "no_gmail";
      httpStatus: 400;
      error: string;
      bankerName: string;
    }
  | {
      ok: false;
      status: "no_email";
      httpStatus: 400;
      error: string;
      bankerName: string;
    }
  | {
      ok: false;
      status: "gmail_failed";
      httpStatus: 502;
      error: string;
      bankerName: string;
      detail: GmailSendError;
    }
  | {
      // Distinct variant for the rare dual-write hazard: Gmail returned
      // 200 (email IS out) but the subsequent DB write threw. We don't
      // revert (would risk re-send). Surface to the UI with a friendlier
      // message than "send failed" because the user's email DID go out.
      ok: false;
      status: "gmail_succeeded_db_failed";
      httpStatus: 502;
      error: string;
      bankerName: string;
      detail: GmailSendError;
    };

interface DraftRow {
  id: string;
  user_id: string;
  banker_id: string | null;
  connection_id: string | null;
  subject: string | null;
  body: string;
  user_edited_body: string | null;
  type: "cold" | "followup" | "reply" | "thank_you";
  critic_override: boolean;
  status: string;
  gmail_draft_id: string | null;
}

interface BankerJoin {
  name: string;
  title: string | null;
  email: string | null;
  linkedin_url: string | null;
  firm_id: string | null;
  firms: { name: string } | null;
}

// Minimum interval before a stale 'sending' row can be reclaimed by a
// fresh CAS attempt. Covers Vercel timeouts (~60s function cap) +
// Supabase blip + retry slack. Kept short enough that a user clicking
// Send → click again will wait at most ~5 min instead of forever.
const STALE_CLAIM_MIN = 5;

// Whether this `via` actually sends through Gmail. mark_sent is the
// only path that bypasses the SMTP call (the user copies the body and
// sends from their own client).
function viaUsesGmail(via: SendVia): boolean {
  return via !== "user_marked_sent";
}

function snapshotFromBanker(banker: BankerJoin | null): BankerSnapshot {
  return {
    name: banker?.name ?? "",
    title: banker?.title ?? null,
    linkedinUrl: banker?.linkedin_url ?? null,
    firmId: banker?.firm_id ?? null,
    firmName: banker?.firms?.name ?? null,
  };
}

// Best-effort JSON parse of Gmail's error body so the UI can show a
// real message instead of "HTTP 403". Falls back to the status code
// when parsing fails (truncated body, plain text, etc.).
function gmailErrorMessage(err: GmailSendError): string {
  if (err.reason === "no_access_token") {
    return "Couldn't refresh your Gmail token. Reconnect Gmail at /account.";
  }
  if (err.reason === "exception") {
    return `Send threw: ${err.message ?? "unknown"}`;
  }
  // gmail_rejected
  const fallback = `Gmail rejected: HTTP ${err.status ?? "?"}`;
  if (!err.body) return fallback;
  try {
    const parsed = JSON.parse(err.body) as { error?: { message?: string } };
    if (parsed?.error?.message) return `Gmail rejected: ${parsed.error.message}`;
  } catch {
    // Not JSON; fall through to fallback. (Old code used a regex here
    // which broke when the body had nested quotes — JSON.parse is more
    // robust.)
  }
  return fallback;
}

export async function sendDraft(input: SendDraftInput): Promise<SendDraftResult> {
  const admin = getAdminClient();

  // Read draft + profile in parallel. Critical that we don't serialize
  // these — same shape the original routes use.
  const [draftRes, profileRes] = await Promise.all([
    admin
      .from("drafts")
      .select(
        "id, user_id, banker_id, connection_id, subject, body, user_edited_body, type, critic_override, status, gmail_draft_id, bankers(name, title, email, linkedin_url, firm_id, firms(name))"
      )
      .eq("id", input.draftId)
      .maybeSingle(),
    admin.from("profiles").select("gmail_email").eq("id", input.userId).maybeSingle(),
  ]);

  const draftWithBanker = draftRes.data as unknown as
    | (DraftRow & { bankers: BankerJoin | null })
    | null;

  if (!draftWithBanker || draftWithBanker.user_id !== input.userId) {
    return {
      ok: false,
      status: "not_found",
      httpStatus: 404,
      error: "draft not found or not owned by user",
    };
  }

  const bankerRow = draftWithBanker.bankers;
  const bankerName = bankerRow?.name ?? "";
  const bankerEmail = bankerRow?.email ?? null;
  const profile = profileRes.data;

  if (viaUsesGmail(input.via) && !profile?.gmail_email) {
    return {
      ok: false,
      status: "no_gmail",
      httpStatus: 400,
      error: "Gmail not connected — connect at /account",
      bankerName,
    };
  }
  if (viaUsesGmail(input.via) && !bankerEmail) {
    return {
      ok: false,
      status: "no_email",
      httpStatus: 400,
      error: "No email on file for this banker. Use Copy + I sent it instead.",
      bankerName,
    };
  }

  // CAS step 1: try to claim a row currently in 'approved'. supabase-js
  // doesn't easily express "OR (status='sending' AND old)" in one
  // update, so we do two atomic updates; each is its own race-safe CAS.
  const claimedBefore = new Date(Date.now() - STALE_CLAIM_MIN * 60_000).toISOString();
  const claimNow = new Date().toISOString();

  const claim1 = await admin
    .from("drafts")
    .update({ status: "sending", send_started_at: claimNow, updated_at: claimNow })
    .eq("id", input.draftId)
    .eq("status", "approved")
    .select("id");

  let claimed = !claim1.error && Array.isArray(claim1.data) && claim1.data.length > 0;

  if (!claimed) {
    // CAS step 2: stale-claim recovery. Postgres serializes the updates,
    // so two parallel callers reaching this point can't both succeed —
    // the first commits send_started_at = claimNow, the second sees
    // send_started_at !< claimedBefore and matches zero rows.
    const claim2 = await admin
      .from("drafts")
      .update({ status: "sending", send_started_at: claimNow, updated_at: claimNow })
      .eq("id", input.draftId)
      .eq("status", "sending")
      .lt("send_started_at", claimedBefore)
      .select("id");
    claimed = !claim2.error && Array.isArray(claim2.data) && claim2.data.length > 0;
  }

  if (!claimed) {
    // Someone else owns the claim. Don't retry, don't call Gmail, don't
    // update the row. The other caller will write the result.
    return { ok: true, status: "skipped_already_sending", bankerName };
  }

  // From here on we own the claim. Any error path that doesn't write a
  // terminal status MUST revert to 'approved' — otherwise the user
  // can't retry until the 5-minute stale window opens.

  // Branch: Gmail-skip path (mark_sent).
  if (!viaUsesGmail(input.via)) {
    return await recordSent({
      admin,
      draft: draftWithBanker,
      banker: bankerRow,
      bankerName,
      input,
      sendResult: null,
    });
  }

  // Branch: real Gmail send. Use the two-way-sync drafts.send API when
  // we have a stored gmail_draft_id; otherwise fall back to a fresh send.
  let sendRes: GmailSendResult | { error: GmailSendError };
  try {
    if (draftWithBanker.gmail_draft_id) {
      const synced = await saveToDrafts({
        userId: input.userId,
        fromEmail: profile!.gmail_email!,
        toEmail: bankerEmail!,
        subject: draftWithBanker.subject ?? "",
        body: draftWithBanker.body,
        existingDraftId: draftWithBanker.gmail_draft_id,
      });
      sendRes = synced
        ? await sendGmailDraft({
            userId: input.userId,
            gmailDraftId: synced.draftId,
          })
        : {
            error: {
              reason: "gmail_rejected",
              message: "Could not update Gmail draft subject before send.",
            },
          };
    } else {
      sendRes = await sendEmailAsUser({
        userId: input.userId,
        fromEmail: profile!.gmail_email!,
        toEmail: bankerEmail!,
        subject: draftWithBanker.subject ?? "",
        body: draftWithBanker.body,
      });
    }
  } catch (err) {
    // Exception thrown during the call itself (network, code bug).
    // Email was NOT sent — safe to revert.
    await revertToApproved(admin, input.draftId);
    return {
      ok: false,
      status: "gmail_failed",
      httpStatus: 502,
      error: `Gmail call threw: ${String(err).slice(0, 200)}`,
      bankerName,
      detail: { reason: "exception", message: String(err).slice(0, 500) },
    };
  }

  if (!isGmailSendSuccess(sendRes)) {
    // Gmail returned an error. Email did NOT go out. Safe to revert.
    await revertToApproved(admin, input.draftId);

    await logSignal({
      userId: input.userId,
      bankerId: draftWithBanker.banker_id ?? undefined,
      draftId: input.draftId,
      agent: "planner",
      signalType: "draft_send_failed",
      metadata: {
        via: input.via,
        reason: sendRes.error.reason,
        status: sendRes.error.status,
        body: sendRes.error.body,
        bankerEmail,
      },
    });

    return {
      ok: false,
      status: "gmail_failed",
      httpStatus: 502,
      error: gmailErrorMessage(sendRes.error),
      bankerName,
      detail: sendRes.error,
    };
  }

  // Gmail succeeded. From this point onward the email IS out. We must
  // record sent state. If the post-Gmail block throws, we leave the
  // row in 'sending' (NOT revert) so the stale-claim guard catches it
  // — never let a thrown exception trigger a re-send.
  return await recordSent({
    admin,
    draft: draftWithBanker,
    banker: bankerRow,
    bankerName,
    input,
    sendResult: sendRes,
  });
}

interface RecordSentArgs {
  admin: ReturnType<typeof getAdminClient>;
  draft: DraftRow;
  banker: BankerJoin | null;
  bankerName: string;
  input: SendDraftInput;
  // null when via = user_marked_sent (no Gmail call happened).
  sendResult: GmailSendResult | null;
}

async function recordSent(args: RecordSentArgs): Promise<SendDraftResult> {
  const { admin, draft, banker, bankerName, input, sendResult } = args;
  const now = new Date().toISOString();

  try {
    // Mark the draft sent. Clear gmail_draft_id since (if we used the
    // drafts.send API) Gmail has converted the draft into a sent
    // message and our pointer is stale.
    const draftUpdate: {
      status: string;
      sent_at: string;
      send_started_at: string | null;
      updated_at: string;
      sent_message_id?: string;
      gmail_draft_id?: string | null;
    } = {
      status: "sent",
      sent_at: now,
      send_started_at: null, // claim released
      updated_at: now,
    };
    if (sendResult) {
      draftUpdate.sent_message_id = sendResult.sentMessageId;
      draftUpdate.gmail_draft_id = null;
    }
    await admin.from("drafts").update(draftUpdate).eq("id", draft.id);

    // Advance the connection. The pipeline helper handles the legacy
    // alumni_* dual-write and stage-specific resets.
    let writebackConnectionId: string | null = null;
    if (draft.banker_id) {
      const { connectionId, created } = await upsertConnectionAtStage({
        userId: input.userId,
        bankerId: draft.banker_id,
        stage: "sent",
        banker: snapshotFromBanker(banker),
        threadId: sendResult?.gmailThreadId,
        lastSendMessageId: sendResult?.sentMessageId,
        knownConnectionId: draft.connection_id,
      });
      // Connection_id writeback: if we just created a fresh connection
      // and the draft didn't have one, link them so future stage moves
      // can use the optimized direct-update path.
      if (created && !draft.connection_id) {
        writebackConnectionId = connectionId;
      }
    }
    if (writebackConnectionId) {
      await admin
        .from("drafts")
        .update({ connection_id: writebackConnectionId })
        .eq("id", draft.id);
    }

    await logSignal({
      userId: input.userId,
      bankerId: draft.banker_id ?? undefined,
      draftId: draft.id,
      connectionId: writebackConnectionId ?? draft.connection_id ?? undefined,
      agent: "planner",
      signalType: "draft_sent",
      metadata: {
        via: input.via,
        type: draft.type,
        userEdited: Boolean(draft.user_edited_body),
        criticOverride: Boolean(draft.critic_override),
        bodyLength: draft.body.length,
        manual:
          input.via === "send_button" ||
          input.via === "send_all" ||
          input.via === "user_marked_sent",
        autopilot: input.via === "planner_autopilot_A",
        gmailThreadId: sendResult?.gmailThreadId,
      },
    });

    return {
      ok: true,
      status: "sent",
      messageId: sendResult?.sentMessageId ?? "",
      threadId: sendResult?.gmailThreadId ?? "",
      bankerName,
    };
  } catch (err) {
    // The dual-write hazard. Email is out (or never went, for
    // user_marked_sent), but our DB write threw. Do NOT revert to
    // 'approved' — that would risk re-send. Leave the row in 'sending'
    // so the stale-claim guard picks it up later, and log loud so
    // Sentinel sees it.
    console.error(`[outreach/sendDraft] post-send DB write FAILED for draft=${draft.id}`, err);
    await logSignal({
      userId: input.userId,
      bankerId: draft.banker_id ?? undefined,
      draftId: draft.id,
      agent: "planner",
      signalType: "draft_post_send_db_failed",
      metadata: {
        via: input.via,
        error: String(err).slice(0, 500),
        gmailMessageId: sendResult?.sentMessageId,
        gmailThreadId: sendResult?.gmailThreadId,
      },
    });

    // Distinct variant tells the UI: "Email was sent (probably) but we
    // couldn't update our records." Less scary than gmail_failed when
    // the email actually went out. For user_marked_sent the wording is
    // a bit weird ("succeeded" when there was no Gmail call) but the
    // outcome is the same: we couldn't record state and the user
    // should refresh in a few min.
    return {
      ok: false,
      status: "gmail_succeeded_db_failed",
      httpStatus: 502,
      error:
        "Email may have been sent — we couldn't record it. Refresh in a few minutes; status will sync.",
      bankerName,
      detail: {
        reason: "exception",
        message: `post-send DB write failed: ${String(err).slice(0, 200)}`,
      },
    };
  }
}

async function revertToApproved(
  admin: ReturnType<typeof getAdminClient>,
  draftId: string
): Promise<void> {
  const { error } = await admin
    .from("drafts")
    .update({
      status: "approved",
      send_started_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId);

  // Don't throw — let the stale-claim guard handle the wedged row.
  // But leave a breadcrumb for Sentinel / admin debugging.
  if (error) {
    console.error(`[outreach/sendDraft] revertToApproved failed for draft=${draftId}`, error);
    await logSignal({
      draftId,
      agent: "planner",
      signalType: "draft_revert_failed",
      metadata: { error: error.message },
    });
  }
}

// ---------------------------------------------------------------------
// Result → HTTP response mapper. Routes use this so they don't have to
// reason about the discriminated union themselves. Single source of
// truth for response shaping; assertNever ensures TS errors at compile
// time if a new variant is added without handling.
// ---------------------------------------------------------------------

export interface SendDraftHttpResponse {
  status: number;
  body: Record<string, unknown>;
}

function assertNever(x: never): never {
  throw new Error(`Unhandled SendDraftResult variant: ${JSON.stringify(x)}`);
}

export function toHttpResponse(r: SendDraftResult): SendDraftHttpResponse {
  if (r.ok) {
    if (r.status === "sent") {
      return { status: 200, body: { ok: true, messageId: r.messageId } };
    }
    if (r.status === "skipped_already_sending") {
      return { status: 200, body: { ok: true, alreadySending: true } };
    }
    return assertNever(r);
  }
  if (r.status === "not_found") {
    return { status: r.httpStatus, body: { error: r.error } };
  }
  if (r.status === "no_gmail" || r.status === "no_email") {
    return { status: r.httpStatus, body: { error: r.error } };
  }
  if (r.status === "gmail_failed") {
    return { status: r.httpStatus, body: { error: r.error, detail: r.detail } };
  }
  if (r.status === "gmail_succeeded_db_failed") {
    return {
      status: r.httpStatus,
      body: { error: r.error, detail: r.detail, gmailSucceeded: true },
    };
  }
  return assertNever(r);
}
