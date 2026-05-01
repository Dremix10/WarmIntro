// POST /api/connections/[id]/stage — user manually moves a banker to a
// new stage. Powers the stage-advance / regress buttons on /crm. Stage
// validation, ownership check, connection write, and signal log all live
// in pipeline.advanceStage so the watcher uses the same code path.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { advanceStage } from "@/services/pipeline/advanceStage";
import { VALID_STAGES } from "@/services/pipeline/upsertConnectionAtStage";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { stage } = (await request.json()) as { stage?: string };
  if (!stage) {
    return NextResponse.json(
      { error: `missing stage; expected one of ${VALID_STAGES.join(", ")}` },
      { status: 400 }
    );
  }

  const result = await advanceStage({
    userId: ctx.user.id,
    connectionId: id,
    toStage: stage,
    via: "manual",
  });

  if (!result.ok) {
    if (result.error === "invalid_stage") {
      return NextResponse.json(
        { error: `invalid stage; expected one of ${VALID_STAGES.join(", ")}` },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, stage: result.stage });
}
