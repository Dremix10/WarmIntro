// POST /api/drafts/[id]/send — user triggers immediate send (bypass preview window).
//
// Thin wrapper around outreach.sendDraft + toHttpResponse. The CAS
// guard, Gmail call, connection upsert, signal log, and error revert
// all live in the helper. See docs/refactor-plan.md (D6).

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { sendDraft, toHttpResponse } from "@/services/outreach/sendDraft";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = await sendDraft({ userId: ctx.user.id, draftId: id, via: "send_button" });
  const { status, body } = toHttpResponse(result);
  return NextResponse.json(body, { status });
}
