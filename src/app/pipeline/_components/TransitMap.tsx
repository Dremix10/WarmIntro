"use client";

import { useMemo } from "react";
import { STATIONS, TIER_FILTERS, tierLabel } from "../_lib/constants";
import { buildMapView } from "../_lib/build-map-view";
import type { PipelineRow, TierFilter } from "../_lib/types";
import { FirmLine } from "./FirmLine";

export function TransitMap({
  rows,
  tierFilter,
  onTierFilterChange,
  activeBankerId,
  onOpenBanker,
}: {
  rows: PipelineRow[];
  tierFilter: TierFilter;
  onTierFilterChange: (tier: TierFilter) => void;
  activeBankerId: string | null;
  onOpenBanker: (bankerId: string) => void;
}) {
  const totalActive = rows.filter(
    (row) => row.stage !== "draft" && row.stage !== "closed_lost",
  ).length;
  const { firms, stationsByFirm, attentionCount } = useMemo(
    () => buildMapView(rows, tierFilter),
    [rows, tierFilter],
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-[#D9CFB5] bg-white px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          {TIER_FILTERS.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => onTierFilterChange(tier)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                tierFilter === tier
                  ? "border-[#1B3B5F] bg-[#1B3B5F] text-white"
                  : "border-[#D9CFB5] bg-white text-[#5C6472] hover:border-[#2E5A88] hover:text-[#1B3B5F]"
              }`}
            >
              {tierLabel(tier)}
            </button>
          ))}
          <span className="ml-3 text-[11px] text-[#8A8674]">
            {firms.length} firm{firms.length === 1 ? "" : "s"} - {totalActive} banker
            {totalActive === 1 ? "" : "s"}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-5 text-[11px] text-[#5C6472]">
          <LegendDot color="#2E5A88" label="Fresh activity" />
          <LegendDot color="#E8B339" label="Action due" />
        </div>
      </div>

      {attentionCount > 0 && (
        <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-[#FCD34D]/55 bg-[#E8B339]/12 px-3.5 py-2.5 text-[12px] text-[#14182A]">
          <span className="rounded-full bg-[#E8B339] px-2 py-[1px] text-[10px] font-bold uppercase tracking-[0.06em] text-[#14182A]">
            Today
          </span>
          <span>
            <strong className="font-semibold">{attentionCount}</strong> banker
            {attentionCount === 1 ? "" : "s"} on the map need attention. Click
            any pulsing marker.
          </span>
        </div>
      )}

      {firms.length === 0 ? (
        <div className="rounded-2xl border border-[#D9CFB5] bg-white p-8 text-center text-sm text-[#14182A]/65">
          No active bankers match this filter.
        </div>
      ) : (
        <div className="relative overflow-x-auto rounded-2xl border border-[#D9CFB5] bg-gradient-to-b from-[#FCFAF5] to-[#F4EDDB] p-4 pt-16 sm:p-6 sm:pt-20">
          <div
            className="mb-2 grid items-baseline pb-3"
            style={{
              gridTemplateColumns: `140px repeat(${STATIONS.length}, minmax(0, 1fr))`,
              minWidth: "900px",
            }}
          >
            <div />
            {STATIONS.map((station) => (
              <div key={station.stage} className="relative pb-2 text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5C6472]">
                  {station.label}
                </div>
                <div className="mt-[2px] font-mono text-[9px] text-[#8A8674]">
                  {station.sub}
                </div>
                <span
                  className="absolute bottom-0 left-1/2 h-[9px] w-px -translate-x-1/2 bg-[#D9CFB5]"
                  aria-hidden
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            {firms.map((firm) => (
              <FirmLine
                key={firm.id}
                firm={firm}
                stationsByFirm={stationsByFirm}
                activeBankerId={activeBankerId}
                onOpenBanker={onOpenBanker}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex min-w-[120px] items-center">
      <span
        className="mr-2 inline-block h-[10px] w-[10px] shrink-0 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 0 2px white inset, 0 0 0 3px ${color}`,
        }}
        aria-hidden
      />
      {label}
    </span>
  );
}
