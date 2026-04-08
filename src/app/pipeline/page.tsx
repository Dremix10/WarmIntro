"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { FunnelDashboard } from "@/components/FunnelDashboard";
import { XPBar } from "@/components/XPBar";
import { StreakCounter } from "@/components/StreakCounter";
import { AlumniBadge } from "@/components/AlumniBadge";
import { AchievementBadge } from "@/components/AchievementBadge";
import type { FunnelState, GameState, Badge } from "@/shared/types";
import { FUNNEL_STAGES } from "@/shared/constants";

function buildDefaultFunnel(): FunnelState {
  return {
    stages: FUNNEL_STAGES.map((s, i) => ({
      id: `stage-${i + 1}`,
      name: s.name,
      targetCount: s.targetMultiplier,
      currentCount: 0,
      conversionRate: s.conversionRate,
      color: s.color,
      icon: s.icon,
    })),
    totalOutreachNeeded: 100,
    totalOutreachDone: 0,
    estimatedOffers: 1,
    weekNumber: 1,
  };
}

const DEFAULT_GAME: GameState = {
  xp: 0,
  level: 1,
  levelName: "Networking Novice",
  streak: 0,
  badges: [],
  recentActions: [],
};

export default function PipelinePage() {
  const router = useRouter();
  const { profile, selectedCompanies, funnel, gameState, setFunnel, setGameState, getSentCount, companyAlumniCount } = useAppState();
  const [localFunnel, setLocalFunnel] = useState<FunnelState>(funnel ?? buildDefaultFunnel());
  const [localGame, setLocalGame] = useState<GameState>(gameState ?? DEFAULT_GAME);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);

  useEffect(() => {
    if (funnel) setLocalFunnel(funnel);
  }, [funnel]);

  useEffect(() => {
    if (gameState) setLocalGame(gameState);
  }, [gameState]);

  if (!profile || selectedCompanies.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <p className="text-lg font-medium text-slate-700">No pipeline yet</p>
          <p className="text-sm text-slate-400">Select companies first to build your pipeline.</p>
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Set Up Profile
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-3xl px-6">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-emerald-600 mb-1">Your Pipeline</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Your Pipeline
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your networking progress across {selectedCompanies.length} {selectedCompanies.length === 1 ? "company" : "companies"}.
          </p>
        </div>

        {/* Badge pop-in */}
        {earnedBadges.length > 0 && (
          <div className="fixed top-6 right-6 z-50 space-y-2">
            {earnedBadges.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 shadow-lg animate-bounce">
                <AchievementBadge badge={b} animate />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Badge Earned!</p>
                  <p className="text-xs text-amber-600">{b.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* COMPANIES FIRST — the primary action */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">Start Here &mdash; Pick a Company</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">Click any company to find alumni connections and draft personalized outreach messages.</p>
          <div className="space-y-3">
            {selectedCompanies.map((company) => {
              const sentCount = getSentCount(company.id);
              const totalAlumni = companyAlumniCount[company.id] ?? 0;
              const progress = totalAlumni > 0 ? Math.min((sentCount / totalAlumni) * 100, 100) : 0;

              return (
                <div
                  key={company.id}
                  onClick={() => router.push(`/outreach/${company.id}`)}
                  className="rounded-xl bg-white border border-slate-100 shadow-sm px-5 py-4 hover:shadow-md hover:border-emerald-200 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {/* Logo */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
                      {company.logoPlaceholder}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-emerald-800 transition-colors">{company.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <AlumniBadge count={company.alumniCount} university={profile.university} />
                        <span className="text-xs text-slate-400">{company.openInternships.length} open roles</span>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white group-hover:bg-emerald-700 transition-colors shrink-0">
                      <span>{sentCount > 0 ? "Continue Outreach" : "Find Alumni & Draft Outreach"}</span>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </div>

                  {/* Per-company progress bar */}
                  {sentCount > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-emerald-600 shrink-0">
                        {sentCount}/{totalAlumni} contacted
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* GAMIFICATION — below companies */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <XPBar gameState={localGame} />
          <StreakCounter streak={localGame.streak} />
        </div>

        {/* Badges */}
        {localGame.badges.length > 0 && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-6 py-4 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Badges</p>
            <div className="flex flex-wrap gap-2">
              {localGame.badges.map((badge) => (
                <AchievementBadge key={badge.id} badge={badge} />
              ))}
            </div>
          </div>
        )}

        {/* Funnel */}
        <FunnelDashboard funnel={localFunnel} />

        {/* Recent activity */}
        {localGame.recentActions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm divide-y divide-slate-100">
              {localGame.recentActions.slice(0, 5).map((action, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-600">
                    +{action.xpGained}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{action.description}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(action.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard CTA */}
        <div className="mt-8">
          <button
            type="button"
            onClick={() => router.push("/leaderboard")}
            className="w-full rounded-xl bg-white border border-slate-200 shadow-sm p-5 text-left hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl">
                &#x1F3C6;
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Leaderboard</p>
                <p className="text-xs text-slate-500">Compete with classmates — join or create a board</p>
              </div>
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
