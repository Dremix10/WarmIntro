"use client";

import { useState } from "react";
import { STAGE_LABEL } from "../_lib/constants";
import { initial, priorityDims, priorityTier, statusFor } from "../_lib/pipeline-utils";
import type { PipelineRow } from "../_lib/types";

export function Station({
  firmColor,
  bankers,
  onOpen,
  activeBankerId,
}: {
  firmColor: string;
  bankers: PipelineRow[];
  onOpen: (bankerId: string) => void;
  activeBankerId: string | null;
}) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const visible = bankers.slice(0, 4);
  const overflow = bankers.length - visible.length;

  return (
    <div className="relative h-full flex items-center justify-center">
      <span
        className="absolute top-1/2 left-1/2 z-[1] h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2px] bg-white"
        style={{ borderColor: firmColor }}
        aria-hidden
      />

      {bankers.length > 0 && (
        <div className="absolute top-1/2 left-1/2 z-[3] flex -translate-x-1/2 -translate-y-1/2 flex-col-reverse items-center">
          {visible.slice().reverse().map((row) => (
            <BankerMarker
              key={row.id}
              row={row}
              firmColor={firmColor}
              onClick={() => onOpen(row.bankerId)}
              isActive={row.bankerId === activeBankerId}
            />
          ))}
          {overflow > 0 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOverflowOpen(true);
              }}
              className="-mb-[10px] mt-[2px] cursor-pointer rounded-full border-2 border-[#F4EDDB] bg-[#14182A] px-2.5 py-[3px] text-[11px] font-bold text-white shadow-[0_4px_10px_-2px_rgba(20,24,42,0.32)] transition-transform hover:scale-105"
              aria-label={`Show ${overflow} more`}
            >
              +{overflow}
            </button>
          )}
        </div>
      )}

      {overflowOpen && (
        <OverflowList
          firmColor={firmColor}
          bankers={bankers}
          onPick={(id) => {
            setOverflowOpen(false);
            onOpen(id);
          }}
          onClose={() => setOverflowOpen(false)}
        />
      )}
    </div>
  );
}

function BankerMarker({
  row,
  firmColor,
  onClick,
  isActive,
}: {
  row: PipelineRow;
  firmColor: string;
  onClick: () => void;
  isActive: boolean;
}) {
  const tier = priorityTier(row);
  const { size, font } = priorityDims(tier);
  const status = statusFor(row);
  const haloAnimation =
    status === "positive"
      ? "alma-halo-positive 2.6s ease-in-out infinite"
      : status === "due"
        ? "alma-halo-due 2.6s ease-in-out infinite"
        : undefined;
  const topHaloShadow =
    tier === "top"
      ? "0 0 0 3px #F4EDDB, 0 0 0 6px rgba(46,90,136,0.20), 0 8px 20px -4px rgba(20,24,42,0.32)"
      : "0 0 0 3px #F4EDDB, 0 4px 12px -2px rgba(20,24,42,0.18)";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      data-status={status ?? undefined}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${font}px`,
        backgroundColor: firmColor,
        boxShadow: topHaloShadow,
        animation: haloAnimation,
        marginTop: "-10px",
        isolation: "isolate",
        zIndex: 2,
      }}
      className={`relative flex cursor-pointer items-center justify-center rounded-full font-[family-name:var(--font-fraunces)] font-semibold text-white transition-transform hover:scale-110 ${
        isActive ? "ring-2 ring-[#1B3B5F] ring-offset-2 ring-offset-[#F4EDDB]" : ""
      }`}
      title={`${row.name} - ${STAGE_LABEL[row.stage]} - warmth ${row.warmth ?? "-"}`}
      aria-label={`Open ${row.name}`}
    >
      {initial(row.name)}
    </button>
  );
}

function OverflowList({
  firmColor,
  bankers,
  onPick,
  onClose,
}: {
  firmColor: string;
  bankers: PipelineRow[];
  onPick: (bankerId: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14182A]/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#D9CFB5] bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5C6472]">
            {bankers.length} bankers at this station
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-xl leading-none text-[#14182A]/40 hover:text-[#14182A]"
          >
            x
          </button>
        </div>
        <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
          {bankers.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onPick(row.bankerId)}
              className="flex w-full items-center gap-3 rounded-lg border border-[#ECE7DE] bg-white px-3 py-2 text-left transition-colors hover:border-[#2E5A88] hover:bg-[#EAE3D2]/40"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-fraunces)] text-sm font-semibold text-white"
                style={{ backgroundColor: firmColor }}
              >
                {initial(row.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[#14182A]">
                  {row.name}
                </span>
                <span className="block truncate text-[11px] text-[#8A8674]">
                  {row.title ?? "-"}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-[#8A8674]">
                warmth {row.warmth ?? "-"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
