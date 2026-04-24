"use client";

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import { track, trackError } from "@/lib/track";

interface ParsedProfile {
  name: string;
  email?: string | null;
  university: string;
  graduationYear: number;
  major: string;
  clubs?: string[];
  technicalSkills?: string[];
  storyOneLiner?: string | null;
}

interface DemoBanker {
  id: string;
  name: string;
  title: string;
  firm: string;
  tier: "Bulge Bracket" | "Elite Boutique" | "Middle Market";
  group: string;
  hook: string;
  subject: string;
  body: (p: ParsedProfile) => string;
}

const DEMO_BANKERS: DemoBanker[] = [
  {
    id: "ms-tmt",
    name: "Alex Chen",
    title: "Vice President",
    firm: "Morgan Stanley",
    tier: "Bulge Bracket",
    group: "TMT",
    hook: "Alex was a TMT analyst at MS before VP — classic pipeline your resume fits.",
    subject: "Quick question — TMT path from a {{university}} {{major}}",
    body: (p) => `Hi Alex,

I'm {{name}}, a {{university}} {{major}} ({{year}}). I saw your recent LinkedIn post on the TMT team's Q1 activity and it stuck with me, especially how you framed AI-era software deals.

${p.clubs && p.clubs.some((c) => /Rice|Brown/.test(c)) ? "I'm active in " + (p.clubs.find((c) => /Rice|Brown/.test(c)) ?? "our campus finance community") + " and " : ""}I'd love 15 minutes to hear how you think about breaking into TMT right now. Any morning next week works on my end.

Thanks,
{{name}}
{{university}} '{{yy}} | {{major}}`,
  },
  {
    id: "evr-mna",
    name: "Maya Patel",
    title: "Associate",
    firm: "Evercore",
    tier: "Elite Boutique",
    group: "M&A",
    hook: "Maya moved from Brown → Evercore M&A — her path is the most realistic for a non-finance sophomore.",
    subject: "Evercore M&A — 15 min from a fellow {{university}} kid",
    body: (p) => `Hi Maya,

I'm {{name}}, {{university}} '{{yy}} studying {{major}}. I've been reading the Evercore M&A coverage of mid-market healthcare deals all semester and your path (non-finance undergrad → Evercore) is the one I find most encouraging.

${p.storyOneLiner ? `A line on me: ${p.storyOneLiner}` : "I'm targeting SA2028 and trying to talk to bankers whose path looks like mine."}

Would a 15-minute call work sometime next week? Happy to send two or three times that fit your calendar.

Thanks,
{{name}}
{{university}} '{{yy}} | {{major}}`,
  },
  {
    id: "cvp-hc",
    name: "Jordan Kim",
    title: "Analyst",
    firm: "Centerview Partners",
    tier: "Elite Boutique",
    group: "Healthcare",
    hook: "Jordan is a first-year analyst — closest to your level, most likely to reply.",
    subject: "Centerview Healthcare — first-year perspective",
    body: (p) => `Hi Jordan,

I'm {{name}}, {{university}} {{major}} ({{year}}). You were the analyst I kept seeing show up on the Centerview Healthcare tombstones this year — the Arcus and Ultragenyx advisories stood out.

${p.technicalSkills && p.technicalSkills.length > 0 ? `I come from a more technical background (${p.technicalSkills.slice(0, 3).join(", ")}) and ` : "I'm "}exploring how that maps to a healthcare banking path. Would love 15 minutes if you're open to it — any weekday after 4pm works.

Thanks,
{{name}}
{{university}} '{{yy}} | {{major}}`,
  },
];

function personalize(template: string, p: ParsedProfile): string {
  const yy = String(p.graduationYear).slice(2);
  const yearWord =
    p.graduationYear === new Date().getFullYear() + 1
      ? "rising senior"
      : p.graduationYear === new Date().getFullYear() + 2
      ? "junior"
      : p.graduationYear === new Date().getFullYear() + 3
      ? "sophomore"
      : "student";
  return template
    .replaceAll("{{name}}", p.name || "Student")
    .replaceAll("{{university}}", p.university || "Rice")
    .replaceAll("{{major}}", p.major || "Economics")
    .replaceAll("{{year}}", yearWord)
    .replaceAll("{{yy}}", yy);
}

function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch {}
  document.body.removeChild(ta);
}

type Step = "upload" | "working" | "results" | "signed_up";

