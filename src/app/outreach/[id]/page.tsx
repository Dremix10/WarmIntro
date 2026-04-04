"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { AlumniList } from "@/components/AlumniList";
import { OutreachDraft } from "@/components/OutreachDraft";
import { Confetti } from "@/components/Confetti";
import { findAlumni, generateOutreach, generateFollowUp, updateFunnel } from "@/hooks/useApi";
import type { WarmPath, OutreachDraft as OutreachDraftType, Company, FunnelState } from "@/shared/types";
import { FUNNEL_STAGES } from "@/shared/constants";

function MiniFunnel({ funnel }: { funnel: FunnelState | null }) {
  if (!funnel) return null;
  return (
    <div className="flex items-center gap-1">
      {funnel.stages.map((s) => (
        <div key={s.id} className="flex items-center gap-1 text-[10px] text-slate-500">
          <span>{s.icon}</span>
          <span className="font-semibold" style={{ color: s.color }}>{s.currentCount}</span>
          <span className="text-slate-300">/{s.targetCount}</span>
        </div>
      ))}
    </div>
  );
}

function LoadingCard({ message, count }: { message: string; count: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-6">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
        <div>
          <p className="text-sm font-medium text-slate-700">{message}</p>
          <p className="text-xs text-slate-400 mt-0.5">This usually takes 5-10 seconds...</p>
        </div>
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white border border-slate-100 p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-48 rounded bg-slate-50 animate-pulse" />
              <div className="h-3 w-24 rounded bg-slate-50 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full rounded bg-slate-50 animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-slate-50 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OutreachPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, selectedCompanies, funnel, setFunnel, setGameState, isSent, addSentOutreach, setCompanyAlumniCount } = useAppState();

  const [company, setCompany] = useState<Company | null>(null);
  const [warmPaths, setWarmPaths] = useState<WarmPath[]>([]);
  const [selectedAlumniId, setSelectedAlumniId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<OutreachDraftType[]>([]);
  const [loadingAlumni, setLoadingAlumni] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);

  useEffect(() => {
    const found = selectedCompanies.find((c) => c.id === params.id);
    if (found) setCompany(found);
  }, [params.id, selectedCompanies]);

  useEffect(() => {
    if (!profile || !params.id) return;

    setLoadingAlumni(true);
    findAlumni({
      companyId: params.id,
      university: profile.university,
      userMajor: profile.major,
      userGradYear: profile.graduationYear,
    })
      .then((res) => {
        const paths = res.warmPaths ?? [];
        setWarmPaths(paths);
        setCompanyAlumniCount(params.id, paths.length);
        if (paths.length > 0) {
          setSelectedAlumniId(paths[0].alumni.id);
        }
      })
      .finally(() => setLoadingAlumni(false));
  }, [params.id, profile]);

  useEffect(() => {
    if (!profile || !company || !selectedAlumniId) return;

    const wp = warmPaths.find((w) => w.alumni.id === selectedAlumniId);
    if (!wp) return;

    setLoadingDrafts(true);
    setDrafts([]);
    generateOutreach({
      userProfile: profile,
      alumni: wp.alumni,
      company,
      tone: "warm",
    })
      .then((res) => setDrafts(res.drafts))
      .finally(() => setLoadingDrafts(false));
  }, [selectedAlumniId, profile, company, warmPaths]);

  const handleMarkSent = async () => {
    if (!company || !selectedAlumniId) return;

    // Prevent double-counting
    if (isSent(selectedAlumniId)) return;

    addSentOutreach(selectedAlumniId, company.id);

    try {
      const res = await updateFunnel({
        action: "outreach_sent",
        companyId: company.id,
        alumniId: selectedAlumniId,
      });
      setFunnel(res.funnel);
      setGameState(res.gameState);
      setXpToast(res.xpGained);
      setTimeout(() => setXpToast(null), 2500);

      // Confetti on first outreach sent
      const newCount = sentCount + 1;
      setSentCount(newCount);
      if (newCount === 1) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3500);
      }
    } catch {
      // silently fail for demo
    }
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <p className="text-lg font-medium text-slate-700">Not logged in</p>
          <p className="text-sm text-slate-400">Upload your resume first.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  const selectedAlumni = warmPaths.find((w) => w.alumni.id === selectedAlumniId);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-5xl px-6">
        {/* Sticky top bar */}
        <div className="sticky top-0 z-20 -mx-6 mb-6 bg-slate-50/90 backdrop-blur-sm px-6 py-3 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push("/pipeline")}
              className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back to Pipeline
            </button>
            <MiniFunnel funnel={funnel} />
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            {company && (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-600">
                {company.logoPlaceholder}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-emerald-600">Step 5 of 6</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {company?.name ?? "Company"} Outreach
              </h1>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Select an alumni to generate a personalized outreach draft. Edit, copy, and mark as sent.
          </p>
        </div>

        {/* Confetti */}
        <Confetti active={showConfetti} />

        {/* XP Toast */}
        {xpToast !== null && (
          <div className="fixed top-6 right-6 z-50 animate-bounce rounded-xl bg-emerald-600 px-4 py-2.5 shadow-lg">
            <p className="text-sm font-bold text-white">+{xpToast} XP!</p>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Alumni list (left) */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
              {loadingAlumni ? "Finding connections..." : `Connections at ${company?.name ?? "this company"}`}
            </h2>
            {loadingAlumni ? (
              <LoadingCard message="Searching for alumni connections..." count={3} />
            ) : warmPaths.length === 0 ? (
              <div className="rounded-xl bg-white border border-slate-200 p-6 text-center">
                <p className="text-sm text-slate-500">No connections found for this company.</p>
              </div>
            ) : (
              <AlumniList
                warmPaths={warmPaths}
                selectedAlumniId={selectedAlumniId}
                isSent={isSent}
                onSelect={setSelectedAlumniId}
              />
            )}
          </div>

          {/* Drafts (right) */}
          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
              {loadingDrafts ? "Writing personalized drafts..." : "Outreach Drafts"}
            </h2>
            {loadingDrafts ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Claude is writing personalized outreach for {selectedAlumni?.alumni.name ?? "this contact"}...
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Crafting email and LinkedIn message...</p>
                  </div>
                </div>
                <div className="h-64 rounded-xl bg-white border border-slate-100 animate-pulse" />
                <div className="h-32 rounded-xl bg-white border border-slate-100 animate-pulse" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="rounded-xl bg-white border border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-500">
                  {warmPaths.length === 0
                    ? "Select a company with connections to generate drafts."
                    : "Select a connection to generate personalized drafts."}
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
                      setLoadingFollowUp(true);
                      try {
                        const res = await generateFollowUp({
                          userProfile: profile,
                          alumni: selectedAlumni.alumni,
                          company,
                          originalBody,
                        });
                        setDrafts((prev) => [...prev, ...res.drafts]);
                      } catch {
                        // silently fail for demo
                      } finally {
                        setLoadingFollowUp(false);
                      }
                    }}
                  />
                ))}
                {loadingFollowUp && (
                  <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-6">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-amber-500 border-t-transparent" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">Generating follow-up message...</p>
                      <p className="text-xs text-slate-400 mt-0.5">This takes a few seconds...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
