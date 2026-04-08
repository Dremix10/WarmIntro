"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { ProfileModal } from "@/components/ProfileModal";
import type { Leaderboard, LeaderboardMember } from "@/components/AppProvider";
import type { UserProfile } from "@/shared/types";
import { MOCK_MEMBERS } from "@/data/mock-leaderboard";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { profile, gameState, leaderboard, isProfileShared, setLeaderboard } = useAppState();
  const [joinCode, setJoinCode] = useState("");
  const [boardName, setBoardName] = useState("");
  const [mode, setMode] = useState<"choose" | "join" | "create">("choose");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<{ profile: UserProfile; name: string } | null>(null);

  useEffect(() => {
    if (profile && !leaderboard) {
      const demoBoard: Leaderboard = {
        code: "RICE26",
        name: "Rice Networking 2027",
        members: [...MOCK_MEMBERS, {
          id: "current-user",
          name: profile.name,
          university: profile.university,
          xp: gameState?.xp ?? 0,
          level: gameState?.level ?? 1,
          levelName: gameState?.levelName ?? "Networking Novice",
          streak: gameState?.streak ?? 0,
          outreachSent: gameState?.recentActions.filter((a) => a.type === "outreach_sent").length ?? 0,
          isCurrentUser: true,
          profileShared: isProfileShared,
          sharedProfile: isProfileShared ? profile : null,
        }],
      };
      setLeaderboard(demoBoard);
    }
  }, [profile, leaderboard, gameState, isProfileShared, setLeaderboard]);

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <p className="text-lg font-medium text-slate-700">Not logged in</p>
          <p className="text-sm text-slate-400">Upload your resume first.</p>
          <button type="button" onClick={() => router.push("/")} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
            Start over
          </button>
        </div>
      </div>
    );
  }

  const currentUserMember: LeaderboardMember = {
    id: "current-user",
    name: profile.name,
    university: profile.university,
    xp: gameState?.xp ?? 0,
    level: gameState?.level ?? 1,
    levelName: gameState?.levelName ?? "Networking Novice",
    streak: gameState?.streak ?? 0,
    outreachSent: gameState?.recentActions.filter((a) => a.type === "outreach_sent").length ?? 0,
    isCurrentUser: true,
    profileShared: isProfileShared,
    sharedProfile: isProfileShared ? profile : null,
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 4) { setError("Please enter a valid leaderboard code."); return; }
    setError(null);
    setLeaderboard({ code, name: `${code} Leaderboard`, members: [...MOCK_MEMBERS, currentUserMember] });
  };

  const handleCreate = () => {
    const name = boardName.trim();
    if (!name) { setError("Give your leaderboard a name."); return; }
    setError(null);
    setLeaderboard({ code: generateCode(), name, members: [currentUserMember] });
  };

  const handleCopyCode = async () => {
    if (!leaderboard) return;
    await navigator.clipboard.writeText(leaderboard.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    setLeaderboard(null);
    setMode("choose");
    setJoinCode("");
    setBoardName("");
  };

  const handleMemberClick = (member: LeaderboardMember) => {
    if (!isProfileShared || !member.profileShared || !member.sharedProfile) return;
    setViewingProfile({ profile: member.sharedProfile, name: member.name });
  };

  if (leaderboard) {
    const updatedMembers = leaderboard.members.map((m) => m.isCurrentUser ? currentUserMember : m);
    const sorted = [...updatedMembers].sort((a, b) => b.xp - a.xp);
    const rank = sorted.findIndex((m) => m.isCurrentUser) + 1;

    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="mx-auto max-w-3xl px-6">
          {viewingProfile && (
            <ProfileModal profile={viewingProfile.profile} memberName={viewingProfile.name} onClose={() => setViewingProfile(null)} />
          )}

          <div className="mb-8">
            <p className="text-sm font-medium text-emerald-600 mb-1">Leaderboard</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{leaderboard.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {updatedMembers.length} {updatedMembers.length === 1 ? "member" : "members"} competing
            </p>
          </div>

          {/* Resume sharing status */}
          <div className={`rounded-xl border px-5 py-4 mb-6 ${isProfileShared ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-slate-100 shadow-sm"}`}>
            <div className="flex items-center gap-3">
              <span className="text-lg">{isProfileShared ? "\u2705" : "\uD83D\uDD12"}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-slate-900">Resume Sharing</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isProfileShared ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                    {isProfileShared ? "Opted In" : "Opted Out"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {isProfileShared
                    ? "Your resume is shared with members who also opted in. Click names with a Resume badge to view theirs."
                    : "Your resume is private. You chose not to share when uploading your resume."}
                </p>
              </div>
            </div>
          </div>

          {/* Code share bar */}
          <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-100 shadow-sm px-5 py-3 mb-6">
            <div className="flex-1">
              <p className="text-xs text-slate-400">Invite Code</p>
              <p className="text-lg font-mono font-bold tracking-widest text-slate-800">{leaderboard.code}</p>
            </div>
            <button type="button" onClick={handleCopyCode} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>

          {/* Your rank */}
          <div className="flex items-center gap-4 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white">#{rank}</div>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Your Rank</p>
              <p className="text-xs text-emerald-600">
                {currentUserMember.xp} XP &middot; {currentUserMember.outreachSent} outreach sent &middot; {currentUserMember.streak > 0 ? `${currentUserMember.streak} day streak` : "No streak yet"}
              </p>
            </div>
          </div>

          <LeaderboardTable members={updatedMembers} canViewProfiles={isProfileShared} onMemberClick={handleMemberClick} />

          <div className="flex items-center justify-between mt-6">
            <button type="button" onClick={() => router.push("/pipeline")} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
              Back to Pipeline
            </button>
            <button type="button" onClick={handleLeave} className="rounded-xl border border-red-200 bg-white px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
              Leave Leaderboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-lg px-6">
        <div className="mb-8">
          <p className="text-sm font-medium text-emerald-600 mb-1">Leaderboard</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Leaderboard</h1>
          <p className="mt-1 text-sm text-slate-500">Compete with friends and classmates. Join an existing leaderboard or create your own.</p>
        </div>

        {mode === "choose" && (
          <div className="space-y-3">
            <button type="button" onClick={() => { setMode("join"); setError(null); }} className="w-full rounded-xl bg-white border border-slate-200 shadow-sm p-5 text-left hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl">&#x1F517;</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Join a Leaderboard</p>
                  <p className="text-xs text-slate-500">Enter a code from a friend to join their board</p>
                </div>
              </div>
            </button>
            <button type="button" onClick={() => { setMode("create"); setError(null); }} className="w-full rounded-xl bg-white border border-slate-200 shadow-sm p-5 text-left hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl">&#x1F3C6;</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Create a Leaderboard</p>
                  <p className="text-xs text-slate-500">Start a new board and share the code with others</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Join a Leaderboard</h2>
            <p className="text-sm text-slate-500 mb-4">Enter the 6-character code shared by a friend.</p>
            <input type="text" value={joinCode} onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(null); }} placeholder="e.g. ABC123" maxLength={6} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-mono font-bold tracking-[0.3em] text-slate-800 placeholder:text-slate-300 placeholder:tracking-[0.3em] shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 uppercase transition-shadow" />
            {error && <p className="mt-3 text-sm text-red-500 font-medium">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => { setMode("choose"); setError(null); }} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Back</button>
              <button type="button" onClick={handleJoin} disabled={joinCode.trim().length < 4} className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Join</button>
            </div>
          </div>
        )}

        {mode === "create" && (
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Create a Leaderboard</h2>
            <p className="text-sm text-slate-500 mb-4">Name your board and share the code with classmates.</p>
            <input type="text" value={boardName} onChange={(e) => { setBoardName(e.target.value); setError(null); }} placeholder="e.g. Rice MechE 2027" maxLength={40} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-shadow" />
            {error && <p className="mt-3 text-sm text-red-500 font-medium">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => { setMode("choose"); setError(null); }} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Back</button>
              <button type="button" onClick={handleCreate} disabled={!boardName.trim()} className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Create</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
