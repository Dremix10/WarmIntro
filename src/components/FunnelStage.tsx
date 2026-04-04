"use client";

import type { FunnelStage as FunnelStageType } from "@/shared/types";

export function FunnelStage({ stage }: { stage: FunnelStageType }) {
  const pct = stage.targetCount > 0
    ? Math.min(100, Math.round((stage.currentCount / stage.targetCount) * 100))
    : 0;

  return (
    <div className="flex items-center gap-4">
      {/* Icon */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ backgroundColor: `${stage.color}20` }}
      >
        {stage.icon}
      </div>

      {/* Bar + labels */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-sm font-semibold text-slate-800">{stage.name}</p>
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{stage.currentCount}</span>
            <span className="text-slate-400"> / {stage.targetCount}</span>
          </p>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%`, backgroundColor: stage.color }}
          />
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          {Math.round(stage.conversionRate * 100)}% conversion rate
        </p>
      </div>
    </div>
  );
}
