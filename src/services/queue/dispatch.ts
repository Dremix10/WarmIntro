// Thin abstraction over agent dispatch. Today these helpers just call the
// agents directly; the cron tick fans them out via Promise.allSettled with a
// 50-user-per-minute batch. If we ever migrate to a real queue (QStash,
// Vercel Queues, Inngest, etc.) the dispatch sites in cron/tick/route.ts
// stay unchanged — only the bodies of these functions move from a direct
// call to a queue.publishJSON(...) call. Vendor-swap insurance for ~10 LOC.

import { runWatcher, type WatcherInput, type WatcherOutput } from "@/services/agents/watcher";
import { runPlanner, type PlannerInput, type PlannerOutput } from "@/services/agents/planner";

export async function dispatchWatcher(input: WatcherInput): Promise<WatcherOutput> {
  return runWatcher(input);
}

export async function dispatchPlanner(input: PlannerInput): Promise<PlannerOutput> {
  return runPlanner(input);
}
