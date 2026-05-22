import { ConnectionCard } from "./ConnectionCard";
import type { Connection, Stage } from "./ConnectionCard";

type StageInfo = { id: Stage; label: string; target: number };

export function Column({ stage, items }: { stage: StageInfo; items: Connection[] }) {
  const pct = Math.min((items.length / stage.target) * 100, 100);

  return (
    <div className="flex flex-col rounded-2xl border border-[#D9CFB5] bg-[#F4EDDB]">
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">{stage.label}</p>
          <p className="text-xs tabular-nums text-[#14182A]">
            <span className="font-semibold">{items.length}</span>
            <span className="text-[#5C6472]"> / {stage.target}</span>
          </p>
        </div>
        <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1B3B5F] to-[#3F6FA3]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex-1 space-y-2 px-2 pb-2">
        {items.length === 0 ? (
          <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-[#D9CFB5] bg-transparent">
            <p className="text-[11px] text-[#5C6472] italic font-[family-name:var(--font-fraunces)]">
              nothing yet
            </p>
          </div>
        ) : (
          items.map((c) => <ConnectionCard key={c.id} c={c} />)
        )}
      </div>
    </div>
  );
}
