// POST /api/setup/trust — user configures trust level per capability + preferred send time

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import type { TrustLevel } from "@/shared/ib-types";

interface TrustSetupRequest {
  sendNewEmail?: TrustLevel;
  sendFollowup?: TrustLevel;
  sendReply?: TrustLevel;
  autoGraduate?: boolean;
  preferredSendTime?: string; // HH:MM
  preferredTimezone?: string;
  nightPreviewEnabled?: boolean;
  dailyBatchSize?: number; // 1-15, how many drafts the morning cron generates
}

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json()) as TrustSetupRequest;

  const updates: Record<string, unknown> = {
    user_id: ctx.user.id,
    updated_at: new Date().toISOString(),
  };
  if (body.sendNewEmail) updates.send_new_email = body.sendNewEmail;
  if (body.sendFollowup) updates.send_followup = body.sendFollowup;
  if (body.sendReply) updates.send_reply = body.sendReply;
  if (body.autoGraduate !== undefined) updates.auto_graduate = body.autoGraduate;
  if (body.preferredSendTime) updates.preferred_send_time = body.preferredSendTime;
  if (body.preferredTimezone) updates.preferred_timezone = body.preferredTimezone;
  if (body.nightPreviewEnabled !== undefined) updates.night_preview_enabled = body.nightPreviewEnabled;
  if (body.dailyBatchSize !== undefined) {
    const n = Math.max(1, Math.min(15, Math.round(body.dailyBatchSize)));
    updates.daily_batch_size = n;
  }

  await ctx.supabase.from("trust_levels").upsert(updates as never, { onConflict: "user_id" });
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await ctx.supabase.from("trust_levels").select("*").eq("user_id", ctx.user.id).maybeSingle();
  return NextResponse.json({ trust: data });
}
