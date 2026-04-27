// POST /api/connections/[id]/stage — user manually moves a banker to a new stage.
// Powers the stage-advance / regress buttons on /crm.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { logSignal } from "@/services/signals/log";

const VALID_STAGES = [
  "sent", "replied", "coffee", "referral",
  "first_round", "superday", "offer", "closed_lost",
] as const;
type Stage = (typeof VALID_STAGES)[number];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { stage } = (await request.json()) as { stage?: string };
  if (!stage || !VALID_STAGES.includes(stage as Stage)) {
    return NextResponse.json({ error: `invalid stage; expected one of ${VALID_STAGES.join(", ")}` }, { status: 400 });
  }

  const admin = getAdminClient();
  const { data: conn } = await admin
    .from("connections")
    .select("id, user_id, banker_id, stage")
    .eq("id", id)
    .single();

  if (!conn || conn.user_id !== ctx.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await admin
    .from("connections")
    .update({ stage, updated_at: new Date().toISOString() })
    .eq("id", id);

  await logSignal({
    userId: ctx.user.id,
    bankerId: conn.banker_id ?? undefined,
    agent: "planner",
    signalType: `stage_${stage}`,
    metadata: { manual: true, fromStage: conn.stage, toStage: stage },
  });

  return NextResponse.json({ ok: true, stage });
}
