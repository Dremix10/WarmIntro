"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type {
  UserProfile,
  Company,
  FunnelState,
  GameState,
} from "@/shared/types";

// Leaderboard types (not in shared/types.ts since it's frozen)
export interface LeaderboardMember {
  id: string;
  name: string;
  university: string;
  xp: number;
  level: number;
  levelName: string;
  streak: number;
  outreachSent: number;
  isCurrentUser: boolean;
  profileShared: boolean;
  sharedProfile: UserProfile | null;
}

export interface Leaderboard {
  code: string;
  name: string;
  members: LeaderboardMember[];
}

interface AppState {
  profile: UserProfile | null;
  selectedCompanies: Company[];
  allCompanies: Company[];
  funnel: FunnelState | null;
  gameState: GameState | null;
  leaderboard: Leaderboard | null;
  isProfileShared: boolean;
  sentOutreach: Array<{ alumniId: string; companyId: string }>;
  setProfile: (profile: UserProfile) => void;
  setSelectedCompanies: (companies: Company[]) => void;
  setAllCompanies: (companies: Company[]) => void;
  setFunnel: (funnel: FunnelState) => void;
  setGameState: (gameState: GameState) => void;
  setLeaderboard: (leaderboard: Leaderboard | null) => void;
  setIsProfileShared: (shared: boolean) => void;
  addSentOutreach: (alumniId: string, companyId: string) => void;
  isSent: (alumniId: string) => boolean;
  getSentCount: (companyId: string) => number;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [selectedCompanies, setSelectedCompaniesState] = useState<Company[]>([]);
  const [allCompanies, setAllCompaniesState] = useState<Company[]>([]);
  const [funnel, setFunnelState] = useState<FunnelState | null>(null);
  const [gameState, setGameStateState] = useState<GameState | null>(null);
  const [leaderboard, setLeaderboardState] = useState<Leaderboard | null>(null);
  const [isProfileShared, setIsProfileSharedState] = useState(false);
  const [sentOutreach, setSentOutreach] = useState<Array<{ alumniId: string; companyId: string }>>([]);

  const setProfile = useCallback((p: UserProfile) => setProfileState(p), []);
  const setSelectedCompanies = useCallback((c: Company[]) => setSelectedCompaniesState(c), []);
  const setAllCompanies = useCallback((c: Company[]) => setAllCompaniesState(c), []);
  const setFunnel = useCallback((f: FunnelState) => setFunnelState(f), []);
  const setGameState = useCallback((g: GameState) => setGameStateState(g), []);
  const setLeaderboard = useCallback((l: Leaderboard | null) => setLeaderboardState(l), []);
  const setIsProfileShared = useCallback((s: boolean) => setIsProfileSharedState(s), []);
  const addSentOutreach = useCallback((alumniId: string, companyId: string) => setSentOutreach((prev) => prev.some((s) => s.alumniId === alumniId) ? prev : [...prev, { alumniId, companyId }]), []);
  const isSent = useCallback((alumniId: string) => sentOutreach.some((s) => s.alumniId === alumniId), [sentOutreach]);
  const getSentCount = useCallback((companyId: string) => sentOutreach.filter((s) => s.companyId === companyId).length, [sentOutreach]);

  return (
    <AppContext.Provider
      value={{
        profile,
        selectedCompanies,
        allCompanies,
        funnel,
        gameState,
        leaderboard,
        isProfileShared,
        sentOutreach,
        setProfile,
        setSelectedCompanies,
        setAllCompanies,
        setFunnel,
        setGameState,
        setLeaderboard,
        setIsProfileShared,
        addSentOutreach,
        isSent,
        getSentCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppProvider");
  }
  return ctx;
}
