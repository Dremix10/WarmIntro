"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type {
  UserProfile,
  Company,
  FunnelState,
  GameState,
} from "@/shared/types";

interface AppState {
  profile: UserProfile | null;
  selectedCompanies: Company[];
  allCompanies: Company[];
  funnel: FunnelState | null;
  gameState: GameState | null;
  setProfile: (profile: UserProfile) => void;
  setSelectedCompanies: (companies: Company[]) => void;
  setAllCompanies: (companies: Company[]) => void;
  setFunnel: (funnel: FunnelState) => void;
  setGameState: (gameState: GameState) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [selectedCompanies, setSelectedCompaniesState] = useState<Company[]>([]);
  const [allCompanies, setAllCompaniesState] = useState<Company[]>([]);
  const [funnel, setFunnelState] = useState<FunnelState | null>(null);
  const [gameState, setGameStateState] = useState<GameState | null>(null);

  const setProfile = useCallback((p: UserProfile) => setProfileState(p), []);
  const setSelectedCompanies = useCallback((c: Company[]) => setSelectedCompaniesState(c), []);
  const setAllCompanies = useCallback((c: Company[]) => setAllCompaniesState(c), []);
  const setFunnel = useCallback((f: FunnelState) => setFunnelState(f), []);
  const setGameState = useCallback((g: GameState) => setGameStateState(g), []);

  return (
    <AppContext.Provider
      value={{
        profile,
        selectedCompanies,
        allCompanies,
        funnel,
        gameState,
        setProfile,
        setSelectedCompanies,
        setAllCompanies,
        setFunnel,
        setGameState,
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
