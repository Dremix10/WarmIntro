// POST /api/drafts/[id]/mark_sent — user manually marks a draft as sent.
// Used by Copilot mode (Trust C) and by users without Gmail OAuth — they
// copy the draft, paste it into their email client, hit send, then come back
// and tell Alma it shipped. Alma advances the pipeline + connection without
// touching the user's mailbox.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { logSignal } from "@/services/signals/log";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = getAdminClient();
  const { data: draft } = await admin
    .from("drafts")
    .select("id, user_id, banker_id, connection_id, subject, body, user_edited_body, type, bankers(name, title, firm_id, linkedin_url, firms(name))")
    .eq("id", id)
    .single();
  if (!draft || draft.user_id !== ctx.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Mark draft sent
  await admin
    .from("drafts")
    .update({ status: "sent", sent_at: now, updated_at: now })
    .eq("id", id);

  // Advance / create connection. Same shape as the auto-send path.
  if (draft.connection_id) {
    await admin
      .from("connections")
      .update({ stage: "sent", silence_days: 0, needs_followup: false, updated_at: now })
      .eq("id", draft.connection_id);
  } else if (draft.banker_id) {
    type BankerJoin = { name: string; title: string | null; firm_id: string | null; linkedin_url: string | null; firms: { name: string } | null };
    const banker = draft.bankers as unknown as BankerJoin | null;
    await admin.from("connections").insert({
      user_id: ctx.user.id,
      banker_id: draft.banker_id,
      alumni_id: draft.banker_id, // legacy column
      alumni_name: banker?.name ?? "",
      alumni_role: banker?.title ?? "",
      alumni_linkedin_url: banker?.linkedin_url ?? "",
      company_id: banker?.firm_id ?? "",
      company_name: banker?.firms?.name ?? "",
      stage: "sent",
    });
  }

  await logSignal({
    userId: ctx.user.id,
    bankerId: draft.banker_id ?? undefined,
    draftId: id,
    agent: "planner",
    signalType: "draft_sent",
    metadata: {
      manual: true,
      via: "user_marked_sent",
      type: draft.type,
      userEdited: Boolean(draft.user_edited_body),
      bodyLength: draft.body.length,
    },
  });

  return NextResponse.json({ ok: true });
}
