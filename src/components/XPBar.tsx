"use client";

import { LEVELS } from "@/shared/constants";
import type { GameState } from "@/shared/types";

export function XPBar({ gameState }: { gameState: GameState }) {
  const currentLevel = LEVELS[gameState.level - 1] ?? LEVELS[0];
  const nextLevel = LEVELS[gameState.level] ?? null;

  const xpInLevel = gameState.xp - currentLevel.minXP;
  const xpForLevel = nextLevel ? nextLevel.minXP - currentLevel.minXP : 1;
  const pct = nextLevel ? Math.min(100, Math.round((xpInLevel / xpForLevel) * 100)) : 100;

  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-6 py-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{gameState.levelName}</p>
          <p className="text-xs text-slate-400">Level {gameState.level}</p>
        </div>
        <p className="text-lg font-bold text-emerald-600">{gameState.xp} <span className="text-xs font-medium text-slate-400">XP</span></p>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {nextLevel && (
        <p className="mt-1 text-xs text-slate-400 text-right">
          {nextLevel.minXP - gameState.xp} XP to {nextLevel.name}
        </p>
      )}
    </div>
  );
}