export default function DemoPage() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [profile, setProfile] = useState<ParsedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { track("demo_view"); }, []);

  async function handlePdf(file: File) {
    if (!file.name.endsWith(".pdf") && !file.type.includes("pdf")) {
      setError("Please upload a PDF.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) { setError("File too large (max 10MB)."); return; }
    setError(null);
    setExtracting(true);
    setFileName(file.name);
    try {
      const ab = await file.arrayBuffer();
      const blob = new Blob([ab], { type: "application/pdf" });
      const fd = new FormData();
      fd.append("file", blob, file.name);
      const res = await fetch("/api/extract-pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "extract_failed");
      if (!data.text?.trim()) throw new Error("empty_text");
      setResumeText(data.text);
    } catch (err) {
      trackError("demo_pdf_extract", err);
      setError("Couldn't read that PDF. Try another or paste your resume text.");
      setFileName(null);
    } finally {
      setExtracting(false);
    }
  }

  async function runDemo() {
    if (!resumeText.trim()) { setError("Upload your resume first."); return; }
    setError(null);
    setStep("working");
    track("demo_start");
    try {
      const res = await fetch("/api/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, university: "Rice University" }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { profile: p } = (await res.json()) as { profile: ParsedProfile };
      setProfile(p);
      track("demo_parsed", { name: p.name, major: p.major, university: p.university });
      setStep("results");
    } catch (err) {
      trackError("demo_parse", err);
      setError("Parse failed. Try again.");
      setStep("upload");
    }
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setSignupError("Drop your email."); return; }
    setSignupError(null);
    try {
      const res = await fetch("/api/pilot-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: profile?.name,
          university: profile?.university,
          major: profile?.major,
          graduationYear: profile?.graduationYear,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "signup_failed");
      }
      track("demo_signup", { email });
      setStep("signed_up");
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : "Something broke.");
      trackError("demo_signup", err);
    }
  }

  function handleCopy(text: string, id: string) {
    copyToClipboard(text);
    setCopiedId(id);
    track("demo_copy", { bankerId: id });
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A]">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C86B4F] font-semibold mb-3">60-second preview</p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-4xl sm:text-5xl mb-4">See what Alma would do for you</h1>
          <p className="text-base sm:text-lg text-[#14182A]/70 font-[family-name:var(--font-fraunces)] italic max-w-xl mx-auto">
            Drop your resume. We&apos;ll show you the first three bankers Alma would email this week — and the actual drafts Alma would write in your voice.
          </p>
        </div>

        {step === "upload" && (
          <div className="rounded-3xl bg-white p-6 sm:p-8 border border-[#D9CFB5] shadow-sm">
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden"
              onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handlePdf(f); }} />
            {!resumeText.trim() ? (
              <div onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-[#D9CFB5] py-14 text-center cursor-pointer hover:border-[#2E5A88] hover:bg-[#2E5A88]/5 transition-colors">
                {extracting ? (
                  <>
                    <div className="h-10 w-10 mx-auto animate-spin rounded-full border-3 border-[#2E5A88] border-t-transparent mb-3" />
                    <p className="text-sm text-[#14182A]/70">Reading {fileName}...</p>
                  </>
                ) : (
                  <>
                    <p className="font-[family-name:var(--font-fraunces)] text-xl mb-1">Drop a PDF here</p>
                    <p className="text-xs text-[#14182A]/50">or tap to browse — no account needed</p>
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-[#2E5A88]/10 border border-[#2E5A88]/20 p-4 flex items-center gap-3">
                <span className="text-[#2E5A88]">✓</span>
                <p className="flex-1 text-sm font-medium">{fileName}</p>
                <button type="button" onClick={() => { setResumeText(""); setFileName(null); }} className="text-xs text-[#14182A]/50 hover:text-[#C86B4F]">reset</button>
              </div>
            )}

            {error && <p className="text-sm text-[#C86B4F] mt-4">{error}</p>}

            <button type="button" onClick={runDemo} disabled={!resumeText.trim() || extracting}
              className="w-full mt-5 rounded-xl bg-[#1B3B5F] text-white py-4 font-medium hover:bg-[#2E5A88] disabled:opacity-40 transition-colors">
              Show me what Alma would send
            </button>
          </div>
        )}

        {step === "working" && (
          <div className="rounded-3xl bg-white p-10 border border-[#D9CFB5] text-center">
            <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-[#2E5A88] border-t-transparent mb-4" />
            <p className="font-[family-name:var(--font-fraunces)] text-xl">Reading your resume...</p>
            <p className="text-xs text-[#14182A]/50 italic mt-2 font-[family-name:var(--font-fraunces)]">Alma extracts name, major, clubs, and your angle for IB.</p>
          </div>
        )}

        {step === "results" && profile && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-5 border border-[#D9CFB5]">
              <p className="text-xs uppercase tracking-wider text-[#C86B4F] font-semibold mb-1">Here&apos;s what Alma read</p>
              <p className="font-[family-name:var(--font-fraunces)] text-2xl">{profile.name}</p>
              <p className="text-sm text-[#14182A]/70">{profile.university} &apos;{String(profile.graduationYear).slice(2)} · {profile.major}</p>
              {profile.clubs && profile.clubs.length > 0 && (
                <p className="text-xs text-[#14182A]/60 mt-1">Clubs: {profile.clubs.join(", ")}</p>
              )}
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-2">Three bankers Alma would email this week</p>
              <p className="text-sm text-[#14182A]/70 font-[family-name:var(--font-fraunces)] italic mb-4">
                Every Monday, Alma queues ~5 of these. You approve. Alma sends from your Gmail. Replies come back to you — Alma tracks the thread.
              </p>
              <div className="space-y-4">
                {DEMO_BANKERS.map((b) => {
                  const subject = personalize(b.subject, profile);
                  const body = personalize(b.body(profile), profile);
                  return (
                    <div key={b.id} className="rounded-2xl bg-white border border-[#D9CFB5] overflow-hidden">
                      <div className="px-5 py-4 border-b border-[#D9CFB5] flex justify-between items-start gap-3">
                        <div>
                          <p className="font-[family-name:var(--font-fraunces)] text-lg">{b.name}</p>
                          <p className="text-xs text-[#14182A]/70">{b.title} · {b.firm} · {b.group}</p>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-[#C86B4F] font-semibold shrink-0">{b.tier}</span>
                      </div>
                      <p className="px-5 pt-3 text-xs text-[#14182A]/70 italic font-[family-name:var(--font-fraunces)]">{b.hook}</p>
                      <div className="px-5 py-4">
                        <p className="text-xs text-[#14182A]/50 mb-1">Subject</p>
                        <p className="text-sm font-medium mb-3">{subject}</p>
                        <p className="text-xs text-[#14182A]/50 mb-1">Body</p>
                        <pre className="whitespace-pre-wrap font-[family-name:var(--font-geist-sans)] text-sm text-[#14182A]/90">{body}</pre>
                        <button type="button" onClick={() => handleCopy(`Subject: ${subject}\n\n${body}`, b.id)}
                          className={`mt-4 w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
                            copiedId === b.id ? "bg-[#1B3B5F] text-white" : "bg-[#2E5A88] text-white hover:bg-[#1B3B5F]"
                          }`}>
                          {copiedId === b.id ? "Copied to clipboard" : "Copy draft"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl bg-[#1B3B5F] p-8 text-center">
              <p className="font-[family-name:var(--font-fraunces)] text-3xl text-white mb-2">Ready for the real thing?</p>
              <p className="text-sm text-white/80 max-w-lg mx-auto mb-6 italic font-[family-name:var(--font-fraunces)]">
                Alma runs this loop every week — with real bankers at your target firms, drafts in your voice, replies tracked through superday. Drop your email and we&apos;ll send you early access the moment the beta opens.
              </p>
              <form onSubmit={handleSignup} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@rice.edu or you@brown.edu" required
                  className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30" />
                <button type="submit" className="rounded-xl bg-[#C86B4F] text-white px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap">
                  Get early access
                </button>
              </form>
              {signupError && <p className="text-xs text-[#E8B339] mt-3">{signupError}</p>}
              <p className="text-[10px] text-white/40 mt-4">Private beta · Rice &amp; Brown undergrads · Spring 2026</p>
            </div>
          </div>
        )}

        {step === "signed_up" && (
          <div className="rounded-3xl bg-white p-10 border border-[#D9CFB5] text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-3xl mb-2">You&apos;re on the list.</p>
            <p className="text-sm text-[#14182A]/70 italic font-[family-name:var(--font-fraunces)] max-w-md mx-auto">
              We text everyone personally the day the beta opens up for your campus. In the meantime, forward the demo link to a friend breaking into IB — the more of your class is in, the better the network for all of you.
            </p>
            <p className="mt-6 text-xs text-[#14182A]/40">Share: <code className="text-[#2E5A88]">alma.careers/demo</code></p>
          </div>
        )}

        <p className="mt-12 text-center text-xs text-[#14182A]/40">
          Built by{" "}
          <a href="/login" className="underline hover:text-[#2E5A88]">Rice &amp; Brown students</a>.
          <span className="mx-2">·</span>
          <a href="/privacy" className="underline hover:text-[#2E5A88]">Privacy</a>
          <span className="mx-2">·</span>
          <a href="/terms" className="underline hover:text-[#2E5A88]">Terms</a>
        </p>
      </div>
    </div>
  );
}
