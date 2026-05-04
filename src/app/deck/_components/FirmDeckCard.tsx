"use client";

import { useState } from "react";
import { STAGE_NAME, STAGE_ORDER, STAGE_ROMAN, STAGE_TIER } from "../_lib/constants";
import { firmColor, stageIdx } from "../_lib/deck-utils";
import type { FirmDeck } from "../_lib/types";
import { BankerSpreadCard } from "./BankerSpreadCard";

export function FirmDeckCard({
  deck,
  activeBankerId,
  onOpenBanker,
}: {
  deck: FirmDeck;
  activeBankerId: string | null;
  onOpenBanker: (bankerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const tierLabel = getTierLabel(deck.firmTier);
  const highestRoman = STAGE_ROMAN[deck.highestStage];
  const highestName = STAGE_NAME[deck.highestStage];
  const highestIndex = stageIdx(deck.highestStage);
  const histogramMax = Math.max(...deck.histogram, 1);
  const color = firmColor(deck.firmId);

  return (
    <div className="alma-deck" data-open={open || undefined} data-highest={highestRoman}>
      <div className="alma-deck-stack" onClick={() => setOpen((current) => !current)}>
        <div className="alma-deck-stack-card ghost-1" />
        <div className="alma-deck-stack-card ghost-2" />
        <div className="alma-deck-stack-card top" />
        <div className="alma-deck-top-content">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-[family-name:var(--font-fraunces)] text-[20px] font-semibold tracking-[-0.01em] text-[#14182A]">
                {deck.firmName}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A8674]">
                {tierLabel}
              </span>
            </div>
            <div className="mt-1.5 text-[12px] text-[#5C6472]">
              <strong className="font-semibold text-[#14182A]">{deck.bankers.length}</strong>{" "}
              banker{deck.bankers.length === 1 ? "" : "s"} · highest level{" "}
              <strong className="font-semibold text-[#14182A]">{highestRoman}</strong>{" "}
              <span className="text-[#8A8674]">{highestName}</span>
            </div>
            <Histogram histogram={deck.histogram} max={histogramMax} highestIndex={highestIndex} />
          </div>
          <div className="flex items-baseline justify-between text-[11px] text-[#5C6472]">
            <span className="truncate">
              {deck.bankers.some((b) => b.sameSchool)
                ? "Same-school alum in this deck"
                : `${tierLabel} · ${deck.bankers[0]?.title?.split(",")[0] ?? "Mixed"}`}
            </span>
            <span className="shrink-0 font-[family-name:var(--font-fraunces)] italic text-[#2E5A88]">
              tap to fan →
            </span>
          </div>
        </div>
      </div>

      <OpenHeader
        firmName={deck.firmName}
        bankerCount={deck.bankers.length}
        tierLabel={tierLabel}
        roman={highestRoman}
        name={highestName}
        onClose={() => setOpen(false)}
      />

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(false);
        }}
        className="alma-deck-close"
        aria-label="Close deck"
      >
        ×
      </button>

      <div className="alma-deck-spread">
        {deck.bankers.map((banker, index) => (
          <BankerSpreadCard
            key={banker.bankerId}
            banker={banker}
            color={color}
            stagger={index}
            isActive={banker.bankerId === activeBankerId}
            onOpen={() => onOpenBanker(banker.bankerId)}
          />
        ))}
      </div>
    </div>
  );
}

function Histogram({ histogram, max, highestIndex }: { histogram: number[]; max: number; highestIndex: number }) {
  return (
    <>
      <div className="alma-deck-histo mt-3 flex h-[20px] items-end gap-1">
        {histogram.map((count, index) => {
          const stage = STAGE_ORDER[index];
          const visualTier = STAGE_TIER[stage];
          const isHigh = index === highestIndex && count > 0;
          const height = count > 0 ? Math.max(8, Math.round((count / max) * 18)) : 4;
          const color =
            count === 0
              ? "#D9CFB5"
              : isHigh && visualTier === "gold"
                ? "#C9A24C"
                : isHigh && visualTier === "ochre"
                  ? "#E8B339"
                  : "#2E5A88";
          return (
            <div
              key={stage}
              className="flex-1 rounded-[2px]"
              style={{ height: `${height}px`, backgroundColor: color }}
              title={`${STAGE_ROMAN[stage]} · ${STAGE_NAME[stage]}: ${count}`}
            />
          );
        })}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-center font-mono text-[8px] text-[#8A8674]">
        {STAGE_ORDER.map((stage) => (
          <span key={stage}>{STAGE_ROMAN[stage]}</span>
        ))}
      </div>
    </>
  );
}

function OpenHeader({
  firmName,
  bankerCount,
  tierLabel,
  roman,
  name,
  onClose,
}: {
  firmName: string;
  bankerCount: number;
  tierLabel: string;
  roman: string;
  name: string;
  onClose: () => void;
}) {
  return (
    <button
      type="button"
      className="alma-deck-open-header"
      onClick={onClose}
      aria-label={`Close ${firmName} deck`}
    >
      <div className="min-w-0">
        <div className="truncate font-[family-name:var(--font-fraunces)] text-[16px] font-semibold text-[#14182A]">
          {firmName}
        </div>
        <div className="mt-[1px] text-[11px] text-[#5C6472]">
          <strong className="font-semibold text-[#14182A]">{bankerCount}</strong> bankers · {tierLabel}
        </div>
      </div>
      <span className="alma-deck-stage-pill">
        <span className="alma-deck-stage-roman">{roman}</span>
        <span className="alma-deck-stage-name">{name}</span>
      </span>
    </button>
  );
}

function getTierLabel(tier: FirmDeck["firmTier"]): string {
  if (tier === "bulge_bracket") return "BB";
  if (tier === "elite_boutique") return "EB";
  if (tier === "middle_market") return "MM";
  return "Firm";
}
