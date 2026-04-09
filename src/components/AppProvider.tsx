"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import type {
  UserProfile,
  Company,
  FunnelState,
  GameState,
} from "@/shared/types";
import { supabase } from "@/lib/supabase-browser";
import type { Session } from "@supabase/supabase-js";
import { loadProfile, loadSelectedCompanies } from "@/hooks/useApi";

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

export interface TrackedConnection {
  alumniId: string;
  alumniName: string;
  alumniRole: string;
  alumniEmail?: string;
  alumniLinkedinUrl: string;
  companyId: string;
  companyName: string;
  sentAt: string;
}

interface AppState {
  session: Session | null;
  authLoading: boolean;
  profile: UserProfile | null;
  selectedCompanies: Company[];
  allCompanies: Company[];
  funnel: FunnelState | null;
  gameState: GameState | null;
  leaderboard: Leaderboard | null;
  isProfileShared: boolean;
  sentOutreach: Array<{ alumniId: string; companyId: string }>;
  companyAlumniCount: Record<string, number>;
  alumniStages: Record<string, string>;
  connections: Record<string, TrackedConnection>;
  connectionNotes: Record<string, { summary: string; keyTakeaways: string[]; followUpActions: string[]; sentiment: string }>;
  signOut: () => Promise<void>;
  setProfile: (profile: UserProfile) => void;
  setSelectedCompanies: (companies: Company[]) => void;
  setAllCompanies: (companies: Company[]) => void;
  setFunnel: (funnel: FunnelState) => void;
  setGameState: (gameState: GameState) => void;
  setLeaderboard: (leaderboard: Leaderboard | null) => void;
  setIsProfileShared: (shared: boolean) => void;
  addSentOutreach: (alumniId: string, companyId: string) => void;
  setCompanyAlumniCount: (companyId: string, count: number) => void;
  setAlumniStage: (alumniId: string, stage: string) => void;
  getAlumniStage: (alumniId: string) => string | null;
  addConnection: (conn: TrackedConnection) => void;
  setConnectionNote: (alumniId: string, note: { summary: string; keyTakeaways: string[]; followUpActions: string[]; sentiment: string }) => void;
  isSent: (alumniId: string) => boolean;
  getSentCount: (companyId: string) => number;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [selectedCompanies, setSelectedCompaniesState] = useState<Company[]>([]);
  const [allCompanies, setAllCompaniesState] = useState<Company[]>([]);
  const [funnel, setFunnelState] = useState<FunnelState | null>(null);
  const [gameState, setGameStateState] = useState<GameState | null>(null);
  const [leaderboard, setLeaderboardState] = useState<Leaderboard | null>(null);
  const [isProfileShared, setIsProfileSharedState] = useState(false);
  const [sentOutreach, setSentOutreach] = useState<Array<{ alumniId: string; companyId: string }>>([]);
  const [companyAlumniCount, setCompanyAlumniCountState] = useState<Record<string, number>>({});
  const [alumniStages, setAlumniStagesState] = useState<Record<string, string>>({});
  const [connections, setConnectionsState] = useState<Record<string, TrackedConnection>>({});
  const [connectionNotes, setConnectionNotesState] = useState<Record<string, { summary: string; keyTakeaways: string[]; followUpActions: string[]; sentiment: string }>>({});

  // Auth + profile hydration on mount and auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        hydrateProfile();
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s && !profile) {
        hydrateProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function hydrateProfile() {
    try {
      const data = await loadProfile();
      if (data.profile) {
        setProfileState(data.profile);
      }
      // Also load selected companies
      try {
        const { companies } = await loadSelectedCompanies();
        if (companies && companies.length > 0) {
          setSelectedCompaniesState(companies);
        }
      } catch {
        // companies not saved yet — that's fine
      }
    } catch {
      // Profile not found — that's ok, user hasn't set one up yet
    } finally {
      setAuthLoading(false);
    }
  }

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfileState(null);
    setSelectedCompaniesState([]);
    setAllCompaniesState([]);
    setFunnelState(null);
    setGameStateState(null);
    setLeaderboardState(null);
    setSentOutreach([]);
  }, []);

  const setProfile = useCallback((p: UserProfile) => setProfileState(p), []);
  const setSelectedCompanies = useCallback((c: Company[]) => setSelectedCompaniesState(c), []);
  const setAllCompanies = useCallback((c: Company[]) => setAllCompaniesState(c), []);
  const setFunnel = useCallback((f: FunnelState) => setFunnelState(f), []);
  const setGameState = useCallback((g: GameState) => setGameStateState(g), []);
  const setLeaderboard = useCallback((l: Leaderboard | null) => setLeaderboardState(l), []);
  const setIsProfileShared = useCallback((s: boolean) => setIsProfileSharedState(s), []);
  const addSentOutreach = useCallback((alumniId: string, companyId: string) => setSentOutreach((prev) => prev.some((s) => s.alumniId === alumniId) ? prev : [...prev, { alumniId, companyId }]), []);
  const setCompanyAlumniCount = useCallback((companyId: string, count: number) => setCompanyAlumniCountState((prev) => ({ ...prev, [companyId]: count })), []);
  const setAlumniStage = useCallback((alumniId: string, stage: string) => setAlumniStagesState((prev) => ({ ...prev, [alumniId]: stage })), []);
  const getAlumniStage = useCallback((alumniId: string) => alumniStages[alumniId] ?? null, [alumniStages]);
  const addConnection = useCallback((conn: TrackedConnection) => setConnectionsState((prev) => ({ ...prev, [conn.alumniId]: conn })), []);
  const setConnectionNote = useCallback((alumniId: string, note: { summary: string; keyTakeaways: string[]; followUpActions: string[]; sentiment: string }) => setConnectionNotesState((prev) => ({ ...prev, [alumniId]: note })), []);
  const isSent = useCallback((alumniId: string) => sentOutreach.some((s) => s.alumniId === alumniId), [sentOutreach]);
  const getSentCount = useCallback((companyId: string) => sentOutreach.filter((s) => s.companyId === companyId).length, [sentOutreach]);

  return (
    <AppContext.Provider value={{
      session, authLoading, profile, selectedCompanies, allCompanies, funnel, gameState,
      leaderboard, isProfileShared, sentOutreach, companyAlumniCount, alumniStages,
      connections, connectionNotes, signOut, setProfile, setSelectedCompanies, setAllCompanies,
      setFunnel, setGameState, setLeaderboard, setIsProfileShared, addSentOutreach,
      setCompanyAlumniCount, setAlumniStage, getAlumniStage, addConnection, setConnectionNote,
      isSent, getSentCount,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}
