// Write to the `signals` table — the flywheel's append-only event stream

import { getAdminClient } from "@/lib/supabase-admin";
import type { AgentName } from "@/shared/ib-types";

export interface SignalInput {
  userId?: string;
  bankerId?: string;
  connectionId?: string;
  draftId?: string;
  agent?: AgentName;
  signalType: string;
  metadata?: Record<string, unknown>;
}

export async function logSignal(input: SignalInput): Promise<void> {
  try {
    const admin = getAdminClient();
    await admin.from("signals").insert({
      user_id: input.userId,
      banker_id: input.bankerId,
      connection_id: input.connectionId,
      draft_id: input.draftId,
      agent: input.agent,
      signal_type: input.signalType,
      metadata: (input.metadata ?? {}) as never,
    });
  } catch (err) {
    console.warn("[signals/log] failed", err);
  }
}

export async function logSignalsBatch(inputs: SignalInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    const admin = getAdminClient();
    await admin.from("signals").insert(
      inputs.map((s) => ({
        user_id: s.userId,
        banker_id: s.bankerId,
        connection_id: s.connectionId,
        draft_id: s.draftId,
        agent: s.agent,
        signal_type: s.signalType,
        metadata: (s.metadata ?? {}) as never,
      }))
    );
  } catch (err) {
    console.warn("[signals/log] batch failed", err);
  }
}
