"use client";

import { useEffect, useState } from "react";
import type { Badge } from "@/shared/types";

interface AchievementBadgeProps {
  badge: Badge;
  animate?: boolean;
}

export function AchievementBadge({ badge, animate = false }: AchievementBadgeProps) {
  const [visible, setVisible] = useState(!animate);

  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(t);
    }
  }, [animate]);

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-500 ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-50"
      } ${
        badge.earned
          ? "bg-[#FFF8E8] text-[#8A6200] border border-[#F0DD8E] shadow-sm"
          : "bg-[#FBF7EC] text-[#8A8674] border border-[#ECE5D0] opacity-50"
      }`}
    >
      <span className={`text-sm ${badge.earned && animate ? "animate-bounce" : ""}`}>
        {badge.icon}
      </span>
      <span>{badge.name}</span>
      {badge.earned && <span className="text-[#E8B339]">&#10003;</span>}
    </div>
  );
}
