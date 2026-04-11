"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { track, trackError } from "@/lib/track";
import type { UserProfile } from "@/shared/types";

type Step = "upload" | "working" | "results" | "done";

interface FoundPerson {
  name: string;
  role: string;
  company: string;
  linkedinUrl: string;
  narrative: string;
  suggestedOpener: string;
  category: string;
}

const PROGRESS_MESSAGES = [
  "Analyzing your resume...",
  "Identifying your target roles...",
  "Finding real people on LinkedIn...",
  "Writing personalized messages...",
  "Almost ready...",
];

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

export default function DemoPage() {
  const [step, setStep] = useState<Step>("upload");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<{ name: string; reason: string }[]>([]);
  const [people, setPeople] = useState<FoundPerson[]>([]);
  const [progressIdx, setProgressIdx] = useState(0);
  const [email, setEmail] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signedUp, setSignedUp] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { track("demo_view"); }, []);

  useEffect(() => {
    const h = (e: ErrorEvent) => trackError("global", e.message);
    const r = (e: PromiseRejectionEvent) => trackError("unhandled_rejection", e.reason);
    window.addEventListener("error", h);
    window.addEventListener("unhandledrejection", r);
    return () => { window.removeEventListener("error", h); window.removeEventListener("unhandledrejection", r); };
  }, []);

  useEffect(() => {
    if (step !== "working") return;
    const interval = setInterval(() => setProgressIdx((i) => (i + 1) % PROGRESS_MESSAGES.length), 3000);
    return () => clearInterval(interval);
  }, [step]);

  const handlePdfFile = async (file: File) => {
    if (!file.name.endsWith(".pdf") && !file.type.includes("pdf")) { setError("Please upload a PDF."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("File too large (max 10MB)."); return; }
    setError(null); setExtracting(true); setFileName(file.name);
    try {
      const ab = await file.arrayBuffer();
      const blob = new Blob([ab], { type: "application/pdf" });
      const fd = new FormData();
      fd.append("file", blob, file.name);
      const res = await fetch("/api/extract-pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to extract text");
      if (!data.text?.trim()) { setError("Could not extract text."); setFileName(null); }
      else setResumeText(data.text);
    } catch (err) { trackError("pdf_extract", err); setError("Failed to read PDF. Try pasting your resume text."); setFileName(null); }
    finally { setExtracting(false); }
  };

  const runDemo = async () => {
    const text = resumeText.trim();
    if (!text) { setError("Upload or paste your resume first."); return; }
    setError(null);
    setStep("working");
    setProgressIdx(0);
    track("demo_start");

    try {
      // Step 1: Parse resume
      const parseRes = await fetch("/api/parse-resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeText: text, university: "Rice University" }) });
      if (!parseRes.ok) throw new Error((await parseRes.json()).error);
      const { profile: p } = await parseRes.json() as { profile: UserProfile };
      setProfile(p);
      track("demo_parsed", { name: p.name, major: p.major, skills: p.skills?.length, industries: p.targetIndustries, roles: p.targetRoles });

      // Step 2: Find real people matched to their roles
      const findRes = await fetch("/api/find-people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: p.name, major: p.major, graduationYear: p.graduationYear, targetRoles: p.targetRoles, targetIndustries: p.targetIndustries, university: "Rice University" }) });
      if (!findRes.ok) throw new Error((await findRes.json()).error);
      const { categories: cats, people: ppl } = await findRes.json();
      setCategories(cats);
      setPeople(ppl);
      track("demo_results_shown", { categories: cats.map((c: { name: string }) => c.name), peopleFound: ppl.length });
      setStep("results");
    } catch (err) {
      trackError("demo_flow", err);
      setError("Something went wrong. Please try again.");
      setStep("upload");
    }
  };

  const handleCopy = (text: string, id: string) => {
    copyToClipboard(text);
    setCopied(id);
    track("demo_copy_message", { person: id });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSignup = async () => {
    if (!email.trim()) { setSignupError("Enter your email."); return; }
    setSignupError(null);
    try {
      const res = await fetch("/api/pilot-signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name: profile?.name, university: profile?.university, major: profile?.major, graduationYear: profile?.graduationYear, skills: profile?.skills, targetIndustries: profile?.targetIndustries }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      track("demo_pilot_signup", { email });
      setSignedUp(true);
    } catch (err) { setSignupError(err instanceof Error ? err.message : "Something went wrong."); trackError("signup", err); }
  };

  // Group people by category
  const groupedByCategory = categories.map((cat) => ({
    ...cat,
    people: people.filter((p) => p.category === cat.name),
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Warm<span className="text-emerald-600">Intro</span>
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-500">Find real people to connect with in 60 seconds</p>
        </div>

        {/* Upload */}
        {step === "upload" && (
          <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
            {!resumeText.trim() ? (
              <>
                <input ref={fileInputRef} type="file" accept=".pdf,application/pdf"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); }} className="hidden" />
                <div onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/30 active:bg-emerald-50/50 px-4 py-10 sm:py-12 cursor-pointer transition-colors">
                  {extracting ? (
                    <><div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent mb-3" /><p className="text-sm font-medium text-slate-700">Reading PDF...</p></>
                  ) : (
                    <><svg className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                      <p className="text-base font-semibold text-slate-700">Upload your resume</p>
                      <p className="mt-1 text-sm text-slate-400">PDF — tap to browse</p></>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <svg className="h-6 w-6 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <p className="flex-1 text-sm font-medium text-emerald-800 truncate">{fileName}</p>
                <button type="button" onClick={() => { setResumeText(""); setFileName(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-emerald-400 hover:text-emerald-600 p-1"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
              </div>
            )}

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <button type="button" onClick={runDemo} disabled={!resumeText.trim() || extracting}
              className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 transition-colors">
              Find My Connections
            </button>

            <p className="text-center text-xs text-slate-400">No account needed. Results in ~30 seconds.</p>
          </div>
        )}

        {/* Working */}
        {step === "working" && (
          <div className="rounded-2xl bg-white p-8 sm:p-10 shadow-sm border border-slate-100 text-center">
            <div className="relative mx-auto mb-6 h-16 w-16">
              <div className="h-16 w-16 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-emerald-500" />
            </div>
            <p className="text-base sm:text-lg font-semibold text-slate-900 animate-pulse">
              {PROGRESS_MESSAGES[progressIdx]}
            </p>
            <div className="flex justify-center gap-1.5 mt-4">
              {PROGRESS_MESSAGES.map((_, i) => (
                <div key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i <= progressIdx ? "bg-emerald-500" : "bg-slate-200"}`} />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {step === "results" && (
          <div className="space-y-4 sm:space-y-5">
            <div className="text-center mb-1">
              <p className="text-sm font-medium text-emerald-600">{profile?.major} &middot; {profile?.university}</p>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">People You Should Connect With</h2>
            </div>

            {/* Category pills */}
            {categories.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {categories.map((cat) => (
                  <div key={cat.name} className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                    <p className="text-xs font-semibold text-emerald-700">{cat.name}</p>
                  </div>
                ))}
              </div>
            )}

            {/* People grouped by category */}
            {groupedByCategory.map((group) => (
              <div key={group.name}>
                <div className="flex items-center gap-2 mb-3 mt-2">
                  <h3 className="text-sm font-bold text-slate-800">{group.name}</h3>
                  <p className="text-xs text-slate-400">{group.reason}</p>
                </div>

                <div className="space-y-3">
                  {group.people.length === 0 ? (
                    <div className="rounded-xl bg-white border border-slate-100 px-4 py-4 text-sm text-slate-400 italic">Searching for more connections...</div>
                  ) : group.people.map((person) => (
                    <div key={person.linkedinUrl} className="rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                      <div className="px-4 sm:px-5 py-4">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                            {person.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{person.name}</p>
                            <p className="text-xs text-slate-500 truncate">{person.role}{person.company !== "Unknown" ? ` at ${person.company}` : ""}</p>
                          </div>
                          <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer"
                            onClick={() => track("demo_linkedin_click", { person: person.name })}
                            className="shrink-0 rounded-lg bg-[#0A66C2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#004182] active:bg-[#003366] transition-colors">
                            LinkedIn
                          </a>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">{person.narrative}</p>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                          <p className="text-sm text-slate-700 leading-relaxed">&ldquo;{person.suggestedOpener}&rdquo;</p>
                          <button type="button" onClick={() => handleCopy(person.suggestedOpener, person.linkedinUrl)}
                            className={`mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                              copied === person.linkedinUrl
                                ? "bg-emerald-700 text-white"
                                : "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800"
                            }`}>
                            {copied === person.linkedinUrl ? "Copied to clipboard!" : "Copy connection message"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* CTA */}
            <div className="rounded-2xl bg-slate-900 p-6 sm:p-8 text-center">
              {signedUp ? (
                <>
                  <p className="text-2xl sm:text-3xl font-bold text-white mb-2">You&apos;re on the list!</p>
                  <p className="text-slate-400 text-sm">We&apos;ll send you 50 more connections next week.</p>
                </>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-bold text-white mb-2">Get 50 more connections free.</p>
                  <p className="text-slate-400 text-sm sm:text-base mb-6 max-w-md mx-auto">
                    Drop your email and next week we&apos;ll send you a full list matched to your resume — plus an AI agent that messages them for you.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
                      className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    <button type="button" onClick={handleSignup}
                      className="rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-emerald-400 active:bg-emerald-600 transition-colors whitespace-nowrap">
                      Get early access
                    </button>
                  </div>
                  {signupError && <p className="text-sm text-red-400 mt-2">{signupError}</p>}
                  <p className="text-xs text-slate-500 mt-4">Launching next week. Your data stays private.</p>
                </>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6 sm:mt-8">
          Built by Rice students. <a href="/privacy" className="hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
