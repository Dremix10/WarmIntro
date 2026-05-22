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
          <p className="text-sm font-semibold text-[#1F2330]">{stage.name}</p>
          <p className="text-xs text-[#5C6472]">
            <span className="font-semibold text-[#2A2F3B]">{stage.currentCount}</span>
            <span className="text-[#8A8674]"> / {stage.targetCount}</span>
          </p>
        </div>
        <div className="h-2.5 w-full rounded-full bg-[#F4EDDB] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%`, backgroundColor: stage.color }}
          />
        </div>
        <p className="mt-0.5 text-xs text-[#8A8674]">
          {Math.round(stage.conversionRate * 100)}% conversion rate
        </p>
      </div>
    </div>
  );
}
