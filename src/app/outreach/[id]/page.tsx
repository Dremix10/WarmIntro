"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { AlumniList } from "@/components/AlumniList";
import { OutreachDraft } from "@/components/OutreachDraft";
import { Confetti } from "@/components/Confetti";
import { findAlumni, generateOutreach, updateFunnel } from "@/hooks/useApi";
import type { WarmPath, OutreachDraft as OutreachDraftType, Company } from "@/shared/types";

export default function OutreachPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, selectedCompanies, setFunnel, setGameState } = useAppState();

  const [company, setCompany] = useState<Company | null>(null);
  const [warmPaths, setWarmPaths] = useState<WarmPath[]>([]);
  const [selectedAlumniId, setSelectedAlumniId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<OutreachDraftType[]>([]);
  const [loadingAlumni, setLoadingAlumni] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  // Find company from context
  useEffect(() => {
    const found = selectedCompanies.find((c) => c.id === params.id);
    if (found) setCompany(found);
  }, [params.id, selectedCompanies]);

  // Load alumni
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
        setWarmPaths(res.warmPaths);
        if (res.warmPaths.length > 0) {
          setSelectedAlumniId(res.warmPaths[0].alumni.id);
        }
      })
      .finally(() => setLoadingAlumni(false));
  }, [params.id, profile]);

  // Generate drafts when alumni selected
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
    if (!company) return;

    try {
      const res = await updateFunnel({
        action: "outreach_sent",
        companyId: company.id,
        alumniId: selectedAlumniId ?? undefined,
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

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/pipeline")}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-3"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Pipeline
          </button>
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
              Alumni at {company?.name ?? "this company"}
            </h2>
            {loadingAlumni ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 rounded-xl bg-white border border-slate-100 animate-pulse" />
                ))}
              </div>
            ) : warmPaths.length === 0 ? (
              <div className="rounded-xl bg-white border border-slate-200 p-6 text-center">
                <p className="text-sm text-slate-500">No alumni data available for this company yet.</p>
                <p className="mt-1 text-xs text-slate-400">Mock data is only available for Tesla.</p>
              </div>
            ) : (
              <AlumniList
                warmPaths={warmPaths}
                selectedAlumniId={selectedAlumniId}
                onSelect={setSelectedAlumniId}
              />
            )}
          </div>

          {/* Drafts (right) */}
          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Outreach Drafts
            </h2>
            {loadingDrafts ? (
              <div className="space-y-3">
                <div className="h-64 rounded-xl bg-white border border-slate-100 animate-pulse" />
                <div className="h-32 rounded-xl bg-white border border-slate-100 animate-pulse" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="rounded-xl bg-white border border-slate-200 p-8 text-center">
                <p className="text-sm text-slate-500">
                  {warmPaths.length === 0
                    ? "Select a company with alumni data to generate drafts."
                    : "Select an alumni to generate personalized drafts."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {drafts.map((draft) => (
                  <OutreachDraft
                    key={draft.id}
                    draft={draft}
                    onMarkSent={handleMarkSent}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
