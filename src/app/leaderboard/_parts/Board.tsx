"use client";

import { useState, useMemo } from "react";

type Entry = {
  rank: number;
  name: string;
  school: string;
  xp: number;
  streak: number;
  trend: "up" | "down" | "same";
  trendAmount?: number;
  isYou?: boolean;
};

type BoardKey = "cohort" | "brown" | "alma";
type Range = "week" | "month" | "all";

const BOARDS: { id: BoardKey; label: string; count: number; subtitle: string }[] = [
  { id: "cohort", label: "Brown CS ’27", count: 48, subtitle: "your cohort" },
  { id: "brown", label: "Brown Alma", count: 312, subtitle: "all Brown students" },
  { id: "alma", label: "All Alma", count: 1847, subtitle: "every school" },
];

const RANGES: { id: Range; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

const COHORT_WEEK: Entry[] = [
  { rank: 1, name: "Priya Shah", school: "Brown CS ’26", xp: 260, streak: 14, trend: "same" },
  { rank: 2, name: "Dana Kim", school: "Brown CS ’27", xp: 230, streak: 11, trend: "up", trendAmount: 1 },
  { rank: 3, name: "Marcus Lee", school: "Brown CS ’25", xp: 210, streak: 8, trend: "down", trendAmount: 1 },
  { rank: 4, name: "Lena Cohen", school: "Brown CS ’27", xp: 195, streak: 6, trend: "up", trendAmount: 3 },
  { rank: 5, name: "Arjun Rao", school: "Brown CS ’26", xp: 185, streak: 7, trend: "same" },
  { rank: 6, name: "Camille Dubois", school: "Brown CS ’27", xp: 170, streak: 5, trend: "up", trendAmount: 2 },
  { rank: 7, name: "Owen Park", school: "Brown CS ’27", xp: 160, streak: 9, trend: "down", trendAmount: 2 },
  { rank: 8, name: "Ines Alonso", school: "Brown CS ’26", xp: 150, streak: 4, trend: "up", trendAmount: 4 },
  { rank: 9, name: "Tariq Hassan", school: "Brown CS ’25", xp: 145, streak: 6, trend: "same" },
  { rank: 10, name: "Sam Okafor", school: "Brown CS ’27", xp: 140, streak: 7, trend: "up", trendAmount: 7 },
  { rank: 11, name: "Jordan Klein", school: "Brown CS ’27", xp: 130, streak: 9, trend: "down", trendAmount: 1 },
  { rank: 12, name: "Kinsey Harper", school: "Brown CS ’27", xp: 120, streak: 7, trend: "up", trendAmount: 2, isYou: true },
  { rank: 13, name: "Riya Sharma", school: "Brown CS ’27", xp: 115, streak: 5, trend: "same" },
  { rank: 14, name: "Ben Torres", school: "Brown CS ’25", xp: 105, streak: 3, trend: "up", trendAmount: 1 },
  { rank: 15, name: "Yara Mansour", school: "Brown CS ’26", xp: 95, streak: 4, trend: "down", trendAmount: 3 },
];

export function Board() {
  const [board, setBoard] = useState<BoardKey>("cohort");
  const [range, setRange] = useState<Range>("week");
  const [showFull, setShowFull] = useState(false);

  const entries = COHORT_WEEK;
  const you = useMemo(() => entries.find((e) => e.isYou), [entries]);
  const ahead = you ? entries.find((e) => e.rank === you.rank - 1) : undefined;
  const visible = showFull ? entries : entries.slice(0, 15);
  const rangeLabel = RANGES.find((r) => r.id === range)?.label.toLowerCase();
  const activeBoard = BOARDS.find((b) => b.id === board);

  return (
    <>
      {you && ahead && (
        <div className="mt-8 rounded-2xl border border-[#2E5A88]/30 bg-white p-5">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2E5A88] to-[#1B3B5F] text-xl font-[family-name:var(--font-fraunces)] text-white">
              #{you.rank}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5C6472]">Your position · this week</p>
              <p className="mt-1 text-base font-semibold text-[#14182A]">
                {you.xp} xp · {you.streak} day streak
              </p>
              <p
                className="mt-1 text-xs text-[#5C6472]"
                dangerouslySetInnerHTML={{
                  __html: `${you.xp - ahead.xp >= 0 ? you.xp - ahead.xp : ahead.xp - you.xp} xp from #${ahead.rank} (${ahead.name.split(" ")[0]}). Close it by Sunday.`,
                }}
              />
            </div>
            <TrendChip trend={you.trend} amount={you.trendAmount} />
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-[#D9CFB5] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {BOARDS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBoard(b.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  board === b.id
                    ? "border-[#1B3B5F] bg-[#1B3B5F] text-white"
                    : "border-[#D9CFB5] bg-white text-[#14182A] hover:border-[#2E5A88]"
                }`}
              >
                <span dangerouslySetInnerHTML={{ __html: b.label }} />
                <span className={`tabular-nums ${board === b.id ? "text-white/70" : "text-[#5C6472]"}`}>
                  {b.count}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-0.5 rounded-full border border-[#D9CFB5] bg-[#F4EDDB] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                className={`rounded-full px-3.5 py-1 text-[11px] font-medium transition-colors ${
                  range === r.id ? "bg-[#1B3B5F] text-white" : "text-[#5C6472] hover:text-[#14182A]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#D9CFB5] bg-white">
        <div className="flex items-baseline justify-between border-b border-[#ECE5D0] bg-[#F8F2E2] px-5 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#5C6472]">
            {activeBoard && <span dangerouslySetInnerHTML={{ __html: activeBoard.label }} />} &middot;{" "}
            {rangeLabel}
          </p>
          <p className="text-[10px] text-[#5C6472] tabular-nums">
            {activeBoard?.count} students · {Math.round((activeBoard?.count ?? 0) * 0.77)} active
          </p>
        </div>

        <div className="divide-y divide-[#ECE5D0]">
          {visible.map((e) => (
            <LeaderboardRow key={e.rank} e={e} />
          ))}
        </div>

        {!showFull && entries.length > 15 && (
          <div className="flex justify-center border-t border-[#ECE5D0] bg-[#FBF7EC] py-3">
            <button
              type="button"
              onClick={() => setShowFull(true)}
              className="text-xs font-medium text-[#2E5A88] hover:underline"
            >
              Show full board ({entries.length}) ↓
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function LeaderboardRow({ e }: { e: Entry }) {
  const medalBg =
    e.rank === 1
      ? "bg-[#E8B339] text-white"
      : e.rank === 2
      ? "bg-[#B8B2A0] text-white"
      : e.rank === 3
      ? "bg-[#C86B4F] text-white"
      : e.isYou
      ? "bg-gradient-to-br from-[#2E5A88] to-[#1B3B5F] text-white"
      : "bg-[#F4EDDB] text-[#14182A]";

  return (
    <div
      className={`grid grid-cols-[48px_32px_1fr_auto_auto] items-center gap-4 px-5 py-3.5 transition-colors ${
        e.isYou ? "bg-[#F8F2E2]" : "hover:bg-[#FBF7EC]"
      }`}
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-[family-name:var(--font-fraunces)] tabular-nums ${medalBg}`}>
        {e.rank}
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F4EDDB] text-xs font-[family-name:var(--font-fraunces)] text-[#1B3B5F]">
        {e.name[0]}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-[#14182A]">
            {e.name}
            {e.isYou && <span className="ml-2 rounded-full bg-[#1B3B5F] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">you</span>}
          </p>
        </div>
        <p className="truncate text-xs text-[#5C6472]" dangerouslySetInnerHTML={{ __html: e.school }} />
      </div>
      <div className="text-right">
        <p className="font-[family-name:var(--font-fraunces)] text-base tabular-nums leading-none text-[#14182A]">
          {e.xp}
        </p>
        <p className="mt-0.5 text-[10px] tabular-nums text-[#5C6472]">{e.streak}d streak</p>
      </div>
      <TrendChip trend={e.trend} amount={e.trendAmount} />
    </div>
  );
}

function TrendChip({ trend, amount }: { trend: Entry["trend"]; amount?: number }) {
  if (trend === "same") {
    return <span className="inline-flex h-6 w-6 items-center justify-center text-xs text-[#8A8674]">·</span>;
  }
  const up = trend === "up";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
        up ? "bg-[#EAF0E7] text-[#4D6A4A]" : "bg-[#FDEFE7] text-[#C86B4F]"
      }`}
    >
      <span>{up ? "▲" : "▼"}</span>
      {amount ?? 1}
    </span>
  );
}
