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
    <div className="rounded-2xl bg-white border border-[#ECE5D0] shadow-sm px-6 py-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-[#14182A]">{gameState.levelName}</p>
          <p className="text-xs text-[#8A8674]">Level {gameState.level}</p>
        </div>
        <p className="text-lg font-bold text-[#1B3B5F]">{gameState.xp} <span className="text-xs font-medium text-[#8A8674]">XP</span></p>
      </div>
      <div className="h-2.5 w-full rounded-full bg-[#F4EDDB] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#3F6FA3] to-[#1B3B5F] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {nextLevel && (
        <p className="mt-1 text-xs text-[#8A8674] text-right">
          {nextLevel.minXP - gameState.xp} XP to {nextLevel.name}
        </p>
      )}
    </div>
  );
}
