"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { AlumniList } from "@/components/AlumniList";
import { OutreachDraft } from "@/components/OutreachDraft";
import { Confetti } from "@/components/Confetti";
import { MiniFunnel } from "@/components/MiniFunnel";
import { LoadingCard } from "@/components/LoadingCard";
import { PipelineProgress } from "@/components/PipelineProgress";
import { findAlumni, generateOutreach, generateFollowUp, updateFunnel, getCoachingTip } from "@/hooks/useApi";
import type { WarmPath, OutreachDraft as OutreachDraftType, Company } from "@/shared/types";

export default function OutreachPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, selectedCompanies, funnel, setFunnel, setGameState, isSent, addSentOutreach, setCompanyAlumniCount, setAlumniStage, getAlumniStage, addConnection } = useAppState();

  const [company, setCompany] = useState<Company | null>(null);
  const [warmPaths, setWarmPaths] = useState<WarmPath[]>([]);
  const [selectedAlumniId, setSelectedAlumniId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<OutreachDraftType[]>([]);
  const [loadingAlumni, setLoadingAlumni] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [coachingTip, setCoachingTip] = useState<{ tip: string; nextAction: string } | null>(null);
  const [loadingTip, setLoadingTip] = useState(false);

  useEffect(() => {
    const found = selectedCompanies.find((c) => c.id === params.id);
    if (found) setCompany(found);
  }, [params.id, selectedCompanies]);

  useEffect(() => {
    if (!profile || !params.id) return;
    setLoadingAlumni(true);
    findAlumni({ companyId: params.id, university: profile.university, userMajor: profile.major, userGradYear: profile.graduationYear })
      .then((res) => {
        const paths = res.warmPaths ?? [];
        setWarmPaths(paths);
        setCompanyAlumniCount(params.id, paths.length);
        if (paths.length > 0) setSelectedAlumniId(paths[0].alumni.id);
      })
      .finally(() => setLoadingAlumni(false));
  }, [params.id, profile]);

  useEffect(() => {
    if (!profile || !company || !selectedAlumniId) return;
    const wp = warmPaths.find((w) => w.alumni.id === selectedAlumniId);
    if (!wp) return;
    setLoadingDrafts(true);
    setDrafts([]);
    generateOutreach({ userProfile: profile, alumni: wp.alumni, company, tone: "warm" })
      .then((res) => setDrafts(res.drafts))
      .finally(() => setLoadingDrafts(false));
  }, [selectedAlumniId, profile, company, warmPaths]);

  const handleMarkSent = async () => {
    if (!company || !selectedAlumniId || isSent(selectedAlumniId)) return;
    addSentOutreach(selectedAlumniId, company.id);
    const wp = warmPaths.find((w) => w.alumni.id === selectedAlumniId);
    if (wp) {
      addConnection({
        alumniId: selectedAlumniId, alumniName: wp.alumni.name, alumniRole: wp.alumni.currentRole,
        alumniEmail: wp.alumni.email, alumniLinkedinUrl: wp.alumni.linkedinUrl,
        companyId: company.id, companyName: company.name, sentAt: new Date().toISOString(),
      });
    }
    try {
      const res = await updateFunnel({ action: "outreach_sent", companyId: company.id, alumniId: selectedAlumniId });
      setFunnel(res.funnel);
      setGameState(res.gameState);
      setXpToast(res.xpGained);
      setTimeout(() => setXpToast(null), 2500);
      const newCount = sentCount + 1;
      setSentCount(newCount);
      if (newCount === 1) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3500); }
    } catch { /* silently fail for demo */ }
  };

  const handleAdvanceStage = async (action: "reply_received" | "coffee_booked" | "referral_earned", nextStage: string) => {
    if (!company || !selectedAlumniId) return;
    const wp = warmPaths.find((w) => w.alumni.id === selectedAlumniId);
    try {
      const res = await updateFunnel({ action, companyId: company.id, alumniId: selectedAlumniId });
      setFunnel(res.funnel);
      setGameState(res.gameState);
      setAlumniStage(selectedAlumniId, nextStage);
      setXpToast(res.xpGained);
      setTimeout(() => setXpToast(null), 2500);
      if (profile && wp) {
        setLoadingTip(true);
        setCoachingTip(null);
        try {
          const tip = await getCoachingTip({ stage: nextStage, alumniName: wp.alumni.name, alumniRole: wp.alumni.currentRole, companyName: company.name, userMajor: profile.major });
          setCoachingTip(tip);
        } catch { /* skip tip */ } finally { setLoadingTip(false); }
      }
    } catch { /* silently fail */ }
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FBF7EC]">
        <div className="text-center space-y-3">
          <p className="text-lg font-medium text-[#2A2F3B]">Not logged in</p>
          <p className="text-sm text-[#8A8674]">Set up your profile to get started.</p>
          <button type="button" onClick={() => router.push("/")} className="rounded-xl bg-[#1B3B5F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#2E5A88] transition-colors">Go Home</button>
        </div>
      </div>
    );
  }

  const selectedAlumni = warmPaths.find((w) => w.alumni.id === selectedAlumniId);

  return (
    <div className="min-h-screen bg-[#FBF7EC] py-12">
      <div className="mx-auto max-w-5xl px-6">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 -mx-6 mb-6 bg-[#FBF7EC]/90 backdrop-blur-sm px-6 py-3 border-b border-[#D9CFB5]">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => router.push("/pipeline")} className="flex items-center gap-1.5 rounded-lg bg-white border border-[#D9CFB5] px-3 py-1.5 text-sm font-medium text-[#4A5260] hover:bg-[#FBF7EC] shadow-sm transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              Back to Pipeline
            </button>
            <MiniFunnel funnel={funnel} />
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            {company && (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F4EDDB] text-lg font-bold text-[#4A5260]">{company.logoPlaceholder}</div>
            )}
            <div>
              <p className="text-sm font-medium text-[#1B3B5F]">Outreach</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#14182A]">{company?.name ?? "Company"} Outreach</h1>
            </div>
          </div>
          <p className="mt-2 text-sm text-[#5C6472]">Select an alumni to generate a personalized outreach draft. Edit, copy, and mark as sent.</p>
        </div>

        <Confetti active={showConfetti} />

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

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8A8674] mb-3">
              {loadingAlumni ? "Finding connections..." : `Connections at ${company?.name ?? "this company"}`}
            </h2>
            {loadingAlumni ? (
              <LoadingCard message="Searching for alumni connections..." count={3} />
            ) : warmPaths.length === 0 ? (
              <div className="rounded-xl bg-white border border-[#D9CFB5] p-6 text-center">
                <p className="text-sm text-[#5C6472]">No connections found for this company.</p>
              </div>
            ) : (
              <AlumniList warmPaths={warmPaths} selectedAlumniId={selectedAlumniId} isSent={isSent} onSelect={setSelectedAlumniId} />
            )}
          </div>

          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8A8674] mb-3">
              {loadingDrafts ? "Writing personalized drafts..." : "Outreach Drafts"}
            </h2>
            {loadingDrafts ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-white border border-[#D9CFB5] p-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-3 border-[#2E5A88] border-t-transparent" />
                  <div>
                    <p className="text-sm font-medium text-[#2A2F3B]">Claude is writing for {selectedAlumni?.alumni.name ?? "this contact"}...</p>
                    <p className="text-xs text-[#8A8674] mt-0.5">Crafting personalized outreach...</p>
                  </div>
                </div>
                <div className="h-64 rounded-xl bg-white border border-[#ECE5D0] animate-pulse" />
                <div className="h-32 rounded-xl bg-white border border-[#ECE5D0] animate-pulse" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="rounded-xl bg-white border border-[#D9CFB5] p-8 text-center">
                <p className="text-sm text-[#5C6472]">
                  {warmPaths.length === 0 ? "Select a company with connections to generate drafts." : "Select a connection to generate personalized drafts."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.map((draft) => (
                  <OutreachDraft
                    key={draft.id}
                    draft={draft}
                    alumniLinkedinUrl={selectedAlumni?.alumni.linkedinUrl}
                    alumniEmail={selectedAlumni?.alumni.email}
                    isSent={draft.id.startsWith("followup-") ? false : (selectedAlumniId ? isSent(selectedAlumniId) : false)}
                    onMarkSent={handleMarkSent}
                    onGenerateFollowUp={async (originalBody) => {
                      if (!profile || !selectedAlumni || !company) return;
                      setLoadingDrafts(true);
                      try {
                        const res = await generateFollowUp({ userProfile: profile, alumni: selectedAlumni.alumni, company, originalBody });
                        setDrafts(res.drafts);
                      } catch { /* silently fail */ } finally { setLoadingDrafts(false); }
                    }}
                  />
                ))}
                {selectedAlumniId && isSent(selectedAlumniId) && (
                  <PipelineProgress stage={getAlumniStage(selectedAlumniId) ?? undefined} onAdvance={handleAdvanceStage} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
