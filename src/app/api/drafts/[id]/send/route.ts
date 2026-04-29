// POST /api/drafts/[id]/send — user triggers immediate send (bypass preview window)

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { sendEmailAsUser, isGmailSendSuccess } from "@/services/gmail/send";
import { getAdminClient } from "@/lib/supabase-admin";
import { logSignal } from "@/services/signals/log";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  const { data: draft } = await admin
    .from("drafts")
    .select("id, user_id, banker_id, connection_id, subject, body, bankers(name, title, linkedin_url, firm_id, firms(name))")
    .eq("id", id)
    .single();
  if (!draft || draft.user_id !== ctx.user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: profile } = await admin.from("profiles").select("gmail_email").eq("id", ctx.user.id).single();
  const { data: banker } = await admin.from("bankers").select("email").eq("id", draft.banker_id ?? "").maybeSingle();
  if (!profile?.gmail_email) {
    return NextResponse.json({ error: "Gmail not connected — connect at /account" }, { status: 400 });
  }
  if (!banker?.email) {
    return NextResponse.json({ error: "No email on file for this banker. Use Copy + I sent it instead." }, { status: 400 });
  }

  const res = await sendEmailAsUser({
    userId: ctx.user.id,
    fromEmail: profile.gmail_email,
    toEmail: banker.email,
    subject: draft.subject ?? "",
    body: draft.body,
  });

  if (!isGmailSendSuccess(res)) {
    // Log a signal so we can see exactly why this failed across the fleet.
    await logSignal({
      userId: ctx.user.id,
      bankerId: draft.banker_id ?? undefined,
      draftId: id,
      agent: "planner",
      signalType: "draft_send_failed",
      metadata: {
        reason: res.error.reason,
        status: res.error.status,
        body: res.error.body,
        gmailFromEmail: profile.gmail_email,
        bankerEmail: banker.email,
      },
    });

    // Surface the actual Gmail error to the UI so the user sees what's wrong.
    let userMessage: string;
    if (res.error.reason === "no_access_token") {
      userMessage = "Couldn't refresh your Gmail token. Reconnect Gmail at /account.";
    } else if (res.error.reason === "gmail_rejected") {
      // Try to pull a useful line from Google's error body.
      const detail = res.error.body ?? "";
      const match = detail.match(/"message":\s*"([^"]+)"/);
      userMessage = `Gmail rejected: ${match?.[1] ?? `HTTP ${res.error.status}`}`;
    } else {
      userMessage = `Send threw: ${res.error.message ?? "unknown"}`;
    }
    return NextResponse.json(
      { error: userMessage, detail: res.error },
      { status: 502 }
    );
  }

  const now = new Date().toISOString();
  await admin
    .from("drafts")
    .update({ status: "sent", sent_at: now, sent_message_id: res.sentMessageId, updated_at: now })
    .eq("id", id);

  // Create / advance the connection so /crm and /network reflect the send.
  // Was previously only done by the Planner's autopilot path + send-all batch
  // — single-button send was creating sent drafts but no connection rows.
  type BankerJoin = { name: string; title: string | null; linkedin_url: string | null; firm_id: string | null; firms: { name: string } | null };
  const bankerRow = (draft as unknown as { bankers: BankerJoin | null }).bankers;
  if (draft.connection_id) {
    await admin
      .from("connections")
      .update({
        stage: "sent",
        last_send_message_id: res.sentMessageId,
        thread_id: res.gmailThreadId,
        silence_days: 0,
        needs_followup: false,
        updated_at: now,
      })
      .eq("id", draft.connection_id);
  } else if (draft.banker_id) {
    // Race-safe upsert: a unique constraint on (user_id, banker_id) means
    // a parallel send (planner autopilot, double-click, mark_sent) might
    // beat us to the insert. Use upsert with onConflict so we never throw
    // and always end up with a single connection row.
    await admin.from("connections").upsert(
      {
        user_id: ctx.user.id,
        banker_id: draft.banker_id,
        alumni_id: draft.banker_id, // legacy column
        alumni_name: bankerRow?.name ?? "",
        alumni_role: bankerRow?.title ?? "",
        alumni_linkedin_url: bankerRow?.linkedin_url ?? "",
        company_id: bankerRow?.firm_id ?? "",
        company_name: bankerRow?.firms?.name ?? "",
        stage: "sent",
        last_send_message_id: res.sentMessageId,
        thread_id: res.gmailThreadId,
        silence_days: 0,
        needs_followup: false,
        updated_at: now,
      },
      { onConflict: "user_id,banker_id", ignoreDuplicates: false }
    );
  }

  await logSignal({
    userId: ctx.user.id,
    bankerId: draft.banker_id ?? undefined,
    draftId: id,
    agent: "planner",
    signalType: "draft_sent",
    metadata: { manual: true, gmailThreadId: res.gmailThreadId },
  });

  return NextResponse.json({ ok: true, messageId: res.sentMessageId });
}
