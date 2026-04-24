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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FBF7EC]">
        <p className="text-lg font-medium text-[#2A2F3B]">Set up your profile first</p>
        <button type="button" onClick={() => router.push("/")} className="mt-3 rounded-xl bg-[#1B3B5F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2E5A88]">Go Home</button>
      </div>
    );
  }

  const byStage = STAGE_CONFIG.map((s) => ({
    ...s,
    connections: connList.filter((c) => getStage(c.alumniId) === s.id),
  }));

  return (
    <div className="min-h-screen bg-[#FBF7EC] py-12">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-[#1B3B5F]">Connections</p>
          <h1 className="text-3xl font-bold tracking-tight text-[#14182A]">Relationship CRM</h1>
          <p className="mt-1 text-sm text-[#5C6472]">
            Track all your networking connections across companies. Log progress, upload notes, get AI coaching.
          </p>
        </div>

        {/* XP Toast */}
        {xpToast !== null && (
          <div className="fixed top-6 right-6 z-50 animate-bounce rounded-xl bg-[#1B3B5F] px-4 py-2.5 shadow-lg">
            <p className="text-sm font-bold text-white">+{xpToast} XP!</p>
          </div>
        )}

        {/* AI Coaching Tip */}
        {(coachingTip || loadingTip) && (
          <div className="mb-6 rounded-xl border border-[#D9CFB5] bg-[#F4EDDB] p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{"\uD83E\uDDE0"}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#1B3B5F] mb-1">AI Coach</p>
                {loadingTip ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2E5A88] border-t-transparent" />
                    <p className="text-sm text-[#0F2A45]">Generating coaching tip...</p>
                  </div>
                ) : coachingTip ? (
                  <>
                    <p className="text-sm text-[#0F2A45]">{coachingTip.tip}</p>
                    <p className="mt-2 text-xs font-semibold text-[#0F2A45]">Next: {coachingTip.nextAction}</p>
                  </>
                ) : null}
              </div>
              {coachingTip && (
                <button type="button" onClick={() => setCoachingTip(null)} className="text-[#3F6FA3] hover:text-[#1B3B5F] text-lg">&times;</button>
              )}
            </div>
          </div>
        )}

        {/* Email Integration */}
        <div className="mb-6 rounded-xl border border-[#D9CFB5] bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{"\uD83D\uDCE7"}</span>
              <div>
                <p className="text-sm font-semibold text-[#2A2F3B]">Email Integration</p>
                <p className="text-xs text-[#8A8674]">
                  {emailConnected
                    ? "Connected — auto-tracking replies and scheduling"
                    : "Connect your email to auto-detect replies and track conversations"}
                </p>
              </div>
            </div>
            {emailConnected ? (
              <span className="flex items-center gap-1.5 rounded-full bg-[#F4EDDB] border border-[#D9CFB5] px-3 py-1 text-xs font-medium text-[#0F2A45]">
                <span className="h-2 w-2 rounded-full bg-[#2E5A88] animate-pulse" />
                Connected to Gmail
              </span>
            ) : (
              <button
                type="button"
                onClick={handleConnectEmail}
                disabled={connectingEmail}
                className="flex items-center gap-2 rounded-lg bg-white border border-[#C7BC9F] px-4 py-2 text-sm font-medium text-[#2A2F3B] hover:bg-[#FBF7EC] disabled:opacity-50 transition-colors"
              >
                {connectingEmail ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#8A8674] border-t-transparent" />
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
            <div className="mt-3 border-t border-[#ECE5D0] pt-3 space-y-2">
              <p className="text-xs font-medium text-[#5C6472]">Recent activity detected:</p>
              {connList.slice(0, 2).map((c) => (
                <div key={c.alumniId} className="flex items-center justify-between rounded-lg bg-[#FBF7EC] px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#2E5A88]" />
                    <span className="text-xs text-[#4A5260]">Reply from <strong>{c.alumniName}</strong> at {c.companyName}</span>
                  </div>
                  <span className="text-[10px] text-[#8A8674]">Just now</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Empty state */}
        {connList.length === 0 ? (
          <div className="rounded-xl border border-[#D9CFB5] bg-white p-12 text-center">
            <span className="text-4xl">{"\uD83D\uDCCB"}</span>
            <p className="mt-3 text-lg font-medium text-[#2A2F3B]">No connections yet</p>
            <p className="mt-1 text-sm text-[#8A8674]">Send outreach from the pipeline to start tracking connections here.</p>
            <button
              type="button"
              onClick={() => router.push("/pipeline")}
              className="mt-4 rounded-xl bg-[#1B3B5F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2E5A88] transition-colors"
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
                  <h3 className="text-sm font-semibold text-[#2A2F3B]">{stage.label}</h3>
                  <span className="rounded-full bg-[#F4EDDB] px-2 py-0.5 text-[10px] font-bold text-[#5C6472]">
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
                    <div className="rounded-xl border border-dashed border-[#D9CFB5] p-4 text-center">
                      <p className="text-xs text-[#8A8674]">No connections at this stage</p>
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
