// POST /api/drafts/send-all — sends every approved-not-sent draft for the
// current user via Gmail. Returns per-draft success/failure so the UI can
// surface partial outcomes.
//
// Capped at 5 drafts per call so a long Gmail run doesn't blow the 60s
// function limit. Hit the button again to keep going.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { sendEmailAsUser, isGmailSendSuccess } from "@/services/gmail/send";
import { logSignal } from "@/services/signals/log";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_CAP = 5;

interface BankerJoin { name: string; email: string | null; firm_id: string | null; firms: { name: string } | null }
interface DraftRow { id: string; banker_id: string | null; subject: string | null; body: string; user_edited_body: string | null; type: "cold" | "followup" | "reply" | "thank_you"; bankers: BankerJoin | null }

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("gmail_email")
    .eq("id", ctx.user.id)
    .single();
  if (!profile?.gmail_email) {
    return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
  }

  const { data: drafts } = await admin
    .from("drafts")
    .select("id, banker_id, subject, body, user_edited_body, type, bankers(name, email, firm_id, firms(name))")
    .eq("user_id", ctx.user.id)
    .eq("status", "approved")
    .is("sent_at", null)
    .limit(BATCH_CAP);

  const queue = (drafts ?? []) as unknown as DraftRow[];
  const results: Array<{ draftId: string; banker: string; ok: boolean; error?: string }> = [];

  for (const d of queue) {
    const banker = d.bankers;
    if (!banker?.email) {
      results.push({ draftId: d.id, banker: banker?.name ?? "?", ok: false, error: "no_email" });
      continue;
    }
    const sentRes = await sendEmailAsUser({
      userId: ctx.user.id,
      fromEmail: profile.gmail_email,
      toEmail: banker.email,
      subject: d.subject ?? "",
      body: d.body,
    });
    if (!isGmailSendSuccess(sentRes)) {
      const errReason = sentRes.error.reason;
      const errBody = sentRes.error.body ?? sentRes.error.message ?? "";
      results.push({ draftId: d.id, banker: banker.name, ok: false, error: `${errReason}: ${errBody.slice(0, 100)}` });
      continue;
    }
    const sent = sentRes;

    await admin
      .from("drafts")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        sent_message_id: sent.sentMessageId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", d.id);

    if (d.banker_id) {
      // Upsert connection at "sent" stage
      const { data: existing } = await admin
        .from("connections")
        .select("id")
        .eq("user_id", ctx.user.id)
        .eq("banker_id", d.banker_id)
        .maybeSingle();
      const now = new Date().toISOString();
      if (existing) {
        await admin.from("connections").update({ stage: "sent", last_send_message_id: sent.sentMessageId, thread_id: sent.gmailThreadId, silence_days: 0, needs_followup: false, updated_at: now }).eq("id", existing.id);
      } else {
        await admin.from("connections").insert({
          user_id: ctx.user.id,
          banker_id: d.banker_id,
          alumni_id: d.banker_id,
          alumni_name: banker.name,
          alumni_role: "",
          alumni_linkedin_url: "",
          company_id: banker.firm_id ?? "",
          company_name: banker.firms?.name ?? "",
          stage: "sent",
          last_send_message_id: sent.sentMessageId,
          thread_id: sent.gmailThreadId,
        });
      }
    }

    await logSignal({
      userId: ctx.user.id,
      bankerId: d.banker_id ?? undefined,
      draftId: d.id,
      agent: "planner",
      signalType: "draft_sent",
      metadata: {
        batch: true,
        via: "send_all",
        type: d.type,
        userEdited: Boolean(d.user_edited_body),
        bodyLength: d.body.length,
      },
    });

    results.push({ draftId: d.id, banker: banker.name, ok: true });
  }

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  return NextResponse.json({ ok: true, sent, failed, results });
}
