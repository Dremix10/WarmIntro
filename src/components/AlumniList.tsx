"use client";

import type { WarmPath } from "@/shared/types";

interface AlumniListProps {
  warmPaths: WarmPath[];
  selectedAlumniId: string | null;
  sentAlumniIds?: string[];
  onSelect: (alumniId: string) => void;
}

export function AlumniList({ warmPaths, selectedAlumniId, sentAlumniIds = [], onSelect }: AlumniListProps) {
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
        const isCold = a.university === "N/A";
        const isSent = sentAlumniIds.includes(a.id);

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
            {/* Cold outreach badge */}
            {isCold && (
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                Cold outreach suggestion
              </div>
            )}

            {/* Header row */}
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                {a.name.split(" ").map((n) => n[0]).join("")}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                    {isSent && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        &#10003; Sent
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`h-2 w-2 rounded-full ${strengthColor[a.connectionStrength]}`} />
                    <span className="text-xs text-slate-500">{strengthLabel[a.connectionStrength]}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {a.currentRole}
                  {!isCold && ` · Class of ${a.graduationYear}`}
                </p>
                {!isCold && <p className="text-xs text-slate-400">{a.major}</p>}
              </div>
            </div>

            {/* Shared background */}
            {a.sharedBackground.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {a.sharedBackground.map((bg) => (
                  <span key={bg} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    {bg}
                  </span>
                ))}
              </div>
            )}

            {/* Contact links */}
            <div className="flex items-center gap-3 mt-2.5" onClick={(e) => e.stopPropagation()}>
              {a.linkedinUrl && (
                <a
                  href={a.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
              )}
              {a.email && (
                <a
                  href={`mailto:${a.email}`}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:underline"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  {a.email}
                </a>
              )}
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
