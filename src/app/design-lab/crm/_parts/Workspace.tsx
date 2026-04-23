"use client";

import { useMemo, useState } from "react";
import { Column } from "./Column";
import { ListView } from "./ListView";
import { AttentionRow } from "./AttentionRow";
import { CONNECTIONS, STAGES } from "./data";
import type { Stage, University, Connection } from "./ConnectionCard";

type Sort = "warmth-desc" | "warmth-asc" | "recent" | "stale" | "alpha";
type View = "board" | "list";
type Activity = "all" | "fresh" | "quiet";

const SORT_OPTIONS: { id: Sort; label: string }[] = [
  { id: "warmth-desc", label: "Warmth · high → low" },
  { id: "warmth-asc", label: "Warmth · low → high" },
  { id: "recent", label: "Most recent activity" },
  { id: "stale", label: "Longest since contact" },
  { id: "alpha", label: "Name A → Z" },
];

export function Workspace() {
  const [view, setView] = useState<View>("board");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("warmth-desc");
  const [university, setUniversity] = useState<"all" | University>("all");
  const [activity, setActivity] = useState<Activity>("all");
  const [stage, setStage] = useState<"all" | Stage>("all");
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = CONNECTIONS.filter((c) => {
      if (q && !`${c.name} ${c.company} ${c.role}`.toLowerCase().includes(q)) return false;
      if (university !== "all" && c.university !== university) return false;
      if (activity === "fresh" && !c.fresh) return false;
      if (activity === "quiet" && !c.needsFollowUp) return false;
      if (stage !== "all" && c.stage !== stage) return false;
      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case "warmth-desc": return b.warmth - a.warmth;
        case "warmth-asc": return a.warmth - b.warmth;
        case "recent": return a.daysAgo - b.daysAgo;
        case "stale": return b.daysAgo - a.daysAgo;
        case "alpha": return a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [search, sort, university, activity, stage]);

  const activeFilters =
    (search ? 1 : 0) + (university !== "all" ? 1 : 0) + (activity !== "all" ? 1 : 0) + (stage !== "all" ? 1 : 0);

  const clearAll = () => {
    setSearch("");
    setUniversity("all");
    setActivity("all");
    setStage("all");
  };

  const universityCounts = {
    all: CONNECTIONS.length,
    Brown: CONNECTIONS.filter((c) => c.university === "Brown").length,
    Rice: CONNECTIONS.filter((c) => c.university === "Rice").length,
    Other: CONNECTIONS.filter((c) => c.university === "Other").length,
  };

  const activityCounts = {
    all: CONNECTIONS.length,
    fresh: CONNECTIONS.filter((c) => c.fresh).length,
    quiet: CONNECTIONS.filter((c) => c.needsFollowUp).length,
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.id === sort)?.label ?? "";

  return (
    <>
      <AttentionRow
        onFresh={() => setActivity("fresh")}
        onQuiet={() => setActivity("quiet")}
        onUpcoming={() => setStage("coffee")}
        freshCount={activityCounts.fresh}
        quietCount={activityCounts.quiet}
      />

      <div className="mt-6 rounded-2xl border border-[#D9CFB5] bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-[#D9CFB5] bg-[#FBF7EC] px-3.5 py-1.5">
            <span className="text-[#5C6472]">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, company, role…"
              className="w-full bg-transparent text-xs text-[#14182A] placeholder:text-[#8A8674] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs text-[#5C6472] hover:text-[#1B3B5F]"
              >
                ✕
              </button>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-[#D9CFB5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#14182A] hover:border-[#2E5A88]"
            >
              <span className="text-[#5C6472]">Sort</span>
              <span>{currentSortLabel}</span>
              <span className="text-[#5C6472]">▾</span>
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full z-10 mt-2 w-60 overflow-hidden rounded-xl border border-[#D9CFB5] bg-white shadow-lg shadow-[#1B3B5F]/5">
                {SORT_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => { setSort(o.id); setSortOpen(false); }}
                    className={`block w-full px-4 py-2.5 text-left text-xs transition-colors ${
                      sort === o.id ? "bg-[#F4EDDB] font-semibold text-[#1B3B5F]" : "text-[#14182A] hover:bg-[#FBF7EC]"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-0.5 rounded-full border border-[#D9CFB5] bg-[#F4EDDB] p-0.5">
            <ToggleTab active={view === "board"} onClick={() => setView("board")}>Board</ToggleTab>
            <ToggleTab active={view === "list"} onClick={() => setView("list")}>List</ToggleTab>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#ECE5D0] pt-3">
          <FilterGroup label="University">
            <Chip active={university === "all"} onClick={() => setUniversity("all")} count={universityCounts.all}>All</Chip>
            <Chip active={university === "Brown"} onClick={() => setUniversity("Brown")} count={universityCounts.Brown}>Brown</Chip>
            <Chip active={university === "Rice"} onClick={() => setUniversity("Rice")} count={universityCounts.Rice}>Rice</Chip>
            <Chip active={university === "Other"} onClick={() => setUniversity("Other")} count={universityCounts.Other}>Other</Chip>
          </FilterGroup>
          <FilterGroup label="Activity">
            <Chip active={activity === "all"} onClick={() => setActivity("all")} count={activityCounts.all}>All</Chip>
            <Chip active={activity === "fresh"} onClick={() => setActivity("fresh")} count={activityCounts.fresh} accent="clay">Fresh reply</Chip>
            <Chip active={activity === "quiet"} onClick={() => setActivity("quiet")} count={activityCounts.quiet} accent="clay">Needs follow-up</Chip>
          </FilterGroup>
          {view === "list" && (
            <FilterGroup label="Stage">
              <Chip active={stage === "all"} onClick={() => setStage("all")}>All</Chip>
              {STAGES.map((s) => (
                <Chip key={s.id} active={stage === s.id} onClick={() => setStage(s.id)}>{s.label}</Chip>
              ))}
            </FilterGroup>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[#ECE5D0] pt-3 text-xs text-[#5C6472]">
          <p>
            <span className="font-semibold text-[#14182A] tabular-nums">{filtered.length}</span> of{" "}
            <span className="tabular-nums">{CONNECTIONS.length}</span> showing
            {activeFilters > 0 && <span className="ml-2">· {activeFilters} filter{activeFilters > 1 ? "s" : ""} active</span>}
          </p>
          {activeFilters > 0 && (
            <button type="button" onClick={clearAll} className="font-medium text-[#C86B4F] hover:underline">
              Clear all
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState onClear={clearAll} />
      ) : view === "board" ? (
        <BoardView connections={filtered} />
      ) : (
        <ListView connections={filtered} />
      )}
    </>
  );
}

function BoardView({ connections }: { connections: Connection[] }) {
  return (
    <section className="mt-6 grid grid-cols-6 gap-3">
      {STAGES.map((s) => {
        const items = connections.filter((c) => c.stage === s.id);
        return <Column key={s.id} stage={s} items={items} />;
      })}
    </section>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-[#D9CFB5] bg-white px-6 py-16 text-center">
      <p className="text-base italic text-[#14182A] font-[family-name:var(--font-fraunces)]">
        No connections match these filters.
      </p>
      <button type="button" onClick={onClear} className="mt-3 text-xs font-medium text-[#2E5A88] hover:underline">
        Clear filters →
      </button>
    </div>
  );
}

function ToggleTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
        active ? "bg-[#1B3B5F] text-white" : "text-[#5C6472] hover:text-[#14182A]"
      }`}
    >
      {children}
    </button>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  count,
  accent,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  accent?: "clay";
  children: React.ReactNode;
}) {
  const base = active
    ? accent === "clay"
      ? "border-[#C86B4F] bg-[#C86B4F] text-white"
      : "border-[#1B3B5F] bg-[#1B3B5F] text-white"
    : "border-[#D9CFB5] bg-white text-[#14182A] hover:border-[#2E5A88]";
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${base}`}>
      {children}
      {typeof count === "number" && (
        <span className={`tabular-nums ${active ? "text-white/70" : "text-[#5C6472]"}`}>{count}</span>
      )}
    </button>
  );
}
