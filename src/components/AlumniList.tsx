"use client";

import type { WarmPath } from "@/shared/types";

interface AlumniListProps {
  warmPaths: WarmPath[];
  selectedAlumniId: string | null;
  onSelect: (alumniId: string) => void;
}

export function AlumniList({ warmPaths, selectedAlumniId, onSelect }: AlumniListProps) {
  const strengthColor = {
    strong: "bg-emerald-500",
    medium: "bg-amber-400",
    weak: "bg-slate-300",
  };

  const strengthLabel = {
    strong: "Strong",
    medium: "Medium",
    weak: "Weak",
  };

  return (
    <div className="space-y-3">
      {warmPaths.map((wp) => {
        const a = wp.alumni;
        const selected = selectedAlumniId === a.id;

        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={`w-full rounded-xl border p-4 text-left transition-all ${
              selected
                ? "border-emerald-500 bg-emerald-50/50 shadow-md ring-1 ring-emerald-500"
                : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md"
            }`}
          >
            {/* Header row */}
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                {a.name.split(" ").map((n) => n[0]).join("")}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`h-2 w-2 rounded-full ${strengthColor[a.connectionStrength]}`} />
                    <span className="text-xs text-slate-500">{strengthLabel[a.connectionStrength]}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{a.currentRole} &middot; Class of {a.graduationYear}</p>
                <p className="text-xs text-slate-400">{a.major}</p>
              </div>
            </div>

            {/* Shared background */}
            <div className="flex flex-wrap gap-1 mt-2.5">
              {a.sharedBackground.map((bg) => (
                <span key={bg} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {bg}
                </span>
              ))}
            </div>

            {/* Warm path narrative */}
            <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">{wp.narrative}</p>

            {/* Warmth score */}
            <div className="flex items-center gap-2 mt-2.5">
              <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${wp.warmthScore}%` }}
                />
              </div>
              <span className="text-xs font-medium text-emerald-600">{wp.warmthScore}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
