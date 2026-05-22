// Write to the `signals` table — the flywheel's append-only event stream

import { restInsert } from "@/lib/supabase-rest";
import type { AgentName } from "@/shared/ib-types";
import type { Json } from "@/lib/database.types";

export interface SignalInput {
  userId?: string;
  bankerId?: string;
  connectionId?: string;
  draftId?: string;
  agent?: AgentName;
  signalType: string;
  metadata?: Record<string, unknown>;
}

function toRow(s: SignalInput) {
  return {
    user_id: s.userId,
    banker_id: s.bankerId,
    connection_id: s.connectionId,
    draft_id: s.draftId,
    agent: s.agent,
    signal_type: s.signalType,
    metadata: (s.metadata ?? {}) as Json,
  };
}

export async function logSignal(input: SignalInput): Promise<void> {
  try {
    await restInsert("signals", toRow(input));
  } catch (err) {
    console.warn("[signals/log] failed", err);
  }
}

export async function logSignalsBatch(inputs: SignalInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await restInsert("signals", inputs.map(toRow));
  } catch (err) {
    console.warn("[signals/log] batch failed", err);
  }
}
