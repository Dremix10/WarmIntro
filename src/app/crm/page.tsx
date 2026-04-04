"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import type { TrackedConnection } from "@/components/AppProvider";
import { getCoachingTip, summarizeRecording, updateFunnel } from "@/hooks/useApi";

const STAGE_CONFIG = [
  { id: "sent", label: "Outreach Sent", icon: "\u2709\uFE0F", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { id: "replied", label: "Reply Received", icon: "\uD83D\uDCAC", color: "bg-amber-50 border-amber-200 text-amber-700" },
  { id: "coffee", label: "Coffee Chat", icon: "\u2615", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { id: "referral", label: "Referral", icon: "\uD83E\uDD1D", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
];

function ConnectionCard({
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

      {/* Contact info */}
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

      {/* Saved notes indicator */}
      {hasNotes && (
        <button
          type="button"
          onClick={() => onUploadNotes(conn)}
          className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium hover:underline"
        >
          <span>{"\uD83D\uDCDD"}</span> View saved notes & AI summary
        </button>
      )}

      {/* Actions based on stage */}
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

export default function CRMPage() {
  const router = useRouter();
  const { profile, connections, connectionNotes, alumniStages, setAlumniStage, setFunnel, setGameState, setConnectionNote, selectedCompanies } = useAppState();

  const [emailConnected, setEmailConnected] = useState(false);
  const [connectingEmail, setConnectingEmail] = useState(false);
  const [coachingTip, setCoachingTip] = useState<{ tip: string; nextAction: string; alumniId: string } | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);
  const [notesModal, setNotesModal] = useState<TrackedConnection | null>(null);
  const [notesText, setNotesText] = useState("");
  const [noteSummary, setNoteSummary] = useState<{
    summary: string;
    keyTakeaways: string[];
    followUpActions: string[];
    sentiment: string;
  } | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [xpToast, setXpToast] = useState<number | null>(null);

  const connList = Object.values(connections);
  const getStage = (alumniId: string) => alumniStages[alumniId] ?? "sent";

  const handleAdvance = async (alumniId: string, action: string, nextStage: string) => {
    const conn = connections[alumniId];
    if (!conn) return;

    try {
      const res = await updateFunnel({
        action: action as "reply_received" | "coffee_booked" | "referral_earned",
        companyId: conn.companyId,
        alumniId,
      });
      setFunnel(res.funnel);
      setGameState(res.gameState);
      setAlumniStage(alumniId, nextStage);
      setXpToast(res.xpGained);
      setTimeout(() => setXpToast(null), 2500);

      // Get AI coaching tip
      if (profile) {
        setLoadingTip(true);
        try {
          const tip = await getCoachingTip({
            stage: nextStage,
            alumniName: conn.alumniName,
            alumniRole: conn.alumniRole,
            companyName: conn.companyName,
            userMajor: profile.major,
          });
          setCoachingTip({ ...tip, alumniId });
        } catch {
          // skip tip on error
        } finally {
          setLoadingTip(false);
        }
      }
    } catch {
      // silently fail
    }
  };

  const handleConnectEmail = async () => {
    setConnectingEmail(true);
    // Simulate OAuth flow
    await new Promise((r) => setTimeout(r, 2000));
    setEmailConnected(true);
    setConnectingEmail(false);
  };

  const handleOpenNotes = (conn: TrackedConnection) => {
    setNotesModal(conn);
    const saved = connectionNotes[conn.alumniId];
    if (saved) {
      setNoteSummary(saved);
    } else {
      setNoteSummary(null);
    }
  };

  const handleSummarizeNotes = async () => {
    if (!notesModal || !notesText.trim()) return;
    setSummarizing(true);
    try {
      const result = await summarizeRecording({
        transcript: notesText,
        alumniName: notesModal.alumniName,
        alumniRole: notesModal.alumniRole,
        companyName: notesModal.companyName,
      });
      setNoteSummary(result);
      setConnectionNote(notesModal.alumniId, result);
    } catch {
      // silently fail
    } finally {
      setSummarizing(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <p className="text-lg font-medium text-slate-700">Not logged in</p>
        <button type="button" onClick={() => router.push("/")} className="mt-3 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Start over</button>
      </div>
    );
  }

  // Group connections by stage
  const byStage = STAGE_CONFIG.map((s) => ({
    ...s,
    connections: connList.filter((c) => getStage(c.alumniId) === s.id),
  }));

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-emerald-600">Step 6 of 7</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Relationship CRM</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track all your networking connections across companies. Log progress, upload notes, get AI coaching.
          </p>
        </div>

        {/* XP Toast */}
        {xpToast !== null && (
          <div className="fixed top-6 right-6 z-50 animate-bounce rounded-xl bg-emerald-600 px-4 py-2.5 shadow-lg">
            <p className="text-sm font-bold text-white">+{xpToast} XP!</p>
          </div>
        )}

        {/* AI Coaching Tip */}
        {(coachingTip || loadingTip) && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{"\uD83E\uDDE0"}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">AI Coach</p>
                {loadingTip ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <p className="text-sm text-emerald-700">Generating coaching tip...</p>
                  </div>
                ) : coachingTip ? (
                  <>
                    <p className="text-sm text-emerald-800">{coachingTip.tip}</p>
                    <p className="mt-2 text-xs font-semibold text-emerald-700">Next: {coachingTip.nextAction}</p>
                  </>
                ) : null}
              </div>
              {coachingTip && (
                <button type="button" onClick={() => setCoachingTip(null)} className="text-emerald-400 hover:text-emerald-600 text-lg">&times;</button>
              )}
            </div>
          </div>
        )}

        {/* Email Integration */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{"\uD83D\uDCE7"}</span>
              <div>
                <p className="text-sm font-semibold text-slate-700">Email Integration</p>
                <p className="text-xs text-slate-400">
                  {emailConnected
                    ? "Connected — auto-tracking replies and scheduling"
                    : "Connect your email to auto-detect replies and track conversations"}
                </p>
              </div>
            </div>
            {emailConnected ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Connected to Gmail
              </span>
            ) : (
              <button
                type="button"
                onClick={handleConnectEmail}
                disabled={connectingEmail}
                className="flex items-center gap-2 rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {connectingEmail ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    Connect Gmail
                  </>
                )}
              </button>
            )}
          </div>

          {/* Mock detected emails when connected */}
          {emailConnected && connList.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
              <p className="text-xs font-medium text-slate-500">Recent activity detected:</p>
              {connList.slice(0, 2).map((c) => (
                <div key={c.alumniId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-600">Reply from <strong>{c.alumniName}</strong> at {c.companyName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Just now</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Empty state */}
        {connList.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <span className="text-4xl">{"\uD83D\uDCCB"}</span>
            <p className="mt-3 text-lg font-medium text-slate-700">No connections yet</p>
            <p className="mt-1 text-sm text-slate-400">Send outreach from the pipeline to start tracking connections here.</p>
            <button
              type="button"
              onClick={() => router.push("/pipeline")}
              className="mt-4 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              Go to Pipeline
            </button>
          </div>
        ) : (
          /* Kanban-style columns */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {byStage.map((stage) => (
              <div key={stage.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span>{stage.icon}</span>
                  <h3 className="text-sm font-semibold text-slate-700">{stage.label}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    {stage.connections.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {stage.connections.map((conn) => (
                    <ConnectionCard
                      key={conn.alumniId}
                      conn={conn}
                      stage={stage.id}
                      hasNotes={!!connectionNotes[conn.alumniId]}
                      onAdvance={handleAdvance}
                      onUploadNotes={handleOpenNotes}
                      onNavigate={(companyId) => router.push(`/outreach/${companyId}`)}
                    />
                  ))}
                  {stage.connections.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center">
                      <p className="text-xs text-slate-400">No connections at this stage</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notes/Recording Modal */}
        {notesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Coffee Chat Notes</h3>
                  <p className="text-sm text-slate-500">{notesModal.alumniName} at {notesModal.companyName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setNotesModal(null); setNoteSummary(null); setNotesText(""); }}
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
                  onClick={handleSummarizeNotes}
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

              {/* AI Summary */}
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
        )}
      </div>
    </div>
  );
}
