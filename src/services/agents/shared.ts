// Shared agent utilities — Claude client helpers, run logging, signal bridging

import { askClaudeJSON, askClaude } from "@/services/claude";
import { logSignal } from "@/services/signals/log";
import { restInsert, restUpdate, eq } from "@/lib/supabase-rest";
import type { AgentName } from "@/shared/ib-types";
import type { Json } from "@/lib/database.types";

export interface AgentRunContext {
  runId: string;
  agent: AgentName;
  userId?: string;
  triggeredBy: "cron" | "event" | "user_command" | "agent_dispatch";
  startedAt: Date;
}

export async function startAgentRun(opts: {
  agent: AgentName;
  userId?: string;
  triggeredBy: AgentRunContext["triggeredBy"];
  inputSummary?: Record<string, unknown>;
}): Promise<AgentRunContext> {
  const startedAt = new Date();
  try {
    const inserted = await restInsert("agent_runs", {
      user_id: opts.userId,
      agent: opts.agent,
      triggered_by: opts.triggeredBy,
      input_summary: (opts.inputSummary ?? {}) as Json,
      started_at: startedAt.toISOString(),
    });
    return {
      runId: inserted[0]?.id ?? "unpersisted",
      agent: opts.agent,
      userId: opts.userId,
      triggeredBy: opts.triggeredBy,
      startedAt,
    };
  } catch (err) {
    console.warn(`[${opts.agent}] failed to persist agent_run start`, err);
    return {
      runId: "unpersisted",
      agent: opts.agent,
      userId: opts.userId,
      triggeredBy: opts.triggeredBy,
      startedAt,
    };
  }
}

export async function endAgentRun(
  ctx: AgentRunContext,
  outputSummary: Record<string, unknown>,
  error?: string
): Promise<void> {
  if (ctx.runId === "unpersisted") return;
  const endedAt = new Date();
  const durationMs = endedAt.getTime() - ctx.startedAt.getTime();
  try {
    await restUpdate(
      "agent_runs",
      {
        output_summary: outputSummary as Json,
        duration_ms: durationMs,
        error,
        ended_at: endedAt.toISOString(),
      },
      { id: eq(ctx.runId) }
    );
  } catch (err) {
    console.warn(`[${ctx.agent}] failed to persist agent_run end`, err);
  }
}

export { askClaudeJSON, askClaude, logSignal };

/** Nudge the Planner — emits a planner_nudge signal it reads on next tick. */
export async function nudgePlanner(
  userId: string,
  hint: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await logSignal({
    userId,
    agent: "planner",
    signalType: "planner_nudge",
    metadata: { hint, ...metadata },
  });
}
