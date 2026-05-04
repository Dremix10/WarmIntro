import { FilterPill } from "./FilterPill";
import type { DeckBanker, TierFilter, WarmthFilter } from "../_lib/types";

export interface DeckCounts {
  all: number;
  bb: number;
  eb: number;
  mm: number;
  sameSchool: number;
  warm70: number;
  warm85: number;
}

export function getDeckCounts(bankers: DeckBanker[]): DeckCounts {
  return {
    all: bankers.length,
    bb: bankers.filter((b) => b.firmTier === "bulge_bracket").length,
    eb: bankers.filter((b) => b.firmTier === "elite_boutique").length,
    mm: bankers.filter((b) => b.firmTier === "middle_market").length,
    sameSchool: bankers.filter((b) => b.sameSchool).length,
    warm70: bankers.filter((b) => b.warmth >= 70).length,
    warm85: bankers.filter((b) => b.warmth >= 85).length,
  };
}

export function DeckFilters({
  counts,
  deckCount,
  tierFilter,
  warmthFilter,
  sameSchoolOnly,
  onTierChange,
  onWarmthChange,
  onSameSchoolChange,
}: {
  counts: DeckCounts;
  deckCount: number;
  tierFilter: TierFilter;
  warmthFilter: WarmthFilter;
  sameSchoolOnly: boolean;
  onTierChange: (filter: TierFilter) => void;
  onWarmthChange: (filter: WarmthFilter) => void;
  onSameSchoolChange: (value: boolean) => void;
}) {
  return (
    <div className="mb-3 rounded-xl border border-[#D9CFB5] bg-white px-3 py-2.5">
      <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden">
        <FilterPill active={tierFilter === "all"} onClick={() => onTierChange("all")} count={counts.all}>All</FilterPill>
        <FilterPill active={tierFilter === "bulge_bracket"} onClick={() => onTierChange("bulge_bracket")} count={counts.bb}>BB</FilterPill>
        <FilterPill active={tierFilter === "elite_boutique"} onClick={() => onTierChange("elite_boutique")} count={counts.eb}>EB</FilterPill>
        <FilterPill active={tierFilter === "middle_market"} onClick={() => onTierChange("middle_market")} count={counts.mm}>MM</FilterPill>
        <span className="mx-1.5 h-4 w-px shrink-0 bg-[#ECE7DE]" aria-hidden />
        <FilterPill active={warmthFilter === "all"} onClick={() => onWarmthChange("all")}>Any warmth</FilterPill>
        <FilterPill active={warmthFilter === "70"} onClick={() => onWarmthChange("70")} count={counts.warm70}>70+</FilterPill>
        <FilterPill active={warmthFilter === "85"} onClick={() => onWarmthChange("85")} count={counts.warm85}>85+</FilterPill>
        <span className="mx-1.5 h-4 w-px shrink-0 bg-[#ECE7DE]" aria-hidden />
        <FilterPill active={sameSchoolOnly} onClick={() => onSameSchoolChange(!sameSchoolOnly)} count={counts.sameSchool}>
          Same school
        </FilterPill>
        <span className="ml-auto hidden shrink-0 pl-3 text-[11px] text-[#8A8674] sm:inline">
          {deckCount} deck{deckCount === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-1.5 text-right text-[10px] text-[#8A8674] sm:hidden">
        {deckCount} deck{deckCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}

