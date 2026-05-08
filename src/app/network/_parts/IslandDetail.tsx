"use client";

import { useEffect } from "react";
import { StageGlyph, STAGE_LABEL, SvgDefs } from "./Archipelago";
import type { Island, Marker } from "./Archipelago";

export function IslandDetail({ island, onClose }: { island: Island; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const sorted = [...island.markers].sort((a, b) => b.warmth - a.warmth);
  const strongest = sorted[0];
  const averageWarmth = Math.round(island.markers.reduce((s, m) => s + m.warmth, 0) / island.markers.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B3B5F]/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-[#D9CFB5] bg-[#FBF7EC] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[#ECE5D0] bg-white px-6 py-5">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#5C6472]">
              {island.cluster} · island
            </p>
            <h2 className="mt-1.5 text-3xl font-[family-name:var(--font-fraunces)] leading-none text-[#14182A]">
              {island.company}
            </h2>
            <p className="mt-2 text-sm text-[#4A5260]">
              {island.markers.length} {island.markers.length === 1 ? "intro" : "intros"} on this
              island. <span className="font-semibold text-[#14182A]">{strongest.name.split(" ")[0]}</span>{" "}
              is your warmest (warmth{" "}
              <span className="font-semibold text-[#14182A] tabular-nums">{strongest.warmth}</span>/100).
              Bigger builds below mean warmer connections — spend your hour there first.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D9CFB5] bg-white text-sm text-[#5C6472] transition-colors hover:border-[#2E5A88] hover:text-[#1B3B5F]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1.05fr_1fr] md:gap-6 md:p-6">
          <div className="relative overflow-hidden rounded-2xl border border-[#D9CFB5] bg-gradient-to-b from-[#D8E6EC] to-[#7FA3B5]">
            <svg viewBox="-240 -220 480 440" className="block h-auto w-full">
              <SvgDefs />
              <DetailIsland island={island} />
            </svg>
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl bg-white/95 px-3 py-2 text-[10px] text-[#1B3B5F] shadow-sm">
              <p className="font-semibold uppercase tracking-[0.14em]">Bigger = warmer connection</p>
              <p className="mt-0.5 font-normal text-[#5C6472] normal-case tracking-normal">
                Icon = stage · size = warmth 0–100
              </p>
            </div>
          </div>

          <div className="flex flex-col">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#5C6472]">
              Who’s on this island
            </p>
            <div className="mt-3 space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: 420 }}>
              {sorted.map((m, i) => (
                <PersonRow key={m.name} marker={m} rank={i + 1} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ECE5D0] bg-white px-6 py-4">
          <p className="text-xs italic text-[#5C6472] font-[family-name:var(--font-fraunces)]">
            “Warmth is the score 0–100 that measures how close this person is to you. Focus on
            the bigger builds.”
          </p>
          <div className="flex gap-2">
            <a
              href="/pipeline"
              className="rounded-full border border-[#D9CFB5] bg-white px-4 py-1.5 text-xs font-medium text-[#1B3B5F] hover:border-[#2E5A88]"
            >
              View in Pipeline
            </a>
            <button
              type="button"
              className="rounded-full bg-[#1B3B5F] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#2E5A88]"
            >
              Draft outreach →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailIsland({ island }: { island: Island }) {
  const SCALE = 1.9;
  const path = island.path;

  return (
    <g transform={`rotate(${island.rotation}) scale(${SCALE})`}>
      <path d={path} transform="scale(1.3)" fill="#BBD6DC" opacity={0.28} filter="url(#softer)" />
      <path d={path} transform="scale(1.18)" fill="none" stroke="#E9F1F3" strokeWidth={2} opacity={0.55} />
      <path d={path} transform="scale(1.08) translate(3 7)" fill="#1B3B5F" opacity={0.18} filter="url(#softer)" />
      <path d={path} transform="scale(1.08)" fill="url(#beach)" />
      <path d={path} transform="scale(1.03)" fill="#D8BC85" opacity={0.55} />
      <path d={path} fill="url(#land)" />

      {island.details.vegetation.map((v, i) => (
        <ellipse key={i} cx={v.cx} cy={v.cy} rx={v.rx} ry={v.ry} fill="#5F7448" opacity={v.opacity ?? 0.45} transform={`rotate(${v.rot} ${v.cx} ${v.cy})`} />
      ))}

      <path d={path} transform="scale(0.84) translate(-6 -8)" fill="#D7E2B8" opacity={0.3} />

      {island.details.ridge && (
        <path d={island.details.ridge} fill="none" stroke="#3D5136" strokeWidth={1} opacity={0.35} strokeLinecap="round" />
      )}

      {island.markers.map((m, i) => (
        <DetailMarker key={i} marker={m} rotation={-island.rotation} />
      ))}
    </g>
  );
}

function DetailMarker({ marker, rotation }: { marker: Marker; rotation: number }) {
  const scale = warmthToScale(marker.warmth);
  return (
    <g transform={`translate(${marker.dx} ${marker.dy})`}>
      {marker.fresh && (
        <circle r={18 * scale} fill="#C86B4F" opacity={0.22}>
          <animate attributeName="r" values={`${14 * scale};${22 * scale};${14 * scale}`} dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0.1;0.35" dur="3s" repeatCount="indefinite" />
        </circle>
      )}
      <g transform={`scale(${scale})`}>
        <StageGlyph stage={marker.stage} />
      </g>
      <g transform={`rotate(${rotation})`}>
        <rect
          x={-marker.name.length * 2.2 - 4}
          y={12 * scale + 2}
          width={marker.name.length * 4.4 + 8}
          height={12}
          rx={6}
          fill="#FBF7EC"
          opacity={0.9}
        />
        <text y={12 * scale + 10} textAnchor="middle" fontSize={8.5} fill="#1B3B5F" fontWeight={500}>
          {marker.name.split(" ")[0]}
        </text>
        <text y={12 * scale + 20} textAnchor="middle" fontSize={7.5} fill="#5C6472" fontWeight={600} letterSpacing={0.8}>
          {marker.warmth}
        </text>
      </g>
    </g>
  );
}

function warmthToScale(warmth: number): number {
  return 0.7 + (warmth / 100) * 1.5;
}

const STAGE_BADGE_BG: Record<Marker["stage"], string> = {
  sent: "bg-[#F4EDDB] text-[#5C6472]",
  replied: "bg-[#EAF0E4] text-[#4D6A4A]",
  coffee: "bg-[#FFF8E8] text-[#B08100]",
  referral: "bg-[#FDEFE7] text-[#C86B4F]",
  interview: "bg-[#1B3B5F] text-white",
};

function PersonRow({ marker, rank }: { marker: Marker; rank: number }) {
  const badge = STAGE_BADGE_BG[marker.stage];
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#ECE5D0] bg-white p-3 transition-colors hover:border-[#2E5A88]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4EDDB] text-sm font-[family-name:var(--font-fraunces)] text-[#1B3B5F]">
        {marker.name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-[#14182A]">{marker.name}</p>
          <span className="shrink-0 rounded-full bg-[#F4EDDB] px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-[#5C6472]">
            #{rank}
          </span>
          {marker.fresh && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-[#C86B4F]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C86B4F]" />fresh
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-[#5C6472]">{marker.role}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F4EDDB]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1B3B5F] to-[#3F6FA3]"
              style={{ width: `${marker.warmth}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] tabular-nums text-[#14182A]">
            warmth <span className="font-semibold">{marker.warmth}</span>
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${badge}`}>
          {STAGE_LABEL[marker.stage]}
        </span>
        <svg viewBox="-14 -14 28 28" className="h-7 w-7">
          <StageGlyph stage={marker.stage} />
        </svg>
      </div>
    </div>
  );
}
