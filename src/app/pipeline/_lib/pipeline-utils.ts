import { STATIONS } from "./constants";
import type { PipelineRow } from "./types";

export function priorityScore(row: PipelineRow): number {
  const stageIdx = STATIONS.findIndex((station) => station.stage === row.stage);
  const stageBoost = stageIdx >= 0 ? stageIdx * 8 : 0;
  const status = statusFor(row);
  const activityBoost = status === "positive" ? 20 : status === "due" ? 15 : 0;
  return (row.warmth ?? 0) + stageBoost + activityBoost;
}

export function statusFor(row: PipelineRow): "positive" | "due" | null {
  const ageDays =
    (Date.now() - new Date(row.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (row.stage === "sent" && ageDays >= 5) return "due";
  if (ageDays <= 3 && row.stage !== "sent" && row.stage !== "draft") {
    return "positive";
  }
  return null;
}

export function priorityTier(row: PipelineRow): "low" | "med" | "high" | "top" {
  const score = priorityScore(row);
  if (score >= 110) return "top";
  if (score >= 80) return "high";
  if (score >= 55) return "med";
  return "low";
}

export function priorityDims(
  tier: ReturnType<typeof priorityTier>,
): { size: number; font: number } {
  if (tier === "top") return { size: 38, font: 16 };
  if (tier === "high") return { size: 32, font: 14 };
  if (tier === "med") return { size: 28, font: 12 };
  return { size: 22, font: 10 };
}

export function initial(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "?").toUpperCase();
}
