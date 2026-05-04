import { FIRM_COLORS, STAGE_ORDER } from "./constants";
import type { DeckBanker, FirmDeck, Stage, TierFilter, WarmthFilter } from "./types";

export function stageIdx(stage: Stage): number {
  return STAGE_ORDER.indexOf(stage as Exclude<Stage, "closed_lost">);
}

export function shortUniversity(university: string): string {
  return university.replace(/\s*University$/i, "").trim();
}

export function initial(name: string): string {
  return (name.trim().split(/\s+/)[0]?.[0] ?? "?").toUpperCase();
}

export function firmColor(firmId: string): string {
  let hash = 0;
  for (let i = 0; i < firmId.length; i++) {
    hash = (hash * 31 + firmId.charCodeAt(i)) >>> 0;
  }
  return FIRM_COLORS[hash % FIRM_COLORS.length];
}

export function buildFirmDecks(
  bankers: DeckBanker[],
  tierFilter: TierFilter,
  warmthFilter: WarmthFilter,
  sameSchoolOnly: boolean,
): FirmDeck[] {
  const decksByFirm = new Map<string, FirmDeck>();

  for (const banker of bankers) {
    if (!shouldIncludeBanker(banker, tierFilter, warmthFilter, sameSchoolOnly)) continue;
    const firmId = banker.firmId;
    if (!firmId) continue;

    if (!decksByFirm.has(firmId)) {
      decksByFirm.set(firmId, {
        firmId,
        firmName: banker.firmName ?? "Unknown firm",
        firmTier: banker.firmTier,
        bankers: [],
        highestStage: "sent",
        histogram: [0, 0, 0, 0, 0, 0, 0],
      });
    }

    const deck = decksByFirm.get(firmId)!;
    deck.bankers.push(banker);
    const idx = stageIdx(banker.stage);
    if (idx >= 0) {
      deck.histogram[idx]++;
      if (idx > stageIdx(deck.highestStage)) deck.highestStage = banker.stage;
    }
  }

  for (const deck of decksByFirm.values()) {
    deck.bankers.sort((a, b) => stageIdx(b.stage) - stageIdx(a.stage) || b.warmth - a.warmth);
  }

  return Array.from(decksByFirm.values()).sort(
    (a, b) =>
      stageIdx(b.highestStage) - stageIdx(a.highestStage) ||
      b.bankers.length - a.bankers.length,
  );
}

function shouldIncludeBanker(
  banker: DeckBanker,
  tierFilter: TierFilter,
  warmthFilter: WarmthFilter,
  sameSchoolOnly: boolean,
): boolean {
  if (!banker.firmId) return false;
  if (tierFilter !== "all" && banker.firmTier !== tierFilter) return false;
  if (warmthFilter === "70" && banker.warmth < 70) return false;
  if (warmthFilter === "85" && banker.warmth < 85) return false;
  if (sameSchoolOnly && !banker.sameSchool) return false;
  return true;
}

