import type { CSSProperties } from "react";
import { STAGE_NAME, STAGE_ORDER, STAGE_ROMAN, STAGE_TIER } from "../_lib/constants";
import { initial, shortUniversity, stageIdx } from "../_lib/deck-utils";
import type { DeckBanker } from "../_lib/types";

export function BankerSpreadCard({
  banker,
  color,
  stagger,
  isActive,
  onOpen,
}: {
  banker: DeckBanker;
  color: string;
  stagger: number;
  isActive: boolean;
  onOpen: () => void;
}) {
  const tier = STAGE_TIER[banker.stage];
  const stageIndex = stageIdx(banker.stage);
  const style = { "--alma-stagger": `${80 + stagger * 80}ms` } as CSSProperties;

  return (
    <button
      type="button"
      onClick={onOpen}
      data-tier={tier}
      data-active={isActive || undefined}
      className="alma-banker-card w-full text-left"
      style={style}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-fraunces)] text-[14px] font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {initial(banker.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold leading-tight text-[#14182A]">
            {banker.name}
          </div>
          <div className="mt-[1px] truncate text-[11px] text-[#5C6472]">
            {banker.title ?? "-"}
            {banker.sameSchool && banker.university && (
              <> · {shortUniversity(banker.university)} alum</>
            )}
            {!banker.sameSchool && banker.gradYear && (
              <> · {String(banker.gradYear).slice(2)}</>
            )}
          </div>
        </div>
        <span className="alma-banker-warmth shrink-0 font-mono text-[10px] font-semibold tabular-nums">
          {banker.warmth}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex flex-1 gap-[3px]">
          {STAGE_ORDER.map((stage, index) => (
            <span
              key={stage}
              className="h-[4px] flex-1 rounded-[2px]"
              style={{
                backgroundColor:
                  index <= stageIndex
                    ? tier === "gold"
                      ? "#C9A24C"
                      : tier === "ochre"
                        ? "#E8B339"
                        : "#2E5A88"
                    : "#D9CFB5",
              }}
            />
          ))}
        </div>
        <span className="alma-banker-stage-label inline-flex shrink-0 items-baseline gap-1">
          <span className="alma-banker-stage-roman font-[family-name:var(--font-fraunces)] font-semibold italic">
            {STAGE_ROMAN[banker.stage]}
          </span>
          <span className="alma-banker-stage-name text-[9px] uppercase tracking-[0.08em]">
            {STAGE_NAME[banker.stage]}
          </span>
        </span>
      </div>
    </button>
  );
}

