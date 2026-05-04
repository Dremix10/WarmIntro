"use client";

import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from "react";
import { track, trackError } from "@/lib/track";
import { PublicTopBar } from "@/components/PublicTopBar";

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

// (Old hardcoded DEMO_BANKERS were removed 2026-05-01 — they were
//  invented people with no LinkedIn URLs and fabricated hooks. Real
//  testers spotted the fakeness immediately and bounced. Demo now
//  fetches real bankers from /api/demo/bankers, matched by parsed
//  profile's university.)

// Build a demo email targeting a REAL banker. Uses the same anchor
// hierarchy the Correspondent uses: same-school first, then firm/group
// + a clean ask. Anchor line (when present) comes from banker_findings —
// that's the verifiable hook (e.g. "Brown CS · Investment Banking
// Analyst at Stifel"). Without an anchor line we fall back to the
// school-overlap pattern, plain and honest.
function buildDemoEmail(p: ParsedProfile, b: DemoBankerReal): { subject: string; body: string } {
  const yy = String(p.graduationYear).slice(2);
  const userUni = (p.university || "your school").trim();
  const userMajor = (p.major || "Economics").trim();
  const sameSchool = !!(
    b.university &&
    p.university &&
    b.university.toLowerCase().includes(p.university.toLowerCase().split(" ")[0])
  );
  const firmShort = b.firm.split(/\s+/)[0];
  const groupBit = b.group ? ` ${b.group}` : "";
  const subject = sameSchool
    ? `${userUni.split(" ")[0]} ${userMajor} - quick question on ${firmShort}${groupBit}`
    : `${userUni.split(" ")[0]} sophomore - 15 min on ${firmShort}?`;

  const opener = sameSchool
    ? `Saw you went to ${b.university} too. I'm a ${userUni} ${userMajor} sophomore starting to look seriously at ${firmShort}${groupBit}.`
    : `Saw you're at ${b.firm}${groupBit ? `'s${groupBit} group` : ""}. I'm a ${userUni} ${userMajor} sophomore trying to figure out the path into ${firmShort}-style work.`;

  const middle = p.storyOneLiner
    ? `\n\nA line on me: ${p.storyOneLiner}`
    : `\n\nMostly trying to talk to bankers whose path I could realistically follow.`;

  const ask = `\n\n15 min next week, by phone, would mean a lot.`;
  const sig = `\n\nThanks,\n${p.name || "[your name]"}\n${userUni} '${yy} | ${userMajor}`;

  return {
    subject,
    body: `Hi ${b.firstName},\n\n${opener}${middle}${ask}${sig}`,
  };
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

interface DemoBankerReal {
  id: string;
  name: string;
  firstName: string;
  title: string;
  firm: string;
  firmTier: "BB" | "EB" | "MM" | "Other";
  university: string | null;
  linkedinUrl: string | null;
  group: string | null;
  anchorLine: string | null;
}

export default function DemoPage() {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [profile, setProfile] = useState<ParsedProfile | null>(null);
  const [bankers, setBankers] = useState<DemoBankerReal[]>([]);
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

  async function fetchRealBankers(p: ParsedProfile): Promise<DemoBankerReal[]> {
    try {
      const res = await fetch("/api/demo/bankers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ university: p.university, name: p.name, major: p.major }),
      });
      if (!res.ok) return [];
      const json = (await res.json()) as { bankers?: DemoBankerReal[] };
      return json.bankers ?? [];
    } catch (err) {
      trackError("demo_bankers_fetch", err);
      return [];
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
        // Don't pass a hardcoded university — Krish from a non-Rice school
        // saw himself classified as a Rice student because of this. The
        // parser detects the school from the resume text on its own.
        body: JSON.stringify({ resumeText }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const { profile: p } = (await res.json()) as { profile: ParsedProfile };
      setProfile(p);
      track("demo_parsed", { name: p.name, major: p.major, university: p.university });
      // Fetch real bankers in parallel with the step transition. Demo
      // shows real people from our DB matched against the parsed
      // university — replaces the hardcoded fake bankers that earlier
      // testers spotted as obviously invented and bounced on.
      const real = await fetchRealBankers(p);
      setBankers(real);
      track("demo_bankers_loaded", { count: real.length, university: p.university });
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
    <div className="relative min-h-screen bg-[#EAE3D2] text-[#14182A]">
      <PublicTopBar />
      <div className="max-w-3xl mx-auto px-6 py-10 pt-14 sm:py-12 sm:pt-20">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-[#C86B4F] font-semibold mb-3">60-second preview</p>
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl sm:text-4xl md:text-5xl mb-4">See what Alma would do for you</h1>
          <p className="text-base sm:text-lg text-[#14182A]/70 font-[family-name:var(--font-fraunces)] italic max-w-xl mx-auto">
            Drop your resume. We&apos;ll show you the first three bankers Alma would email this week and the actual drafts Alma would write in your voice.
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
                    <p className="text-xs text-[#14182A]/50">or tap to browse, no account needed</p>
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

            {/* Skip-upload path: prefills a realistic sample resume so visitors
                who don't want to share their PDF can still see the agent
                output. Massive conversion lift on the "give me your file"
                friction. */}
            <button
              type="button"
              onClick={async () => {
                track("demo_sample_used");
                const sampleProfile: ParsedProfile = {
                  name: "Sam Rivera",
                  email: null,
                  university: "Rice University",
                  graduationYear: 2028,
                  major: "Computer Science",
                  clubs: ["Rice Investment Banking Club", "Rice Quant Society"],
                  technicalSkills: ["Python", "SQL", "Excel"],
                  storyOneLiner: "CS sophomore curious about how tech deals get done, drawn to TMT and software M&A specifically.",
                };
                setProfile(sampleProfile);
                track("demo_parsed", { name: "Sam Rivera", major: "Computer Science", university: "Rice University", source: "sample" });
                setStep("working");
                const real = await fetchRealBankers(sampleProfile);
                setBankers(real);
                track("demo_bankers_loaded", { count: real.length, source: "sample" });
                setStep("results");
              }}
              className="w-full mt-3 rounded-xl border border-[#D9CFB5] bg-white text-[#5C6472] py-3 text-sm font-medium hover:border-[#2E5A88] hover:text-[#1B3B5F] transition-colors"
            >
              Don&rsquo;t want to upload? See a sample run (Rice CS sophomore) →
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
                Every Monday, Alma queues about 5 of these. You approve. Alma sends from your Gmail. Replies come back to you, and Alma tracks the thread.
              </p>
              <div className="space-y-4">
                {bankers.length === 0 && (
                  <div className="rounded-2xl border border-[#D9CFB5] bg-white p-6 text-center text-sm text-[#14182A]/65">
                    Couldn&rsquo;t pull a fresh banker batch right now. Try again in a sec, or drop your email below and we&rsquo;ll loop you in as access opens.
                  </div>
                )}
                {bankers.map((b) => {
                  const { subject, body } = buildDemoEmail(profile, b);
                  const tierLabel = b.firmTier === "BB" ? "Bulge Bracket" : b.firmTier === "EB" ? "Elite Boutique" : b.firmTier === "MM" ? "Middle Market" : "";
                  return (
                    <div key={b.id} className="rounded-2xl bg-white border border-[#D9CFB5] overflow-hidden">
                      <div className="px-5 py-4 border-b border-[#D9CFB5] flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-[family-name:var(--font-fraunces)] text-lg">{b.name}</p>
                          <p className="text-xs text-[#14182A]/70 mt-0.5">
                            {b.title} · {b.firm}{b.group ? ` · ${b.group}` : ""}
                          </p>
                          {b.linkedinUrl && (
                            <a
                              href={b.linkedinUrl}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-block mt-1.5 text-[10px] text-[#2E5A88] hover:underline"
                            >
                              {b.linkedinUrl.replace(/^https?:\/\/(www\.)?/, "")} ↗
                            </a>
                          )}
                        </div>
                        {tierLabel && (
                          <span className="text-[10px] uppercase tracking-wider text-[#C86B4F] font-semibold shrink-0">{tierLabel}</span>
                        )}
                      </div>
                      {b.anchorLine && (
                        <p className="px-5 pt-3 text-xs text-[#14182A]/65 italic font-[family-name:var(--font-fraunces)]">
                          From their profile: &ldquo;{b.anchorLine}&rdquo;
                        </p>
                      )}
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
                Alma runs this loop every week with real bankers at your target firms, drafts in your voice, and replies tracked through superday. Drop your email and we&apos;ll send access when your spot is ready.
              </p>
              <form onSubmit={handleSignup} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@rice.edu or you@brown.edu" required
                  className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30" />
                <button type="submit" className="rounded-xl bg-[#C86B4F] text-white px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap">
                  Request access
                </button>
              </form>
              {signupError && <p className="text-xs text-[#E8B339] mt-3">{signupError}</p>}
              <p className="text-[10px] text-white/40 mt-4">Request list open · Brown, Rice &amp; MIT undergrads · 2026 cycle</p>
            </div>
          </div>
        )}

        {step === "signed_up" && (
          <div className="rounded-3xl bg-white p-10 border border-[#D9CFB5] text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-3xl mb-2">You&apos;re on the list.</p>
            <p className="text-sm text-[#14182A]/70 italic font-[family-name:var(--font-fraunces)] max-w-md mx-auto">
              We reach out personally when your access is ready. In the meantime, forward the demo link to a friend breaking into IB. The more of your class is in, the better the network for all of you.
            </p>
            <p className="mt-6 text-xs text-[#14182A]/40">Share: <code className="text-[#2E5A88]">alma.careers/demo</code></p>
          </div>
        )}

        <p className="mt-12 text-center text-xs text-[#14182A]/40">
          Already a tester? <a href="/login" className="underline hover:text-[#2E5A88]">Sign in</a>
          <span className="mx-2">·</span>
          <a href="/privacy" className="underline hover:text-[#2E5A88]">Privacy</a>
          <span className="mx-2">·</span>
          <a href="/terms" className="underline hover:text-[#2E5A88]">Terms</a>
        </p>
      </div>
    </div>
  );
}
