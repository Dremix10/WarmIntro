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
    .select("id, user_id, banker_id, subject, body")
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

  await admin
    .from("drafts")
    .update({ status: "sent", sent_at: new Date().toISOString(), sent_message_id: res.sentMessageId, updated_at: new Date().toISOString() })
    .eq("id", id);

  await logSignal({
    userId: ctx.user.id,
    bankerId: draft.banker_id ?? undefined,
    draftId: id,
    agent: "planner",
    signalType: "draft_sent",
    metadata: { manual: true },
  });

  return NextResponse.json({ ok: true, messageId: res.sentMessageId });
}
