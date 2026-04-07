"use client";

import { useState } from "react";
import type { TrackedConnection } from "@/components/AppProvider";
import { summarizeRecording } from "@/hooks/useApi";

interface NoteSummary {
  summary: string;
  keyTakeaways: string[];
  followUpActions: string[];
  sentiment: string;
}

export function NotesModal({
  conn,
  savedSummary,
  onClose,
  onSave,
}: {
  conn: TrackedConnection;
  savedSummary: NoteSummary | null;
  onClose: () => void;
  onSave: (alumniId: string, summary: NoteSummary) => void;
}) {
  const [notesText, setNotesText] = useState("");
  const [noteSummary, setNoteSummary] = useState<NoteSummary | null>(savedSummary);
  const [summarizing, setSummarizing] = useState(false);

  const handleSummarize = async () => {
    if (!notesText.trim()) return;
    setSummarizing(true);
    try {
      const result = await summarizeRecording({
        transcript: notesText,
        alumniName: conn.alumniName,
        alumniRole: conn.alumniRole,
        companyName: conn.companyName,
      });
      setNoteSummary(result);
      onSave(conn.alumniId, result);
    } catch {
      // silently fail
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Coffee Chat Notes</h3>
            <p className="text-sm text-slate-500">{conn.alumniName} at {conn.companyName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >&times;</button>
        </div>

        <p className="text-xs text-slate-500 mb-2">
          Paste your notes, voice transcript, or key points from the conversation. Claude will extract insights and next steps.
        </p>

        <textarea
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          placeholder={"Discussed their team's work on...\nThey mentioned they're hiring for...\nAdvice they gave: ..."}
          rows={6}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 resize-none focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />

        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={handleSummarize}
            disabled={!notesText.trim() || summarizing}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {summarizing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Analyzing with Claude...
              </>
            ) : (
              <>
                <span>{"\uD83E\uDDE0"}</span>
                Analyze with AI
              </>
            )}
          </button>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            Upload Recording
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => {
              if (e.target.files?.[0]) {
                setNotesText((prev) => prev + "\n[Audio file: " + e.target.files![0].name + " — transcription would appear here in production]");
              }
            }} />
          </label>
        </div>

        {noteSummary && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">AI Summary</p>
              <p className="text-sm text-emerald-800">{noteSummary.summary}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-1">Key Takeaways</p>
              <ul className="space-y-1">
                {noteSummary.keyTakeaways.map((t, i) => (
                  <li key={i} className="text-xs text-emerald-700 flex items-start gap-1.5">
                    <span className="mt-0.5">&bull;</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-1">Follow-up Actions</p>
              <ul className="space-y-1">
                {noteSummary.followUpActions.map((a, i) => (
                  <li key={i} className="text-xs text-emerald-700 flex items-start gap-1.5">
                    <span className="mt-0.5">&#10003;</span> {a}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-emerald-600">Sentiment:</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                noteSummary.sentiment === "positive" ? "bg-emerald-100 text-emerald-700"
                  : noteSummary.sentiment === "needs_attention" ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {noteSummary.sentiment === "positive" ? "Positive" : noteSummary.sentiment === "needs_attention" ? "Needs Attention" : "Neutral"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
