// Single canonical writer for the connections row. Every send path (send,
// send-all, mark_sent, planner autopilot) and every stage move (manual,
// watcher) flows through here. Centralizes the legacy alumni_* dual-write
// and the stage-specific reset rules so a fix lands in one place instead
// of four. See docs/refactor-plan.md (D6) for the full design.
//
// Directional rule: outreach/* may import from pipeline/*; never reverse.

import { getAdminClient } from "@/lib/supabase-admin";

export type Stage =
  | "sent"
  | "replied"
  | "coffee"
  | "referral"
  | "first_round"
  | "superday"
  | "offer"
  | "closed_lost";

export const VALID_STAGES: readonly Stage[] = [
  "sent",
  "replied",
  "coffee",
  "referral",
  "first_round",
  "superday",
  "offer",
  "closed_lost",
] as const;

export function isValidStage(s: string): s is Stage {
  return (VALID_STAGES as readonly string[]).includes(s);
}

// What the helper needs from the joined banker row. Callers do the join
// themselves (single round-trip with the rest of their reads) and pass
// the snapshot in — we never re-read the banker here.
export interface BankerSnapshot {
  name: string;
  title: string | null;
  linkedinUrl: string | null;
  firmId: string | null;
  firmName: string | null;
}

export interface UpsertConnectionInput {
  userId: string;
  bankerId: string;
  stage: Stage;
  banker: BankerSnapshot;
  // Optional metadata captured on a successful send. Stage moves that
  // aren't tied to a Gmail send (manual, watcher) leave these undefined,
  // and the helper leaves the corresponding columns untouched.
  threadId?: string | null;
  lastSendMessageId?: string | null;
  // If the caller already knows the connection row id (e.g.
  // drafts.connection_id was non-null, or the watcher matched a thread
  // to a known connection), we update directly. Pure optimization;
  // semantics identical either way.
  knownConnectionId?: string | null;
}

export interface UpsertConnectionResult {
  connectionId: string;
  created: boolean;
}

// Stage-specific reset rules. Centralized so the four send paths can't
// drift. Most "advance" stages zero silence_days and clear the followup
// flag; closed_lost leaves silence alone (it's no longer relevant) but
// also clears the flag so the watcher stops nudging.
function resetsForStage(stage: Stage): { silence_days?: number; needs_followup?: boolean } {
  if (stage === "closed_lost") return { needs_followup: false };
  return { silence_days: 0, needs_followup: false };
}

export async function upsertConnectionAtStage(
  input: UpsertConnectionInput
): Promise<UpsertConnectionResult> {
  const admin = getAdminClient();
  const now = new Date().toISOString();
  const resets = resetsForStage(input.stage);

  // Conditionally include thread_id / last_send_message_id only when
  // the caller passed them — otherwise we'd overwrite existing values
  // with null (e.g. a watcher stage move with no thread context would
  // clobber the thread_id captured on the original send).
  const updatePayload = {
    stage: input.stage,
    updated_at: now,
    ...resets,
    ...(input.threadId ? { thread_id: input.threadId } : {}),
    ...(input.lastSendMessageId ? { last_send_message_id: input.lastSendMessageId } : {}),
  };

  // Path A: caller knows the connection id → direct update.
  if (input.knownConnectionId) {
    await admin.from("connections").update(updatePayload).eq("id", input.knownConnectionId);
    return { connectionId: input.knownConnectionId, created: false };
  }

  // Path B: select-then-update-or-insert by (user_id, banker_id). We
  // intentionally avoid the upsert+onConflict pattern because the
  // matching unique index in the current schema is on
  // (user_id, alumni_id) and the dual-write keeps alumni_id = banker_id.
  // Using onConflict on (user_id, banker_id) would require a separate
  // index that's not guaranteed across environments. Select-first is
  // the safe, portable pattern.
  const { data: existing } = await admin
    .from("connections")
    .select("id")
    .eq("user_id", input.userId)
    .eq("banker_id", input.bankerId)
    .maybeSingle();

  if (existing) {
    await admin.from("connections").update(updatePayload).eq("id", existing.id);
    return { connectionId: existing.id, created: false };
  }

  // Insert. Legacy alumni_* columns are still NOT NULL on the
  // connections table — every send path must dual-write them. When
  // migration 6.5 deprecates these columns, we update this one place
  // instead of four routes + the planner.
  const insertPayload = {
    user_id: input.userId,
    banker_id: input.bankerId,
    alumni_id: input.bankerId, // legacy: kept identical to banker_id
    alumni_name: input.banker.name,
    alumni_role: input.banker.title ?? "",
    alumni_linkedin_url: input.banker.linkedinUrl ?? "",
    company_id: input.banker.firmId ?? "",
    company_name: input.banker.firmName ?? "",
    stage: input.stage,
    updated_at: now,
    ...resets,
    ...(input.threadId ? { thread_id: input.threadId } : {}),
    ...(input.lastSendMessageId ? { last_send_message_id: input.lastSendMessageId } : {}),
  };

  const { data: inserted, error: insertErr } = await admin
    .from("connections")
    .insert(insertPayload)
    .select("id")
    .single();

  if (insertErr || !inserted) {
    // Race-loser: a parallel send (button + planner autopilot, double-click,
    // send-all + run-now) inserted the row between our select and our
    // insert. The unique(user_id, alumni_id) constraint catches it. Retry
    // the lookup; the row exists now.
    const { data: retry } = await admin
      .from("connections")
      .select("id")
      .eq("user_id", input.userId)
      .eq("banker_id", input.bankerId)
      .maybeSingle();
    if (retry) {
      await admin.from("connections").update(updatePayload).eq("id", retry.id);
      return { connectionId: retry.id, created: false };
    }
    // Genuinely failed — surface the error so the caller can log + alert.
    throw new Error(
      `upsertConnectionAtStage: insert failed and retry-select empty (user=${input.userId}, banker=${input.bankerId}): ${insertErr?.message ?? "unknown"}`
    );
  }

  return { connectionId: inserted.id, created: true };
}
