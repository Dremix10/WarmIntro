import type { FunnelState } from "@/shared/types";

export function MiniFunnel({ funnel }: { funnel: FunnelState | null }) {
  if (!funnel) return null;
  return (
    <div className="flex items-center gap-1">
      {funnel.stages.map((s) => (
        <div key={s.id} className="flex items-center gap-1 text-[10px] text-[#5C6472]">
          <span>{s.icon}</span>
          <span className="font-semibold" style={{ color: s.color }}>{s.currentCount}</span>
          <span className="text-[#A8A494]">/{s.targetCount}</span>
        </div>
      ))}
    </div>
  );
}
