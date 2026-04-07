import type {
  ParseResumeRequest,
  ParseResumeResponse,
  FindCompaniesRequest,
  FindCompaniesResponse,
  FindAlumniRequest,
  FindAlumniResponse,
  GenerateOutreachRequest,
  GenerateOutreachResponse,
  UpdateFunnelRequest,
  UpdateFunnelResponse,
  UserProfile,
  Alumni,
  Company,
  Badge,
} from "@/shared/types";
import {
  MOCK_PROFILE,
  MOCK_COMPANIES,
  MOCK_TESLA_ALUMNI,
  MOCK_WARM_PATHS,
  MOCK_FUNNEL,
  MOCK_GAME_STATE,
  MOCK_OUTREACH_DRAFTS,
} from "./mock-data";

const USE_MOCKS = false;

function randomDelay(): Promise<void> {
  const ms = 500 + Math.random() * 300;
  return new Promise((r) => setTimeout(r, ms));
}

import { supabase } from "@/lib/supabase-browser";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function apiFetch<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  return res.json();
}

async function apiGet<T>(url: string): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  return res.json();
}

export async function parseResume(
  req: ParseResumeRequest
): Promise<ParseResumeResponse> {
  if (USE_MOCKS) {
    await randomDelay();
    return { profile: { ...MOCK_PROFILE, resumeText: req.resumeText } };
  }
  return apiFetch("/api/parse-resume", req);
}

export async function findCompanies(
  req: FindCompaniesRequest
): Promise<FindCompaniesResponse> {
  if (USE_MOCKS) {
    await randomDelay();
    const filtered = MOCK_COMPANIES.filter(
      (c) => req.industries.length === 0 || req.industries.includes(c.industry)
    );
    return { companies: filtered.sort((a, b) => b.warmthScore - a.warmthScore) };
  }
  return apiFetch("/api/find-companies", req);
}

export async function findAlumni(
  req: FindAlumniRequest
): Promise<FindAlumniResponse> {
  if (USE_MOCKS) {
    await randomDelay();
    if (req.companyId === "tesla") {
      return { alumni: MOCK_TESLA_ALUMNI, warmPaths: MOCK_WARM_PATHS };
    }
    return { alumni: [], warmPaths: [] };
  }
  return apiFetch("/api/find-alumni", req);
}

export async function generateOutreach(
  req: GenerateOutreachRequest
): Promise<GenerateOutreachResponse> {
  if (USE_MOCKS) {
    await randomDelay();
    return {
      drafts: MOCK_OUTREACH_DRAFTS.map((d) => ({
        ...d,
        alumniId: req.alumni.id,
        companyId: req.company.id,
      })),
    };
  }
  return apiFetch("/api/generate-outreach", req);
}

export async function updateFunnel(
  req: UpdateFunnelRequest
): Promise<UpdateFunnelResponse> {
  if (USE_MOCKS) {
    await randomDelay();
    const updatedFunnel = { ...MOCK_FUNNEL };
    const updatedGame = { ...MOCK_GAME_STATE };
    let xpGained = 0;
    const newBadges: Badge[] = [];

    switch (req.action) {
      case "outreach_sent":
        updatedFunnel.stages[0].currentCount += 1;
        updatedFunnel.totalOutreachDone += 1;
        xpGained = 10;
        break;
      case "reply_received":
        updatedFunnel.stages[1].currentCount += 1;
        xpGained = 25;
        break;
      case "coffee_booked":
        updatedFunnel.stages[1].currentCount += 1;
        xpGained = 50;
        break;
      case "referral_earned":
        updatedFunnel.stages[2].currentCount += 1;
        xpGained = 100;
        break;
    }

    updatedGame.xp += xpGained;
    updatedGame.recentActions = [
      {
        type: req.action,
        xpGained,
        description: `Action: ${req.action} for company ${req.companyId}`,
        timestamp: new Date().toISOString(),
      },
      ...updatedGame.recentActions,
    ];

    return { funnel: updatedFunnel, gameState: updatedGame, xpGained, newBadges };
  }
  return apiFetch("/api/update-funnel", req);
}

export async function generateFollowUp(req: {
  userProfile: UserProfile;
  alumni: Alumni;
  company: Company;
  originalBody: string;
}): Promise<GenerateOutreachResponse> {
  return apiFetch("/api/generate-followup", req);
}

export async function getCoachingTip(req: {
  stage: string;
  alumniName: string;
  alumniRole: string;
  companyName: string;
  userMajor: string;
}): Promise<{ tip: string; nextAction: string }> {
  return apiFetch("/api/coaching-tip", req);
}

export async function summarizeRecording(req: {
  transcript: string;
  alumniName: string;
  alumniRole: string;
  companyName: string;
}): Promise<{
  summary: string;
  keyTakeaways: string[];
  followUpActions: string[];
  sentiment: "positive" | "neutral" | "needs_attention";
}> {
  return apiFetch("/api/summarize-recording", req);
}

// ===== AUTH =====

export async function signUp(email: string, password: string) {
  return apiFetch<{
    user: { id: string; email: string } | null;
    session: { access_token: string; refresh_token: string } | null;
  }>("/api/auth/signup", { email, password });
}

export async function signIn(email: string, password: string) {
  return apiFetch<{
    user: { id: string; email: string };
    session: { access_token: string; refresh_token: string };
  }>("/api/auth/signin", { email, password });
}

export async function loadProfile(): Promise<{
  profile: UserProfile | null;
  referralCode: string | null;
  companyUnlocks: number;
}> {
  return apiGet("/api/profile");
}

export async function saveProfile(profile: UserProfile): Promise<{ success: boolean; referralCode: string }> {
  return apiFetch("/api/profile", { profile });
}
