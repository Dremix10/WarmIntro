"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { FunnelDashboard } from "@/components/FunnelDashboard";
import { XPBar } from "@/components/XPBar";
import { StreakCounter } from "@/components/StreakCounter";
import { AlumniBadge } from "@/components/AlumniBadge";
import { AchievementBadge } from "@/components/AchievementBadge";
import { updateFunnel } from "@/hooks/useApi";
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
  const { profile, selectedCompanies, funnel, gameState, setFunnel, setGameState } = useAppState();
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
            onClick={() => router.push("/")}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  const handleQuickOutreach = async (companyId: string) => {
    try {
      const res = await updateFunnel({
        action: "outreach_sent",
        companyId,
      });
      setLocalFunnel(res.funnel);
      setLocalGame(res.gameState);
      setFunnel(res.funnel);
      setGameState(res.gameState);
      if (res.newBadges.length > 0) {
        setEarnedBadges((prev) => [...prev, ...res.newBadges]);
        setTimeout(() => setEarnedBadges([]), 3000);
      }
    } catch {
      // silently fail for demo
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-3xl px-6">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-emerald-600 mb-1">Step 4 of 6</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Your Pipeline
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your networking progress across {selectedCompanies.length} {selectedCompanies.length === 1 ? "company" : "companies"}.
          </p>
        </div>

        {/* Badge pop-in */}
        {earnedBadges.length > 0 && (
          <div className="mb-6 space-y-2">
            {earnedBadges.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <AchievementBadge badge={b} animate />
                <p className="text-sm font-semibold text-amber-800">Badge Earned!</p>
              </div>
            ))}
          </div>
        )}

        {/* Gamification row */}
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

        {/* Company list */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Companies</h2>
          <div className="space-y-3">
            {selectedCompanies.map((company) => (
              <div
                key={company.id}
                className="flex items-center gap-4 rounded-xl bg-white border border-slate-100 shadow-sm px-5 py-4 hover:shadow-md transition-shadow"
              >
                {/* Logo */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                  {company.logoPlaceholder}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{company.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <AlumniBadge count={company.alumniCount} university={profile.university} />
                    <span className="text-xs text-slate-400">{company.openInternships.length} open roles</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleQuickOutreach(company.id)}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    +10 XP
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/outreach/${company.id}`)}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    View Alumni
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

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
