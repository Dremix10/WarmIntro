"use client";

import { useEffect, useState, useRef, Suspense, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";

interface Firm {
  id: string;
  name: string;
  tier: "bulge_bracket" | "elite_boutique" | "middle_market";
  domain: string;
}

const TIER_LABEL: Record<Firm["tier"], string> = {
  bulge_bracket: "Bulge Bracket",
  elite_boutique: "Elite Boutique",
  middle_market: "Middle Market",
};

const GROUP_CHOICES: Array<{ id: string; label: string }> = [
  { id: "tmt", label: "TMT" },
  { id: "healthcare", label: "Healthcare" },
  { id: "consumer", label: "Consumer" },
  { id: "industrials", label: "Industrials" },
  { id: "fig", label: "FIG" },
  { id: "energy", label: "Energy" },
  { id: "real-estate", label: "Real Estate" },
  { id: "sponsors", label: "Sponsors" },
  { id: "m-and-a", label: "M&A" },
  { id: "levfin", label: "LevFin" },
  { id: "rssg", label: "Restructuring" },
  { id: "ecm", label: "ECM" },
  { id: "dcm", label: "DCM" },
];

type Step = "upload" | "confirm" | "story" | "done";
type Trust = "C" | "B" | "A";

interface ExtractedProfile {
  name: string;
  email?: string | null;
  university: string;
  major: string;
  graduationYear: number;
  gpa?: number | null;
  clubs?: string[];
  technicalSkills?: string[];
  storyOneLiner?: string | null;
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2E5A88] border-t-transparent" /></div>}>
      <SetupInner />
    </Suspense>
  );
}

const SETUP_STORAGE_KEY = "alma-setup-progress-v1";

interface PersistedSetupState {
  step: Step;
  resumeText: string;
  fileName: string | null;
  parsed: ExtractedProfile | null;
  targetFirms: string[];
  targetGroups: string[];
  story: string;
  trust: Trust;
  preferredTime: string;
}

function loadPersisted(): PersistedSetupState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SETUP_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedSetupState) : null;
  } catch {
    return null;
  }
}

