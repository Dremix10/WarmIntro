// Shared agent utilities — Claude client helpers, run logging, signal bridging

import { askClaudeJSON, askClaude } from "@/services/claude";
import { getAdminClient } from "@/lib/supabase-admin";
import { logSignal } from "@/services/signals/log";
import type { AgentName } from "@/shared/ib-types";

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
    const admin = getAdminClient();
    const { data } = await admin
      .from("agent_runs")
      .insert({
        user_id: opts.userId,
        agent: opts.agent,
        triggered_by: opts.triggeredBy,
        input_summary: (opts.inputSummary ?? {}) as never,
        started_at: startedAt.toISOString(),
      })
      .select("id")
      .single();

    return {
      runId: data?.id ?? "unpersisted",
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

export async function endAgentRun(ctx: AgentRunContext, outputSummary: Record<string, unknown>, error?: string): Promise<void> {
  if (ctx.runId === "unpersisted") return;
  const endedAt = new Date();
  const durationMs = endedAt.getTime() - ctx.startedAt.getTime();
  try {
    const admin = getAdminClient();
    await admin
      .from("agent_runs")
      .update({
        output_summary: outputSummary as never,
        duration_ms: durationMs,
        error,
        ended_at: endedAt.toISOString(),
      })
      .eq("id", ctx.runId);
  } catch (err) {
    console.warn(`[${ctx.agent}] failed to persist agent_run end`, err);
  }
}

export { askClaudeJSON, askClaude, logSignal, getAdminClient };

// Helper to hint to the Planner what to do next. Agents can write these signals
// which the Planner reads on the next tick.
export async function nudgePlanner(userId: string, hint: string, metadata: Record<string, unknown> = {}): Promise<void> {
  await logSignal({
    userId,
    agent: "planner",
    signalType: "planner_nudge",
    metadata: { hint, ...metadata },
  });
}
