// POST /api/drafts/[id]/mark_sent — user manually marks a draft as sent.
// Used by Copilot mode (Trust C) and by users without Gmail OAuth — they
// copy the draft, paste it into their email client, send it themselves,
// then come back and tell Alma it shipped. The helper bypasses the
// Gmail call but still applies the CAS guard, so a double-click on
// "I sent it" cannot double-log the signal or double-upsert the
// connection.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { sendDraft, toHttpResponse } from "@/services/outreach/sendDraft";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = await sendDraft({ userId: ctx.user.id, draftId: id, via: "user_marked_sent" });
  const { status, body } = toHttpResponse(result);
  return NextResponse.json(body, { status });
}