function SetupInner() {
  const { session, authLoading, profile } = useAppState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const persisted = typeof window !== "undefined" ? loadPersisted() : null;
  const [step, setStep] = useState<Step>(persisted?.step ?? "upload");
  const [resumeText, setResumeText] = useState(persisted?.resumeText ?? "");
  const [fileName, setFileName] = useState<string | null>(persisted?.fileName ?? null);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState<ExtractedProfile | null>(persisted?.parsed ?? null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [targetFirms, setTargetFirms] = useState<Set<string>>(new Set(persisted?.targetFirms ?? []));
  const [targetGroups, setTargetGroups] = useState<Set<string>>(new Set(persisted?.targetGroups ?? []));
  const [story, setStory] = useState(persisted?.story ?? "");
  const [trust, setTrust] = useState<Trust>(persisted?.trust ?? "C");
  const [preferredTime, setPreferredTime] = useState(persisted?.preferredTime ?? "07:00");
  const [gmailConnected, setGmailConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist state to sessionStorage on every change so OAuth redirect doesn't lose progress
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const state: PersistedSetupState = {
        step,
        resumeText,
        fileName,
        parsed,
        targetFirms: Array.from(targetFirms),
        targetGroups: Array.from(targetGroups),
        story,
        trust,
        preferredTime,
      };
      sessionStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // sessionStorage full or blocked — silently skip
    }
  }, [step, resumeText, fileName, parsed, targetFirms, targetGroups, story, trust, preferredTime]);

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/");
      return;
    }
  }, [session, authLoading]);

  useEffect(() => {
    // Handle Gmail OAuth callback
    const gmail = searchParams.get("gmail");
    const gmailError = searchParams.get("gmail_error");
    if (gmail === "connected") {
      setGmailConnected(true);
    }
    if (gmailError) {
      setError(`Gmail connection failed: ${gmailError}`);
    }
  }, [searchParams]);

  useEffect(() => {
    loadFirms();
    checkGmail();
    if (profile) {
      // User has an existing profile — prefill what we can
      setParsed({
        name: profile.name,
        email: profile.email,
        university: profile.university,
        major: profile.major,
        graduationYear: profile.graduationYear,
      });
    }
  }, [profile]);

  async function loadFirms() {
    try {
      const res = await fetch("/api/setup/firms");
      if (!res.ok) {
        setError(`Couldn't load banks (HTTP ${res.status}). Try refreshing in a few seconds.`);
        return;
      }
      const json = (await res.json()) as { firms: Firm[]; error?: string };
      if (json.error) {
        setError(`Couldn't load banks: ${json.error}. Contact founders.`);
        return;
      }
      if (!json.firms || json.firms.length === 0) {
        setError("No banks in database yet. The Curator agent seeds on first daily run. Contact founders if this persists.");
        return;
      }
      setFirms(json.firms);
    } catch (err) {
      setError(`Network error loading banks: ${String(err)}`);
    }
  }

  async function checkGmail() {
    if (!session) return;
    const { data } = await supabase.from("profiles").select("gmail_connected_at").eq("id", session.user.id).maybeSingle();
    if (data?.gmail_connected_at) setGmailConnected(true);
  }

  async function handlePdf(file: File) {
    if (!file.name.endsWith(".pdf") && !file.type.includes("pdf")) {
      setError("Please upload a PDF.");
      return;
    }
    setError(null);
    setUploading(true);
    setFileName(file.name);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/extract-pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "extract failed");
      setResumeText(data.text);
      await runParse(data.text);
    } catch (err) {
      setError(String(err));
      setFileName(null);
    } finally {
      setUploading(false);
    }
  }

  async function runParse(text: string) {
    if (!session) return;
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch("/api/parse-resume", {
      method: "POST",
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText: text, university: "Rice University" }),
    });
    if (!res.ok) {
      setError("Resume parse failed.");
      return;
    }
    const { profile: p } = (await res.json()) as { profile: ExtractedProfile };
    setParsed(p);
    setStep("confirm");
  }

  async function connectGmail() {
    if (!session) return;
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch("/api/auth/gmail/start", {
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
    });
    if (res.ok) {
      const { url } = await res.json();
      if (url) window.location.href = url;
      else setError("Gmail OAuth not configured yet.");
    }
  }

  function toggleFirm(id: string) {
    setTargetFirms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(id: string) {
    setTargetGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveAll() {
    if (!session || !parsed) return;
    setSaving(true);
    const { data: { session: s } } = await supabase.auth.getSession();
    const auth = { Authorization: `Bearer ${s?.access_token ?? ""}`, "Content-Type": "application/json" };

    await fetch("/api/setup/profile", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        name: parsed.name,
        major: parsed.major,
        graduationYear: parsed.graduationYear,
        targetFirms: Array.from(targetFirms),
        targetGroups: Array.from(targetGroups),
        storyOneLiner: story || parsed.storyOneLiner || undefined,
      }),
    });

    await fetch("/api/setup/trust", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        sendNewEmail: trust,
        sendFollowup: trust,
        sendReply: trust,
        preferredSendTime: preferredTime,
      }),
    });

    // Kick off the Planner immediately so the user doesn't stare at an empty queue
    fetch("/api/planner/run-now", {
      method: "POST",
      headers: auth,
    }).catch(() => {
      /* non-fatal — cron will catch up next tick */
    });

    setSaving(false);
    setStep("done");
    // Clear persisted setup state once saved to DB
    try { sessionStorage.removeItem(SETUP_STORAGE_KEY); } catch {}
    setTimeout(() => router.push("/today"), 1800);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2E5A88] border-t-transparent" />
      </div>
    );
  }

  const firmsByTier: Record<Firm["tier"], Firm[]> = { bulge_bracket: [], elite_boutique: [], middle_market: [] };
  for (const f of firms) firmsByTier[f.tier].push(f);

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A]">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-1">Setup</p>
        <h1 className="text-4xl font-[family-name:var(--font-fraunces)] font-medium mb-2">Let&apos;s get Alma running</h1>
        <p className="text-sm text-[#14182A]/70 mb-8 italic font-[family-name:var(--font-fraunces)]">Three quick steps. You&apos;ll be live tonight.</p>

        {/* Step 1 — Upload + Gmail */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
              <p className="text-xs uppercase tracking-wider text-[#C86B4F] font-semibold mb-2">Step 1 of 3</p>
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl mb-4">Drop your resume</h2>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const f = e.target.files?.[0];
                  if (f) handlePdf(f);
                }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border-2 border-dashed border-[#D9CFB5] py-10 text-center cursor-pointer hover:border-[#2E5A88] transition-colors"
              >
                {uploading ? (
                  <p className="text-sm text-[#14182A]/70">Reading {fileName}...</p>
                ) : fileName ? (
                  <p className="text-sm text-[#2E5A88] font-medium">{fileName}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">Drop a PDF or tap to browse</p>
                    <p className="text-xs text-[#14182A]/60 mt-1">I&apos;ll pull out what I need.</p>
                  </>
                )}
              </div>

              {error && <p className="mt-3 text-xs text-[#C86B4F]">{error}</p>}
            </div>

            <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
              <p className="font-[family-name:var(--font-fraunces)] text-lg mb-1">Connect Gmail</p>
              <p className="text-sm text-[#14182A]/70 mb-4">I&apos;ll draft and send from your real address. You always stay in control.</p>
              {gmailConnected ? (
                <p className="text-sm text-[#2E5A88]">✓ Gmail connected</p>
              ) : (
                <button
                  type="button"
                  onClick={connectGmail}
                  className="rounded-lg bg-[#2E5A88] text-white px-5 py-2 text-sm font-medium hover:bg-[#1B3B5F] transition-colors"
                >
                  Connect Gmail
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Confirm + target firms */}
        {step === "confirm" && parsed && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
              <p className="text-xs uppercase tracking-wider text-[#C86B4F] font-semibold mb-2">Step 2 of 3</p>
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl mb-4">This look right?</h2>

              <div className="space-y-3 text-sm">
                <ProfileRow label="Name" value={parsed.name} onChange={(v) => setParsed({ ...parsed, name: v })} />
                <ProfileRow label="Major" value={parsed.major} onChange={(v) => setParsed({ ...parsed, major: v })} />
                <ProfileRow label="Grad year" value={String(parsed.graduationYear)} onChange={(v) => setParsed({ ...parsed, graduationYear: parseInt(v, 10) || parsed.graduationYear })} />
                {parsed.gpa && <p className="text-[#14182A]/70">GPA: {parsed.gpa}</p>}
                {parsed.clubs && parsed.clubs.length > 0 && (
                  <p className="text-[#14182A]/70">Clubs: {parsed.clubs.join(", ")}</p>
                )}
                {parsed.technicalSkills && parsed.technicalSkills.length > 0 && (
                  <p className="text-[#14182A]/70">Skills: {parsed.technicalSkills.slice(0, 6).join(", ")}</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
              <p className="font-[family-name:var(--font-fraunces)] text-lg mb-1">Which banks?</p>
              <p className="text-sm text-[#14182A]/70 mb-4 italic">Tap everything you&apos;d take a coffee at. I&apos;ll prioritize them.</p>

              {(["bulge_bracket", "elite_boutique", "middle_market"] as const).map((tier) => (
                <div key={tier} className="mb-4">
                  <p className="text-xs uppercase tracking-wider text-[#14182A]/50 font-semibold mb-2">{TIER_LABEL[tier]}</p>
                  <div className="flex flex-wrap gap-2">
                    {firmsByTier[tier].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFirm(f.id)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          targetFirms.has(f.id)
                            ? "bg-[#2E5A88] text-white border-[#2E5A88]"
                            : "bg-white text-[#14182A]/80 border-[#D9CFB5] hover:border-[#2E5A88]"
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
              <p className="font-[family-name:var(--font-fraunces)] text-lg mb-1">Coverage or product groups?</p>
              <p className="text-sm text-[#14182A]/70 mb-4 italic">Pick 2-4. Leave blank if you&apos;re undecided; I&apos;ll mix.</p>
              <div className="flex flex-wrap gap-2">
                {GROUP_CHOICES.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      targetGroups.has(g.id)
                        ? "bg-[#C86B4F] text-white border-[#C86B4F]"
                        : "bg-white text-[#14182A]/80 border-[#D9CFB5] hover:border-[#C86B4F]"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep("story")}
              disabled={targetFirms.size === 0}
              className="w-full rounded-xl bg-[#2E5A88] text-white py-3 font-medium hover:bg-[#1B3B5F] transition-colors disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 3 — Story + trust */}
        {step === "story" && parsed && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
              <p className="text-xs uppercase tracking-wider text-[#C86B4F] font-semibold mb-2">Step 3 of 3</p>
              <h2 className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">One sentence — why IB?</h2>
              <p className="text-sm text-[#14182A]/70 mb-4 italic">I&apos;ll use it in every email I write for you.</p>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder={parsed.storyOneLiner ?? "The deal I want to be on the team of is..."}
                rows={3}
                className="w-full rounded-lg border border-[#D9CFB5] bg-[#EAE3D2]/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20"
              />
              {parsed.storyOneLiner && !story && (
                <button
                  type="button"
                  onClick={() => setStory(parsed.storyOneLiner ?? "")}
                  className="mt-2 text-xs text-[#2E5A88] hover:underline"
                >
                  Use what&apos;s on my resume
                </button>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
              <p className="font-[family-name:var(--font-fraunces)] text-lg mb-1">How autonomous?</p>
              <p className="text-sm text-[#14182A]/70 mb-4 italic">Start conservative. You can turn it up anytime.</p>

              <div className="space-y-2">
                {(["C", "B", "A"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrust(t)}
                    className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                      trust === t
                        ? "bg-[#2E5A88] text-white border-[#2E5A88]"
                        : "bg-white text-[#14182A] border-[#D9CFB5] hover:border-[#2E5A88]"
                    }`}
                  >
                    <p className="text-sm font-medium">{t === "C" ? "Copilot — I draft, you send" : t === "B" ? "Preview-veto — I queue and send unless you stop me" : "Autopilot — I send, you see the digest"}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
              <p className="font-[family-name:var(--font-fraunces)] text-lg mb-1">When should I run?</p>
              <p className="text-sm text-[#14182A]/70 mb-3">Daily send time. Change anytime from the dashboard.</p>
              <input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="rounded-lg border border-[#D9CFB5] bg-[#EAE3D2]/40 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={saveAll}
              disabled={saving}
              className="w-full rounded-xl bg-[#C86B4F] text-white py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Setting up..." : "Start Alma"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="rounded-2xl bg-white p-10 border border-[#D9CFB5] text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-3xl mb-2">You&apos;re set.</p>
            <p className="text-sm text-[#14182A]/70 italic">I&apos;ll line up your first drafts for {preferredTime} tomorrow.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs text-[#14182A]/50 uppercase tracking-wider">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent border-b border-[#D9CFB5] focus:border-[#2E5A88] outline-none py-1 text-sm"
      />
    </div>
  );
}
