"use client";

import type { FunnelState } from "@/shared/types";
import { FunnelStage } from "@/components/FunnelStage";

export function FunnelDashboard({ funnel }: { funnel: FunnelState }) {
  const overallPct = funnel.totalOutreachNeeded > 0
    ? Math.round((funnel.totalOutreachDone / funnel.totalOutreachNeeded) * 100)
    : 0;

  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Your Funnel</h2>
          <span className="text-xs font-medium text-slate-400">Week {funnel.weekNumber}</span>
        </div>

        {/* Overall progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-emerald-600 shrink-0">{overallPct}%</span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-slate-400">
            {funnel.totalOutreachDone} of {funnel.totalOutreachNeeded} outreach sent
          </p>
          <p className="text-xs text-slate-400">
            Est. <span className="font-medium text-slate-600">{funnel.estimatedOffers}</span> {funnel.estimatedOffers === 1 ? "offer" : "offers"}
          </p>
        </div>
      </div>

      {/* Stages */}
      <div className="px-6 py-5 space-y-4">
        {funnel.stages.map((stage) => (
          <FunnelStage key={stage.id} stage={stage} />
        ))}
      </div>

      {/* Funnel math footer */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          {funnel.stages.map((stage, i) => (
            <span key={stage.id} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-slate-300">&rarr;</span>}
              <span className="font-semibold" style={{ color: stage.color }}>
                {stage.targetCount}
              </span>
              <span className="hidden sm:inline">{stage.name.split(" ").pop()}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
