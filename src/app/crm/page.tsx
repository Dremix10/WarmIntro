"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { ConnectionCard, STAGE_CONFIG } from "@/components/ConnectionCard";
import { NotesModal } from "@/components/NotesModal";
import type { TrackedConnection } from "@/components/AppProvider";
import { getCoachingTip, updateFunnel } from "@/hooks/useApi";

export default function CRMPage() {
  const router = useRouter();
  const { profile, connections, connectionNotes, alumniStages, setAlumniStage, setFunnel, setGameState, setConnectionNote, selectedCompanies } = useAppState();

  const [emailConnected, setEmailConnected] = useState(false);
  const [connectingEmail, setConnectingEmail] = useState(false);
  const [coachingTip, setCoachingTip] = useState<{ tip: string; nextAction: string; alumniId: string } | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);
  const [notesModal, setNotesModal] = useState<TrackedConnection | null>(null);
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
    await new Promise((r) => setTimeout(r, 2000));
    setEmailConnected(true);
    setConnectingEmail(false);
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <p className="text-lg font-medium text-slate-700">Not logged in</p>
        <button type="button" onClick={() => router.push("/")} className="mt-3 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Start over</button>
      </div>
    );
  }

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
                      onUploadNotes={(c) => setNotesModal(c)}
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

        {/* Notes Modal */}
        {notesModal && (
          <NotesModal
            conn={notesModal}
            savedSummary={connectionNotes[notesModal.alumniId] ?? null}
            onClose={() => setNotesModal(null)}
            onSave={(alumniId, summary) => setConnectionNote(alumniId, summary)}
          />
        )}
      </div>
    </div>
  );
}
