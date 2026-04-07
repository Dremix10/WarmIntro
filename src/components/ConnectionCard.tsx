"use client";

import type { TrackedConnection } from "@/components/AppProvider";

const STAGE_CONFIG = [
  { id: "sent", label: "Outreach Sent", icon: "\u2709\uFE0F", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: "replied", label: "Reply Received", icon: "\uD83D\uDCAC", color: "bg-amber-50 border-amber-200 text-amber-700" },
  { id: "coffee", label: "Coffee Chat", icon: "\u2615", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { id: "referral", label: "Referral", icon: "\uD83E\uDD1D", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
];

export { STAGE_CONFIG };

export function ConnectionCard({
  conn,
  stage,
  hasNotes,
  onAdvance,
  onUploadNotes,
  onNavigate,
}: {
  conn: TrackedConnection;
  stage: string;
  hasNotes: boolean;
  onAdvance: (alumniId: string, action: string, nextStage: string) => void;
  onUploadNotes: (conn: TrackedConnection) => void;
  onNavigate: (companyId: string) => void;
}) {
  const stageIdx = STAGE_CONFIG.findIndex((s) => s.id === stage);
  const stageInfo = STAGE_CONFIG[stageIdx] ?? STAGE_CONFIG[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <button
          type="button"
          onClick={() => onNavigate(conn.companyId)}
          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
            {conn.alumniName.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 hover:text-emerald-700">{conn.alumniName}</p>
            <p className="text-xs text-slate-500">{conn.alumniRole}</p>
            <p className="text-xs text-slate-400">{conn.companyName}</p>
          </div>
        </button>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stageInfo.color}`}>
          <span>{stageInfo.icon}</span> {stageInfo.label}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-3 text-[11px]">
        {conn.alumniEmail && (
          <span className="text-slate-500">{conn.alumniEmail}</span>
        )}
        <a
          href={conn.alumniLinkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          LinkedIn
        </a>
      </div>

      {hasNotes && (
        <button
          type="button"
          onClick={() => onUploadNotes(conn)}
          className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium hover:underline"
        >
          <span>{"\uD83D\uDCDD"}</span> View saved notes & AI summary
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {stage === "sent" && (
          <button
            type="button"
            onClick={() => onAdvance(conn.alumniId, "reply_received", "replied")}
            className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            Log Reply +25 XP
          </button>
        )}
        {stage === "replied" && (
          <button
            type="button"
            onClick={() => onAdvance(conn.alumniId, "coffee_booked", "coffee")}
            className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
          >
            Book Coffee Chat +50 XP
          </button>
        )}
        {stage === "coffee" && (
          <>
            <button
              type="button"
              onClick={() => onUploadNotes(conn)}
              className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {hasNotes ? "Edit Notes" : "Upload Notes / Recording"}
            </button>
            <button
              type="button"
              onClick={() => onAdvance(conn.alumniId, "referral_earned", "referral")}
              className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              Got Referral +100 XP
            </button>
          </>
        )}
        {stage === "referral" && (
          <span className="text-xs font-medium text-emerald-600">Pipeline complete!</span>
        )}
        <button
          type="button"
          onClick={() => onNavigate(conn.companyId)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors ml-auto"
        >
          Open Outreach &rarr;
        </button>
      </div>
    </div>
  );
}
