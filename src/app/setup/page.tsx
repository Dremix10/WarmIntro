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
  hq_city?: string | null;
  bankerCount?: number;
  sameSchoolCount?: number;
  groups?: Array<{ name: string; kind: string }>;
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
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
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
  }, [session?.user?.id, authLoading, router]);

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
      setParsed({
        name: profile.name,
        email: profile.email,
        university: profile.university,
        major: profile.major,
        graduationYear: profile.graduationYear,
      });
    }
    // If user already completed setup, hydrate target_firms / target_groups /
    // story so /setup acts as edit mode.
    hydrateExistingPicks();
  }, [profile?.name]);

  async function hydrateExistingPicks() {
    if (!session) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("name, email, university, major, graduation_year, target_firms, target_groups, story_one_liner, resume_text")
        .eq("id", session.user.id)
        .maybeSingle();
      if (!data) return;

      const tf: string[] = (data.target_firms ?? []) as string[];
      const tg: string[] = (data.target_groups ?? []) as string[];
      if (tf.length > 0) setTargetFirms(new Set(tf));
      if (tg.length > 0) setTargetGroups(new Set(tg));
      if (data.story_one_liner) setStory(data.story_one_liner);

      // If we have a saved resume, restore it so the user doesn't have to re-upload
      if (data.resume_text && data.resume_text.trim() && !resumeText.trim()) {
        setResumeText(data.resume_text);
        setFileName("Saved resume");
      }

      // If we have a profile + picks already, jump to step 2 (or whichever later step)
      // and synthesize a parsed object so the picker can render.
      if ((tf.length > 0 || data.story_one_liner) && !persisted) {
        setParsed({
          name: data.name ?? "Student",
          email: data.email ?? undefined,
          university: data.university ?? "Rice University",
          major: data.major ?? "Undeclared",
          graduationYear: data.graduation_year ?? new Date().getFullYear() + 3,
          storyOneLiner: data.story_one_liner ?? undefined,
        });
        setStep("confirm");
      }
    } catch {
      // ignore — fresh users continue with step 1
    }
  }

  async function loadFirms() {
    try {
      const universityParam = profile?.university ? `?university=${encodeURIComponent(profile.university)}` : "";
      const res = await fetch(`/api/setup/firms${universityParam}`);
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
    const { data } = await supabase.from("profiles").select("gmail_connected_at, gmail_email").eq("id", session.user.id).maybeSingle();
    if (data?.gmail_connected_at) {
      setGmailConnected(true);
      if (data.gmail_email) setGmailEmail(data.gmail_email);
    }
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

    const profileRes = await fetch("/api/setup/profile", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        name: parsed.name,
        major: parsed.major,
        graduationYear: parsed.graduationYear,
        university: parsed.university,
        targetFirms: Array.from(targetFirms),
        targetGroups: Array.from(targetGroups),
        storyOneLiner: story || parsed.storyOneLiner || undefined,
        resumeText: resumeText || undefined,
      }),
    });
    if (!profileRes.ok) {
      const err = await profileRes.json().catch(() => ({ error: "unknown" }));
      setError(`Couldn't save profile: ${err.error ?? profileRes.status}`);
      setSaving(false);
      return;
    }

    const trustRes = await fetch("/api/setup/trust", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        sendNewEmail: trust,
        sendFollowup: trust,
        sendReply: trust,
        preferredSendTime: preferredTime,
      }),
    });
    if (!trustRes.ok) {
      const err = await trustRes.json().catch(() => ({ error: "unknown" }));
      setError(`Couldn't save trust settings: ${err.error ?? trustRes.status}`);
      setSaving(false);
      return;
    }

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
                ) : fileName === "Saved resume" ? (
                  <>
                    <p className="text-sm text-[#2E5A88] font-medium">✓ Resume on file</p>
                    <p className="text-xs text-[#14182A]/60 mt-1">Tap to upload a new one, or skip ahead.</p>
                  </>
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

              {/* Skip-ahead button when user has saved resume */}
              {fileName === "Saved resume" && resumeText.trim() && (
                <button
                  type="button"
                  onClick={() => parsed ? setStep("confirm") : runParse(resumeText)}
                  className="w-full mt-3 rounded-xl bg-[#1B3B5F] text-white py-3 text-sm font-medium hover:bg-[#2E5A88] transition-colors"
                >
                  Continue with saved resume →
                </button>
              )}
            </div>

            <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
              <p className="font-[family-name:var(--font-fraunces)] text-lg mb-1">Connect Gmail</p>
              <p className="text-sm text-[#14182A]/70 mb-4">I&apos;ll draft and send from your real address. You always stay in control.</p>
              {gmailConnected ? (
                <div>
                  <p className="text-sm text-[#2E5A88] font-medium">✓ Gmail connected{gmailEmail ? ` as ${gmailEmail}` : ""}</p>
                  <p className="text-xs text-[#14182A]/50 mt-1 italic">Manage in <a href="/account" className="underline hover:text-[#2E5A88]">/account</a></p>
                </div>
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
              <p className="text-sm text-[#14182A]/70 mb-1 italic">Tap everything you&apos;d take a coffee at.</p>
              <p className="text-xs text-[#14182A]/50 mb-5">{targetFirms.size} selected · {firms.length} total</p>

              {(["bulge_bracket", "elite_boutique", "middle_market"] as const).map((tier) => (
                <div key={tier} className="mb-6">
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#C86B4F] font-semibold">{TIER_LABEL[tier]}</p>
                    <p className="text-[10px] text-[#14182A]/40">{firmsByTier[tier].length} firms</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {firmsByTier[tier].map((f) => (
                      <BankCard
                        key={f.id}
                        firm={f}
                        selected={targetFirms.has(f.id)}
                        userUniversity={parsed.university}
                        onToggle={() => toggleFirm(f.id)}
                      />
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

function BankCard({
  firm,
  selected,
  userUniversity,
  onToggle,
}: {
  firm: Firm;
  selected: boolean;
  userUniversity?: string;
  onToggle: () => void;
}) {
  const groups = (firm.groups ?? []).slice(0, 4).map((g) => g.name);
  const sameSchool = firm.sameSchoolCount ?? 0;
  const total = firm.bankerCount ?? 0;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`group relative text-left rounded-2xl px-4 py-3 transition-all duration-200 overflow-hidden ${
        selected
          ? "bg-gradient-to-br from-[#1B3B5F] to-[#2E5A88] text-white shadow-md scale-[1.01]"
          : "bg-white text-[#14182A] border border-[#D9CFB5] hover:border-[#2E5A88] hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {/* Selection pulse dot */}
      {selected && (
        <span className="absolute top-3 right-3 inline-flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8B339] opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E8B339]" />
        </span>
      )}

      {/* Top row: name */}
      <p className={`font-[family-name:var(--font-fraunces)] text-base ${selected ? "text-white" : "text-[#14182A]"}`}>
        {firm.name}
      </p>

      {/* HQ + counts row */}
      <p className={`mt-0.5 text-[11px] ${selected ? "text-white/70" : "text-[#14182A]/60"}`}>
        {firm.hq_city ? `${firm.hq_city} · ` : ""}
        {total > 0 ? `${total} banker${total === 1 ? "" : "s"} on file` : "Building coverage"}
        {sameSchool > 0 ? ` · ${sameSchool} from ${userUniversity?.replace(" University", "") ?? "your school"}` : ""}
      </p>

      {/* Group chips */}
      {groups.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {groups.map((g) => (
            <span
              key={g}
              className={`text-[10px] rounded-full px-2 py-0.5 ${
                selected
                  ? "bg-white/15 text-white/90"
                  : "bg-[#EAE3D2] text-[#14182A]/70"
              }`}
            >
              {g}
            </span>
          ))}
          {(firm.groups?.length ?? 0) > 4 && (
            <span className={`text-[10px] ${selected ? "text-white/60" : "text-[#14182A]/40"}`}>
              +{(firm.groups?.length ?? 0) - 4}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
