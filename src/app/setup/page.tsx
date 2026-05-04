"use client";

import { useEffect, useState, useRef, Suspense, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";
import { GROUP_LABELS, GROUP_KIND, groupDescription } from "@/lib/labels";

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

const GROUP_CHOICES: Array<{ id: string; label: string }> = Object.entries(GROUP_LABELS).map(
  ([id, label]) => ({ id, label })
);

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
  // Stamped with the user_id that wrote it. If the current session belongs to
  // a different user, we ignore the persisted state — defense against stale
  // sessionStorage bleeding from the previous account on the same browser.
  userId?: string;
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

function loadPersisted(currentUserId: string | undefined): PersistedSetupState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SETUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSetupState;
    if (parsed.userId && currentUserId && parsed.userId !== currentUserId) {
      sessionStorage.removeItem(SETUP_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function SetupInner() {
  const { session, authLoading, profile } = useAppState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const persisted = typeof window !== "undefined" ? loadPersisted(session?.user.id) : null;
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
  // 'unknown' on first render until checkGmail() resolves — avoids a flash of
  // "Gmail not connected" on every refresh for users who already connected.
  const [gmailConnected, setGmailConnected] = useState<boolean | "unknown">("unknown");
  const [gmailEmail, setGmailEmail] = useState<string | null>(null);
  const [gmailPending, setGmailPending] = useState(false);
  const [bankInfo, setBankInfo] = useState<Firm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist state to sessionStorage on every change so OAuth redirect doesn't lose progress
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Don't re-persist after the user finishes setup — otherwise a Gmail
    // connect from the "Almost there" screen leaves step="done" in
    // sessionStorage forever. /today redirecting back to /setup then
    // re-mounts and re-pushes to /today => infinite loop until rate limit
    // bites. Cofounder hit this at 21:25-21:32 UTC on 2026-04-27.
    if (step === "done") {
      try { sessionStorage.removeItem(SETUP_STORAGE_KEY); } catch {}
      return;
    }
    try {
      const state: PersistedSetupState = {
        userId: session?.user.id,
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
  }, [session?.user.id, step, resumeText, fileName, parsed, targetFirms, targetGroups, story, trust, preferredTime]);

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/");
      return;
    }
  }, [session?.user?.id, authLoading, router]);

  useEffect(() => {
    // Handle Gmail OAuth callback. Two cases:
    //   1. Same-tab fallback: ?gmail=connected lands on /setup directly.
    //   2. New-tab popup flow: this tab IS the popup. Tell the opener and close.
    const gmail = searchParams.get("gmail");
    const gmailError = searchParams.get("gmail_error");

    if ((gmail || gmailError) && typeof window !== "undefined" && window.opener) {
      // Popup flow — notify opener, close ourselves.
      try {
        window.opener.postMessage(
          { type: "alma-gmail-oauth", status: gmail ?? "error", error: gmailError ?? null },
          window.location.origin
        );
      } catch {
        // postMessage can throw if origins mismatch — opener will fall back to polling.
      }
      window.close();
      return;
    }

    if (gmail === "connected") setGmailConnected(true);
    if (gmailError) setError(`Gmail connection failed: ${gmailError}`);
  }, [searchParams]);

  // If user connects Gmail from the "Almost there" success screen, bounce
  // them to /today now that the launch gate is met.
  useEffect(() => {
    if (step === "done" && gmailConnected === true) {
      const id = setTimeout(() => router.push("/today"), 1500);
      return () => clearTimeout(id);
    }
  }, [step, gmailConnected, router]);

  // Listen for the OAuth popup to post back its result.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; status?: string; error?: string | null } | null;
      if (data?.type !== "alma-gmail-oauth") return;
      setGmailPending(false);
      if (data.status === "connected") {
        setGmailConnected(true);
        checkGmail();
      } else if (data.error) {
        setError(`Gmail connection failed: ${data.error}`);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.name, session?.user?.id]);

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

      // If we have a profile + picks already, jump to step 2 with a synthesized
      // parsed object. We override any stale sessionStorage step here — DB state
      // is the source of truth, especially for users whose persisted state
      // predates resume_text being saved.
      if (tf.length > 0 || data.story_one_liner) {
        const sessionEmail = session.user.email ?? "";
        const fallbackUniversity =
          sessionEmail.endsWith("@brown.edu") ? "Brown University" : "Rice University";
        setParsed((prev) => prev ?? ({
          name: data.name ?? "Student",
          email: data.email ?? undefined,
          university: data.university ?? fallbackUniversity,
          major: data.major ?? "Undeclared",
          graduationYear: data.graduation_year ?? new Date().getFullYear() + 3,
          storyOneLiner: data.story_one_liner ?? undefined,
        }));

        // Edit-mode honors ?edit= from /account: "resume" → start at upload,
        // "targets" → go to confirm. Default for someone with picks: confirm.
        const editMode = searchParams.get("edit");
        if (editMode === "resume") {
          // CRITICAL: clear any pre-filled resume state so the user must
          // actually upload a new one. Otherwise the dropzone shows "Saved
          // resume" + Continue button, and clicking Continue re-saves the
          // existing text — fooling them into thinking the new upload
          // worked when nothing changed.
          setResumeText("");
          setFileName(null);
          setParsed(null);
          setStep("upload");
        } else {
          // Only auto-jump if the user is currently on the upload step.
          setStep((current) => (current === "upload" ? "confirm" : current));
        }
      }
    } catch {
      // ignore — fresh users continue with step 1
    }
  }

  async function loadFirms() {
    if (firms.length > 0) return; // already loaded — don't refetch on every effect run
    try {
      const universityParam = profile?.university ? `?university=${encodeURIComponent(profile.university)}` : "";
      const res = await fetch(`/api/setup/firms${universityParam}`);
      if (res.status === 429) {
        // Backoff and retry once — should be rare now that the route is rate-limit-exempt
        await new Promise((r) => setTimeout(r, 1500));
        const retry = await fetch(`/api/setup/firms${universityParam}`);
        if (!retry.ok) {
          setError(`Couldn't load banks (${retry.status}). Refresh in a few seconds.`);
          return;
        }
        const json = (await retry.json()) as { firms: Firm[]; error?: string };
        if (json.firms?.length) setFirms(json.firms);
        return;
      }
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
    } else {
      setGmailConnected(false);
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
    // Derive university hint from email domain. Hardcoding "Rice University"
    // here was biasing Brown students' parses → drafts went out claiming the
    // user was a Rice student.
    const email = session.user.email ?? "";
    const universityHint =
      email.endsWith("@brown.edu") ? "Brown University"
        : email.endsWith("@rice.edu") ? "Rice University"
        : ""; // empty → resume parser must extract from the resume itself
    const res = await fetch("/api/parse-resume", {
      method: "POST",
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText: text, university: universityHint }),
    });
    if (!res.ok) {
      setError("Resume parse failed.");
      return;
    }
    const { profile: p } = (await res.json()) as { profile: ExtractedProfile };
    setParsed(p);
    // Don't auto-advance — the user clicks "Continue" once they've also
    // confirmed Gmail (or chosen to skip). Auto-advancing skipped past the
    // Gmail prompt entirely for the cofounder. See feedback 2026-04-27.
  }

  async function connectGmail() {
    if (!session) return;
    const { data: { session: s } } = await supabase.auth.getSession();
    const res = await fetch("/api/auth/gmail/start", {
      headers: { Authorization: `Bearer ${s?.access_token ?? ""}` },
    });
    if (!res.ok) {
      setError("Gmail OAuth failed to start.");
      return;
    }
    const { url } = await res.json();
    if (!url) {
      setError("Gmail OAuth not configured yet.");
      return;
    }

    // Open in a new tab so users don't lose their setup progress if they
    // pick the wrong Google account or get bounced. The callback page
    // detects window.opener, posts a message back, and self-closes.
    const popup = window.open(url, "alma-gmail-oauth");
    if (!popup) {
      // Popup blocker — fall back to same-tab redirect.
      window.location.href = url;
      return;
    }

    setGmailPending(true);

    // Watch for the popup closing (postMessage handler also covers this,
    // but the user could close the tab themselves without finishing).
    const pollId = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(pollId);
        setGmailPending(false);
        checkGmail();
      }
    }, 600);
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

    // Kick off three Planner runs back-to-back so the user gets at least 3
    // drafts in their queue immediately. Each run picks ONE banker (capped at
    // 1 to fit Vercel's 60s function limit). The Researcher's dedup against
    // active drafts means run #2 and #3 each pick a *different* banker.
    // Fire-and-forget — the cron picks up the rest. Slight delay between
    // calls so the prior run can write its draft row before the next run
    // queries existing drafts.
    (async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await fetch("/api/planner/run-now", { method: "POST", headers: auth });
        } catch {
          // non-fatal; cron will catch up
        }
        if (i < 2) await new Promise((r) => setTimeout(r, 1500));
      }
    })();

    setSaving(false);
    setStep("done");
    // Clear persisted setup state once saved to DB
    try { sessionStorage.removeItem(SETUP_STORAGE_KEY); } catch {}
    // Only auto-bounce to /today if Gmail is connected — otherwise the "done"
    // screen has a Connect Gmail call-to-action and we want the user to stay
    // until they finish that.
    if (gmailConnected === true) {
      setTimeout(() => router.push("/today"), 1800);
    }
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

  // Map current step to a 1-based index for the indicator strip.
  const stepIndex = step === "upload" ? 1 : step === "confirm" ? 2 : step === "story" ? 3 : 4;

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-1">Setup</p>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-fraunces)] font-medium mb-2">Let&apos;s get Alma running</h1>
        <p className="text-sm text-[#14182A]/70 mb-6 italic font-[family-name:var(--font-fraunces)]">Three quick steps. You&apos;ll be live tonight.</p>

        {/* Step indicator strip — equal-width pills + equal bars for symmetry */}
        {step !== "done" && (
          <div className="mb-7 grid items-center gap-0" style={{ gridTemplateColumns: "1fr 8px 1fr 8px 1fr" }}>
            {[
              { num: 1, label: "Resume" },
              { num: 2, label: "Confirm" },
              { num: 3, label: "Voice" },
            ].map((s, i) => {
              const state = s.num < stepIndex ? "done" : s.num === stepIndex ? "active" : "todo";
              return (
                <div key={s.num} className="contents">
                  <div
                    className={`flex items-center justify-center gap-2 whitespace-nowrap rounded-full border px-2 py-2 text-[11px] font-medium transition-all sm:px-3 sm:text-xs ${
                      state === "active"
                        ? "bg-[#1B3B5F] text-white border-[#1B3B5F] shadow-[0_8px_20px_-8px_rgba(27,59,95,0.45)]"
                        : state === "done"
                          ? "bg-[#2E5A88]/10 text-[#1B3B5F] border-[#2E5A88]/25"
                          : "bg-white text-[#5C6472] border-[#D9CFB5]"
                    }`}
                  >
                    <span
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold font-[family-name:var(--font-fraunces)] ${
                        state === "active"
                          ? "bg-white text-[#1B3B5F]"
                          : state === "done"
                            ? "bg-[#1B3B5F] text-white"
                            : "bg-[#EAE3D2] text-[#5C6472]"
                      }`}
                    >
                      {state === "done" ? "✓" : s.num}
                    </span>
                    {s.label}
                  </div>
                  {i < 2 && <span className="h-px bg-[#D9CFB5] sm:w-7" aria-hidden />}
                </div>
              );
            })}
          </div>
        )}

        {/* Persistent Gmail status — visible on every step so users can connect
            Gmail any time, not just from step 1. */}
        <div className={`mb-6 rounded-xl border px-4 py-2.5 flex items-center justify-between gap-3 text-sm ${
          gmailConnected === true
            ? "bg-[#2E5A88]/5 border-[#2E5A88]/20"
            : gmailConnected === false
              ? "bg-[#C86B4F]/5 border-[#C86B4F]/20"
              : "bg-white border-[#D9CFB5]"
        }`}>
          <div className="flex-1 min-w-0">
            <p className={`truncate font-medium ${
              gmailConnected === true ? "text-[#2E5A88]"
                : gmailConnected === false ? "text-[#14182A]"
                : "text-[#14182A]/50"
            }`}>
              {gmailConnected === true
                ? `Gmail: connected${gmailEmail ? ` as ${gmailEmail}` : ""}`
                : gmailConnected === false
                  ? "Gmail: not connected"
                  : "Gmail: checking…"}
            </p>
            {gmailConnected === false && (
              <p className="text-xs text-[#14182A]/60 mt-0.5">Required for Alma to send.</p>
            )}
          </div>
          {gmailConnected === false && (
            <button
              type="button"
              onClick={connectGmail}
              disabled={gmailPending}
              className="shrink-0 rounded-lg bg-[#2E5A88] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#1B3B5F] transition-colors disabled:opacity-50"
            >
              {gmailPending ? "Waiting…" : "Connect"}
            </button>
          )}
        </div>

        {/* Step 1 — Upload + Gmail */}
        {step === "upload" && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_0.85fr] md:items-start gap-5 md:gap-6">
          <div className="space-y-4">
            <MobileWhy step="upload" />
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

              {/* Parsed-profile preview shown after parse completes — gives the user
                  a moment to confirm Alma got the basics right before moving on. */}
              {parsed && !uploading && (
                <div className="mt-4 rounded-xl bg-[#EAE3D2]/50 border border-[#D9CFB5] p-4 text-sm">
                  <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-2">Got it</p>
                  <p><span className="text-[#14182A]/60">Name:</span> {parsed.name}</p>
                  <p><span className="text-[#14182A]/60">School:</span> {parsed.university}</p>
                  <p><span className="text-[#14182A]/60">Major · Grad:</span> {parsed.major} · &lsquo;{String(parsed.graduationYear).slice(2)}</p>
                  {parsed.clubs && parsed.clubs.length > 0 && (
                    <p className="mt-1 text-xs text-[#14182A]/60">Clubs spotted: {parsed.clubs.slice(0, 4).join(", ")}{parsed.clubs.length > 4 ? "..." : ""}</p>
                  )}
                </div>
              )}
            </div>

            {/* Explicit Continue button — replaces the auto-advance that skipped past
                the Gmail prompt entirely. Gmail status is shown by the persistent
                banner above; this button always lets the user move on. */}
            <button
              type="button"
              onClick={() => setStep("confirm")}
              disabled={!parsed || uploading}
              className="w-full rounded-xl bg-[#1B3B5F] text-white py-3 font-medium hover:bg-[#2E5A88] transition-colors disabled:opacity-40"
            >
              {parsed ? "Continue →" : "Drop your resume to continue"}
            </button>
          </div>
          <div className="hidden md:block"><MentorCompanion step="upload" /></div>
          </div>
        )}

        {/* Step 2 — Confirm + target firms */}
        {step === "confirm" && parsed && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_0.85fr] md:items-start gap-5 md:gap-6">
          <div className="space-y-4">
            <MobileWhy step="confirm" />
            <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#C86B4F] font-semibold mb-2">Step 2 of 3</p>
                  <h2 className="font-[family-name:var(--font-fraunces)] text-2xl">This look right?</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setParsed(null);
                    setResumeText("");
                    setFileName(null);
                    setStep("upload");
                  }}
                  className="text-xs text-[#2E5A88] hover:text-[#1B3B5F] underline shrink-0"
                >
                  Re-upload resume
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <ProfileRow label="Name" value={parsed.name} onChange={(v) => setParsed({ ...parsed, name: v })} />
                <ProfileRow label="School" value={parsed.university} onChange={(v) => setParsed({ ...parsed, university: v })} />
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
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                    {firmsByTier[tier].map((f) => (
                      <BankCard
                        key={f.id}
                        firm={f}
                        selected={targetFirms.has(f.id)}
                        userUniversity={parsed.university}
                        onToggle={() => toggleFirm(f.id)}
                        onInfo={() => setBankInfo(f)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
              <p className="font-[family-name:var(--font-fraunces)] text-lg mb-1">Coverage or product groups?</p>
              <p className="text-sm text-[#14182A]/70 mb-4 italic">Pick 2-4. Leave blank if you&apos;re undecided; I&apos;ll mix.</p>

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#14182A]/50 mb-2">Coverage (industry)</p>
                  <div className="flex flex-wrap gap-2">
                    {GROUP_CHOICES.filter((g) => GROUP_KIND[g.id] === "coverage").map((g) => (
                      <GroupChip
                        key={g.id}
                        id={g.id}
                        label={g.label}
                        selected={targetGroups.has(g.id)}
                        onToggle={() => toggleGroup(g.id)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#14182A]/50 mb-2">Product (deal type)</p>
                  <div className="flex flex-wrap gap-2">
                    {GROUP_CHOICES.filter((g) => GROUP_KIND[g.id] === "product").map((g) => (
                      <GroupChip
                        key={g.id}
                        id={g.id}
                        label={g.label}
                        selected={targetGroups.has(g.id)}
                        onToggle={() => toggleGroup(g.id)}
                      />
                    ))}
                  </div>
                </div>
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
          <div className="hidden md:block"><MentorCompanion step="confirm" /></div>
          </div>
        )}

        {/* Step 3 — Story + trust */}
        {step === "story" && parsed && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_0.85fr] md:items-start gap-5 md:gap-6">
          <div className="space-y-4">
            <MobileWhy step="story" />
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
                {([
                  { key: "C", num: 1, name: "Copilot", desc: "I draft. You review and send from Gmail." },
                  { key: "B", num: 2, name: "Preview-veto", desc: "Drafts queue for 15 min. Stop them, or let them send." },
                  { key: "A", num: 3, name: "Autopilot", desc: "I send. You read a Sunday digest." },
                ] as const).map((opt) => {
                  const selected = trust === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setTrust(opt.key)}
                      className={`w-full text-left rounded-lg border px-4 py-3 transition-colors flex items-center gap-3 ${
                        selected
                          ? "bg-[#2E5A88] text-white border-[#2E5A88]"
                          : "bg-white text-[#14182A] border-[#D9CFB5] hover:border-[#2E5A88]"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold font-[family-name:var(--font-fraunces)] ${
                          selected ? "bg-white text-[#2E5A88]" : "bg-[#EAE3D2] text-[#14182A]"
                        }`}
                      >
                        {opt.num}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold">{opt.name}</span>
                        <span className={`block text-xs mt-0.5 ${selected ? "text-white/85" : "text-[#14182A]/60"}`}>{opt.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 border border-[#D9CFB5]">
              <p className="font-[family-name:var(--font-fraunces)] text-lg mb-1">What time should Alma send each day?</p>
              <p className="text-sm text-[#14182A]/70 mb-4">
                Once a day at this time, Alma drafts new outreach. Emails go out from your Gmail.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { label: "6:00 am", value: "06:00" },
                  { label: "7:00 am", value: "07:00" },
                  { label: "8:00 am", value: "08:00" },
                  { label: "9:00 am", value: "09:00" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPreferredTime(opt.value)}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                      preferredTime === opt.value
                        ? "bg-[#2E5A88] text-white border-[#2E5A88]"
                        : "bg-white text-[#14182A] border-[#D9CFB5] hover:border-[#2E5A88]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-[#14182A]/40">7 am is most common — emails land before bankers&rsquo; first meeting. Change anytime from your dashboard.</p>
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
          <div className="hidden md:block"><MentorCompanion step="story" /></div>
          </div>
        )}

        {step === "done" && gmailConnected === true && (
          <div className="rounded-2xl bg-white p-10 border border-[#D9CFB5] text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-3xl mb-2">You&apos;re set.</p>
            <p className="text-sm text-[#14182A]/70 italic">I&apos;ll line up your first drafts for {preferredTime} tomorrow.</p>
          </div>
        )}

        {step === "done" && gmailConnected !== true && (
          <div className="rounded-2xl bg-white p-8 border-2 border-[#C86B4F]/30 text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-3xl mb-2">Almost there.</p>
            <p className="text-sm text-[#14182A]/70 mb-1">Profile saved. Alma can&apos;t draft outreach until Gmail is connected — that&apos;s the mailbox the messages send from.</p>
            <p className="text-xs text-[#14182A]/50 italic mb-6 font-[family-name:var(--font-fraunces)]">Takes 15 seconds. Opens in a new tab.</p>
            <button
              type="button"
              onClick={connectGmail}
              disabled={gmailPending}
              className="rounded-xl bg-[#2E5A88] text-white px-6 py-3 text-sm font-medium hover:bg-[#1B3B5F] transition-colors disabled:opacity-50"
            >
              {gmailPending ? "Waiting for Google…" : "Connect Gmail"}
            </button>
            <div className="mt-6 pt-4 border-t border-[#D9CFB5]">
              <a href="/today" className="text-xs text-[#14182A]/40 hover:text-[#2E5A88] underline">
                Skip for now and connect later
              </a>
            </div>
          </div>
        )}
      </div>

      {bankInfo && <BankInfoModal firm={bankInfo} onClose={() => setBankInfo(null)} />}
    </div>
  );
}

/**
 * Mobile setup help — compact disclosure above each form section. The desktop
 * mentor sidecar is too tall for first-run phone setup.
 */
function MobileWhy({ step }: { step: "upload" | "confirm" | "story" }) {
  const content = step === "upload" ? (
    <>
      <p><strong>Why your resume:</strong> I pull your school, major, and clubs to find alumni who&rsquo;ll take your call and write emails that sound like you.</p>
      <p><strong>Where it lives:</strong> stored privately in your account. Delete any time from /account.</p>
      <p><strong>Why Gmail:</strong> messages send from your address. Bankers reply to you, not Alma.</p>
    </>
  ) : step === "confirm" ? (
    <>
      <p><strong>Why double-check:</strong> 30 seconds now means every email I write later starts from the right place.</p>
      <p><strong>BB / EB / MM:</strong> Bulge Bracket (GS, MS, JPM...), Elite Boutique (Evercore, Lazard...), Middle Market (Houlihan, Jefferies...).</p>
      <p><strong>Coverage vs product:</strong> coverage = industry (TMT, Healthcare). Product = deal type (M&amp;A, LevFin).</p>
    </>
  ) : (
    <>
      <p><strong>Why your story:</strong> bankers spot generic templates in 3 seconds. Specific is better than impressive: name a deal, a city, a teammate.</p>
      <p><strong>Trust level:</strong> start in Copilot for the first two weeks. Dial up as you trust my voice.</p>
      <p><strong>Run time:</strong> I draft once a day at this hour. 7-8am is popular because emails land before bankers&rsquo; first meeting.</p>
    </>
  );

  return (
    <details className="group rounded-2xl border border-[#D9CFB5] bg-gradient-to-br from-[#FCFAF5] to-[#F4EDDB] px-4 py-3 md:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1B3B5F] text-xs italic text-white font-[family-name:var(--font-fraunces)]">
          a
        </span>
        <span className="flex-1 text-[13px] italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">
          Why we ask
        </span>
        <span className="text-xs text-[#8A8674] transition-transform group-open:rotate-90" aria-hidden>›</span>
      </summary>
      <div className="mt-3 space-y-2 text-[12px] leading-[1.55] text-[#4A5260]">
        {content}
      </div>
    </details>
  );
}

/**
 * Mentor companion — sticky sidecar that explains each onboarding step in
 * Alma's calm mentor voice. Renders different content per step. On mobile,
 * the parent hides this and uses MobileWhy instead.
 */
function MentorCompanion({ step }: { step: "upload" | "confirm" | "story" }) {
  return (
    <aside
      className="rounded-2xl border border-[#D9CFB5] p-6 md:sticky md:top-8"
      style={{
        background:
          "radial-gradient(ellipse at 0% 0%, rgba(46,90,136,0.06) 0%, rgba(232,179,57,0.03) 50%, transparent 80%), linear-gradient(180deg, #FCFAF5 0%, #F4EDDB 100%)",
      }}
    >
      <header className="flex items-center gap-2.5 mb-4">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1B3B5F] text-white italic font-medium font-[family-name:var(--font-fraunces)]"
          aria-hidden
        >
          a
        </span>
        <span className="text-xs leading-tight">
          <span className="block italic font-medium font-[family-name:var(--font-fraunces)] text-[#1B3B5F] text-[13px]">
            From Alma
          </span>
          <span className="text-[#5C6472]">guiding you through setup</span>
        </span>
      </header>

      {step === "upload" && (
        <>
          <MentorSection title="Why I need your resume.">
            I pull your school, major, clubs, and any deals you&rsquo;ve already noticed. That&rsquo;s how I find alumni who&rsquo;ll take your call and write emails that sound like you.
          </MentorSection>
          <MentorSection title="Where it lives.">
            Stored privately in your account. Nobody else sees it. You can delete it any time from <strong>/account → data</strong>.
          </MentorSection>
          <MentorSection title="Why Gmail, not just a form.">
            Bankers reply to whoever the email came from. Sending from your own Gmail keeps the relationship yours, not Alma&rsquo;s.
          </MentorSection>
          <MentorReassure>You can change all of this later.</MentorReassure>
        </>
      )}

      {step === "confirm" && (
        <>
          <MentorSection title="Why double-check.">
            I might&rsquo;ve gotten a club or major wrong. Thirty seconds now means every email I write later starts from the right place.
          </MentorSection>
          <MentorSection title="How to pick firms.">
            Pick more if you&rsquo;re casting a wide net (8–10). Fewer if you want depth (3–5). You can adjust any time.
          </MentorSection>
          <div className="mt-3 mb-4 space-y-2 text-[12px]">
            <MentorGloss k="BB">
              <strong>Bulge Bracket</strong> — the big banks (GS, MS, JPM, BAML, Citi, Barclays).
            </MentorGloss>
            <MentorGloss k="EB">
              <strong>Elite Boutique</strong> — M&amp;A specialists (Evercore, Centerview, Lazard).
            </MentorGloss>
            <MentorGloss k="MM">
              <strong>Middle Market</strong> — deal-friendly (Houlihan, Jefferies, Baird).
            </MentorGloss>
          </div>
          <MentorSection title="Coverage vs product.">
            Coverage = industry (TMT, Healthcare, FIG…). Product = deal type (M&amp;A, LevFin, Restructuring). Pick what your story aligns to.
          </MentorSection>
          <MentorReassure>Adjust your firms anytime.</MentorReassure>
        </>
      )}

      {step === "story" && (
        <>
          <MentorSection title="Why your story matters.">
            Bankers spot generic templates in three seconds. Your one-liner is what makes every email I write feel like you. Specific is better than impressive.
          </MentorSection>
          <div className="mt-3 mb-4 space-y-2">
            <MentorExample tone="bad" label="Generic">
              I&rsquo;m passionate about finance and the intersection of technology and capital markets.
            </MentorExample>
            <MentorExample tone="good" label="Specific">
              I&rsquo;m a Brown CS sophomore looking at TMT after watching Figma&rsquo;s IPO arc — I want to learn how the structure of those late-stage rounds gets pitched.
            </MentorExample>
          </div>
          <MentorSection title="Pick a trust level you&rsquo;re comfortable with.">
            Most students start in <strong>Copilot</strong> for the first two weeks — you see every draft before it goes out. Once you trust my voice, dial up to Preview-veto, then Autopilot.
          </MentorSection>
          <MentorSection title="Why a fixed time.">
            I draft once a day at this hour. 7–8am is popular because emails land before bankers&rsquo; first coffee, when inbox attention is highest.
          </MentorSection>
          <MentorReassure>Trust dial and run time can change anytime.</MentorReassure>
        </>
      )}
    </aside>
  );
}

function MentorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="italic text-[#1B3B5F] text-sm font-medium font-[family-name:var(--font-fraunces)] mb-1">
        {title}
      </p>
      <p className="text-[13px] text-[#4A5260] leading-relaxed">{children}</p>
    </div>
  );
}

function MentorExample({
  tone,
  label,
  children,
}: {
  tone: "good" | "bad";
  label: string;
  children: React.ReactNode;
}) {
  const isGood = tone === "good";
  return (
    <div
      className={`rounded-md px-3 py-2.5 text-[12px] leading-relaxed italic font-[family-name:var(--font-fraunces)] ${
        isGood ? "bg-[#EAE3D2]/50 border-l-2 border-[#2E5A88] text-[#14182A]" : "bg-[#EAE3D2]/30 border-l-2 border-[#C86B4F] text-[#5C6472]"
      }`}
    >
      <span
        className={`block text-[10px] font-bold uppercase tracking-[0.08em] not-italic font-[ui-sans-serif] mb-1 ${
          isGood ? "text-[#2E5A88]" : "text-[#C86B4F]"
        }`}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function MentorGloss({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-baseline leading-snug">
      <span className="font-mono text-[10px] font-semibold text-[#1B3B5F] bg-[#2E5A88]/10 px-1.5 py-0.5 rounded shrink-0">
        {k}
      </span>
      <span className="text-[#4A5260]">{children}</span>
    </div>
  );
}

function MentorReassure({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 pt-3 border-t border-[#ECE7DE] text-[12px] italic text-center text-[#5C6472] font-[family-name:var(--font-fraunces)]">
      <span className="not-italic font-bold text-[#2E5A88] font-[ui-sans-serif]">✓ </span>
      {children}
    </p>
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
  onInfo,
}: {
  firm: Firm;
  selected: boolean;
  userUniversity?: string;
  onToggle: () => void;
  onInfo: () => void;
}) {
  const groups = (firm.groups ?? []).slice(0, 4).map((g) => g.name);
  const sameSchool = firm.sameSchoolCount ?? 0;
  const total = firm.bankerCount ?? 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      aria-pressed={selected}
      className={`group relative text-left rounded-2xl px-4 py-3 transition-all duration-200 overflow-hidden cursor-pointer ${
        selected
          ? "bg-gradient-to-br from-[#1B3B5F] to-[#2E5A88] text-white shadow-md scale-[1.01]"
          : "bg-white text-[#14182A] border border-[#D9CFB5] hover:border-[#2E5A88] hover:shadow-md hover:-translate-y-0.5"
      }`}
    >
      {/* Top-right: info button + selection dot */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInfo();
          }}
          aria-label={`More info about ${firm.name}`}
          className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
            selected
              ? "bg-white/20 text-white hover:bg-white/30"
              : "bg-[#EAE3D2] text-[#14182A]/60 hover:bg-[#2E5A88] hover:text-white"
          }`}
        >
          i
        </button>
        {selected && (
          <span className="inline-flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[#E8B339] opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E8B339]" />
          </span>
        )}
      </div>

      {/* Top row: name */}
      <p className={`font-[family-name:var(--font-fraunces)] text-base pr-14 ${selected ? "text-white" : "text-[#14182A]"}`}>
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
    </div>
  );
}

function GroupChip({
  id,
  label,
  selected,
  onToggle,
}: {
  id: string;
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const desc = groupDescription(id);
  return (
    <button
      type="button"
      onClick={onToggle}
      title={desc ?? undefined}
      aria-label={desc ? `${label} — ${desc}` : label}
      className={`group flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        selected
          ? "bg-[#C86B4F] text-white border-[#C86B4F]"
          : "bg-white text-[#14182A]/80 border-[#D9CFB5] hover:border-[#C86B4F]"
      }`}
    >
      <span className="font-medium">{label}</span>
      {desc && (
        <span className={`text-[10px] ${selected ? "text-white/80" : "text-[#14182A]/45"} hidden sm:inline`}>
          · {desc}
        </span>
      )}
    </button>
  );
}

function BankInfoModal({ firm, onClose }: { firm: Firm; onClose: () => void }) {
  const groups = firm.groups ?? [];
  const coverage = groups.filter((g) => g.kind === "coverage");
  const product = groups.filter((g) => g.kind === "product");
  const total = firm.bankerCount ?? 0;
  const sameSchool = firm.sameSchoolCount ?? 0;
  const tierBlurb: Record<Firm["tier"], string> = {
    bulge_bracket: "Bulge bracket — the largest global investment banks. High deal volume across all sectors and products.",
    elite_boutique: "Elite boutique — advisory-focused firms known for senior attention and high-stakes M&A or restructuring mandates.",
    middle_market: "Middle market — strong deal flow in the $50M–$2B range. Often a faster path to responsibility and direct client work.",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-[#14182A]/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-[#D9CFB5] max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#D9CFB5] flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#C86B4F] font-semibold">{TIER_LABEL[firm.tier]}</p>
            <h3 className="font-[family-name:var(--font-fraunces)] text-2xl mt-1">{firm.name}</h3>
            {firm.hq_city && <p className="text-xs text-[#14182A]/60 mt-0.5">HQ: {firm.hq_city}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-[#14182A]/40 hover:text-[#14182A] text-xl leading-none -mt-1"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 text-sm">
          <p className="text-[#14182A]/75 italic font-[family-name:var(--font-fraunces)]">{tierBlurb[firm.tier]}</p>

          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#14182A]/50 mb-1.5">Bankers in Alma&apos;s database</p>
            <p className="text-[#14182A]">{total} banker{total === 1 ? "" : "s"}{sameSchool > 0 ? ` · ${sameSchool} from your school` : ""}</p>
          </div>

          {coverage.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#14182A]/50 mb-1.5">Coverage groups</p>
              <div className="flex flex-wrap gap-1.5">
                {coverage.map((g) => (
                  <span key={g.name} className="text-[11px] rounded-full bg-[#EAE3D2] px-2.5 py-1 text-[#14182A]/80">{g.name}</span>
                ))}
              </div>
            </div>
          )}

          {product.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#14182A]/50 mb-1.5">Product groups</p>
              <div className="flex flex-wrap gap-1.5">
                {product.map((g) => (
                  <span key={g.name} className="text-[11px] rounded-full bg-[#EAE3D2] px-2.5 py-1 text-[#14182A]/80">{g.name}</span>
                ))}
              </div>
            </div>
          )}

          {firm.domain && (
            <div className="pt-2 border-t border-[#D9CFB5]">
              <a
                href={`https://${firm.domain}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[#2E5A88] hover:text-[#1B3B5F] underline text-sm"
              >
                {firm.domain}
                <span aria-hidden>↗</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
