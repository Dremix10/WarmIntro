// Single canonical stage-advance for connections. Used by:
//   - /api/connections/[id]/stage     (manual user move on /crm)
//   - agents/watcher.ts               (auto-advance on reply detection)
//
// Wraps upsertConnectionAtStage so the connection writer stays in one
// place. Adds the stage validation, ownership check, orphan-row guard,
// and signal log that callers expect.

import { getAdminClient } from "@/lib/supabase-admin";
import { logSignal } from "@/services/signals/log";
import {
  isValidStage,
  upsertConnectionAtStage,
  type Stage,
  type BankerSnapshot,
} from "./upsertConnectionAtStage";

export type AdvanceVia = "manual" | "watcher";

export interface AdvanceStageInput {
  userId: string;
  connectionId: string;
  toStage: string; // unvalidated; we check it
  via: AdvanceVia;
  // Watcher-specific: classification metadata to record alongside the
  // stage change. Manual moves leave this undefined.
  classificationMetadata?: Record<string, unknown>;
}

export type AdvanceStageResult =
  | { ok: true; stage: Stage; fromStage: string }
  | { ok: false; error: "not_found" | "invalid_stage"; status: 404 | 400 };

export async function advanceStage(
  input: AdvanceStageInput
): Promise<AdvanceStageResult> {
  if (!isValidStage(input.toStage)) {
    return { ok: false, error: "invalid_stage", status: 400 };
  }
  const stage = input.toStage;
  const admin = getAdminClient();

  // Ownership check + load enough banker context for the upsert helper.
  const { data: conn } = await admin
    .from("connections")
    .select("id, user_id, banker_id, stage, alumni_name, alumni_role, alumni_linkedin_url, company_id, company_name")
    .eq("id", input.connectionId)
    .maybeSingle();

  if (!conn || conn.user_id !== input.userId) {
    return { ok: false, error: "not_found", status: 404 };
  }

  const fromStage = conn.stage ?? "";
  const bankerSnapshot: BankerSnapshot = {
    name: conn.alumni_name ?? "",
    title: conn.alumni_role ?? null,
    linkedinUrl: conn.alumni_linkedin_url ?? null,
    firmId: conn.company_id ?? null,
    firmName: conn.company_name ?? null,
  };

  // Orphan-connection guard. Some legacy rows from before the IB pivot
  // have banker_id IS NULL (only alumni_id). For those, do a direct
  // update by id and skip the upsert path entirely — the upsert helper
  // would otherwise look up by banker_id="" which finds nothing and
  // tries to insert a new row with banker_id="" (NOT NULL violation).
  if (!conn.banker_id) {
    await admin
      .from("connections")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("id", conn.id);
  } else {
    await upsertConnectionAtStage({
      userId: input.userId,
      bankerId: conn.banker_id,
      stage,
      banker: bankerSnapshot,
      knownConnectionId: conn.id,
    });
  }

  await logSignal({
    userId: input.userId,
    bankerId: conn.banker_id ?? undefined,
    connectionId: conn.id,
    agent: input.via === "watcher" ? "watcher" : "planner",
    signalType: `stage_${stage}`,
    metadata: {
      via: input.via,
      fromStage,
      toStage: stage,
      ...(input.classificationMetadata ?? {}),
    },
  });

  return { ok: true, stage, fromStage };
}
