"use client";

import type { LeaderboardMember } from "@/components/AppProvider";

const RANK_STYLES: Record<number, string> = {
  1: "bg-[#F0C865] text-white",
  2: "bg-[#C7BC9F] text-white",
  3: "bg-[#B08100] text-white",
};

interface LeaderboardTableProps {
  members: LeaderboardMember[];
  canViewProfiles: boolean;
  onMemberClick: (member: LeaderboardMember) => void;
}

export function LeaderboardTable({ members, canViewProfiles, onMemberClick }: LeaderboardTableProps) {
  const sorted = [...members].sort((a, b) => b.xp - a.xp);

  return (
    <div className="rounded-2xl bg-white border border-[#ECE5D0] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-[#FBF7EC] border-b border-[#ECE5D0] text-xs font-semibold uppercase tracking-wider text-[#8A8674]">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Player</div>
        <div className="col-span-2 text-right">XP</div>
        <div className="col-span-2 text-right">Outreach</div>
        <div className="col-span-2 text-right">Streak</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[#ECE5D0]">
        {sorted.map((member, i) => {
          const rank = i + 1;
          const isUser = member.isCurrentUser;
          const isClickable = !isUser && canViewProfiles && member.profileShared;

          return (
            <div
              key={member.id}
              onClick={() => isClickable && onMemberClick(member)}
              className={`grid grid-cols-12 gap-2 items-center px-5 py-3 transition-colors ${
                isUser ? "bg-[#F4EDDB]/50" : "hover:bg-[#FBF7EC]"
              } ${isClickable ? "cursor-pointer" : ""}`}
            >
              {/* Rank */}
              <div className="col-span-1">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    RANK_STYLES[rank] ?? "bg-[#F4EDDB] text-[#5C6472]"
                  }`}
                >
                  {rank}
                </span>
              </div>

              {/* Name + level */}
              <div className="col-span-5 min-w-0">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isUser
                        ? "bg-[#EAE3D2] text-[#0F2A45]"
                        : "bg-[#F4EDDB] text-[#4A5260]"
                    }`}
                  >
                    {member.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-sm font-medium truncate ${
                        isUser ? "text-[#0F2A45]" : isClickable ? "text-[#1F2330] hover:text-[#1B3B5F]" : "text-[#1F2330]"
                      }`}>
                        {member.name}
                      </p>
                      {isUser && <span className="text-xs text-[#2E5A88] shrink-0">(you)</span>}
                      {!isUser && member.profileShared && (
                        <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-500">
                          Resume
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8A8674]">{member.levelName}</p>
                  </div>
                </div>
              </div>

              {/* XP */}
              <div className="col-span-2 text-right">
                <span className={`text-sm font-bold ${isUser ? "text-[#1B3B5F]" : "text-[#2A2F3B]"}`}>
                  {member.xp.toLocaleString()}
                </span>
              </div>

              {/* Outreach */}
              <div className="col-span-2 text-right">
                <span className="text-sm text-[#4A5260]">{member.outreachSent}</span>
              </div>

              {/* Streak */}
              <div className="col-span-2 text-right">
                {member.streak > 0 ? (
                  <span className="text-sm text-[#E8B339] font-medium">
                    &#x1F525; {member.streak}
                  </span>
                ) : (
                  <span className="text-sm text-[#A8A494]">--</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
