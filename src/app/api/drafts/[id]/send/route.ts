// POST /api/drafts/[id]/send — user triggers immediate send (bypass preview window)

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { sendEmailAsUser } from "@/services/gmail/send";
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
  if (!profile?.gmail_email || !banker?.email) return NextResponse.json({ error: "missing_gmail_or_banker_email" }, { status: 400 });

  const res = await sendEmailAsUser({
    userId: ctx.user.id,
    fromEmail: profile.gmail_email,
    toEmail: banker.email,
    subject: draft.subject ?? "",
    body: draft.body,
  });
  if (!res) return NextResponse.json({ error: "send_failed" }, { status: 502 });

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
