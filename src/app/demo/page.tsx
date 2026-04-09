"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { track, trackError } from "@/lib/track";
import type { UserProfile, Company, WarmPath } from "@/shared/types";

type Step = "upload" | "working" | "results" | "signup" | "done";

const PROGRESS_MESSAGES = [
  "Analyzing your resume...",
  "Identifying your strengths...",
  "Finding top companies...",
  "Searching for alumni...",
  "Generating connection messages...",
  "Almost ready...",
];

export default function DemoPage() {
  const [step, setStep] = useState<Step>("upload");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [alumniByCompany, setAlumniByCompany] = useState<Record<string, WarmPath[]>>({});
  const [progressIdx, setProgressIdx] = useState(0);
  const [email, setEmail] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
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

  // Progress message rotation during "working" step
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
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.legacy.js";
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
      }
      const text = pages.join("\n\n").trim();
      if (!text) { setError("Could not extract text. Try pasting instead."); setFileName(null); }
      else setResumeText(text);
    } catch (err) { trackError("pdf_extract", err); setError("Failed to read PDF."); setFileName(null); }
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
      track("demo_parsed", { name: p.name, skills: p.skills?.length });

      // Step 2: Find companies
      const compRes = await fetch("/api/find-companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ industries: p.targetIndustries, university: "Rice University", skills: p.skills, roles: p.targetRoles }) });
      if (!compRes.ok) throw new Error((await compRes.json()).error);
      const { companies: allCompanies } = await compRes.json() as { companies: Company[] };
      const top3 = allCompanies.slice(0, 3);
      setCompanies(top3);
      track("demo_companies_found", { count: top3.length });

      // Step 3: Find alumni — ALL 3 IN PARALLEL
      const alumniResults = await Promise.all(
        top3.map(async (company) => {
          try {
            const res = await fetch("/api/find-alumni", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: company.id, university: "Rice University", userMajor: p.major, userGradYear: p.graduationYear }) });
            if (!res.ok) return { id: company.id, paths: [] as WarmPath[] };
            const data = await res.json();
            return { id: company.id, paths: (data.warmPaths ?? []).slice(0, 2) as WarmPath[] };
          } catch { return { id: company.id, paths: [] as WarmPath[] }; }
        })
      );

      const results: Record<string, WarmPath[]> = {};
      for (const r of alumniResults) results[r.id] = r.paths;
      setAlumniByCompany(results);
      track("demo_results_shown", { companiesWithAlumni: alumniResults.filter((r) => r.paths.length > 0).length });
      setStep("results");
    } catch (err) {
      trackError("demo_flow", err);
      setError("Something went wrong. Please try again.");
      setStep("upload");
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    track("demo_copy_message", { alumniId: id });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSignup = async () => {
    if (!email.trim()) { setSignupError("Enter your email."); return; }
    setSignupError(null);
    try {
      const res = await fetch("/api/pilot-signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name: profile?.name, university: profile?.university, major: profile?.major, graduationYear: profile?.graduationYear, skills: profile?.skills, targetIndustries: profile?.targetIndustries }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      track("demo_pilot_signup", { email });
      setStep("done");
    } catch (err) { setSignupError(err instanceof Error ? err.message : "Something went wrong."); trackError("signup", err); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Warm<span className="text-emerald-600">Intro</span>
          </h1>
          <p className="mt-2 text-slate-500">Find alumni at your dream companies in 60 seconds</p>
        </div>

        {/* Upload */}
        {step === "upload" && (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
            {!resumeText.trim() ? (
              <>
                <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); }} className="hidden" />
                <div onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-emerald-300 hover:bg-emerald-50/30 px-4 py-12 cursor-pointer transition-colors">
                  {extracting ? (
                    <><div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent mb-3" /><p className="text-sm font-medium text-slate-700">Reading PDF...</p></>
                  ) : (
                    <><svg className="h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                      <p className="text-base font-semibold text-slate-700">Upload your resume</p>
                      <p className="mt-1 text-sm text-slate-400">PDF — tap to browse</p></>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <p className="flex-1 text-sm font-medium text-emerald-800 truncate">{fileName}</p>
                <button type="button" onClick={() => { setResumeText(""); setFileName(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-emerald-400 hover:text-emerald-600"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
              </div>
            )}

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <button type="button" onClick={runDemo} disabled={!resumeText.trim() || extracting}
              className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              Find My Alumni Connections
            </button>

            <p className="text-center text-xs text-slate-400">No account needed. Results in ~30 seconds.</p>
          </div>
        )}

        {/* Working */}
        {step === "working" && (
          <div className="rounded-2xl bg-white p-10 shadow-sm border border-slate-100 text-center">
            <div className="relative mx-auto mb-6 h-16 w-16">
              <div className="h-16 w-16 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-emerald-500" />
            </div>
            <p className="text-lg font-semibold text-slate-900 animate-pulse">
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
          <div className="space-y-5">
            <div className="text-center mb-2">
              <p className="text-sm font-medium text-emerald-600">Based on your resume</p>
              <h2 className="text-2xl font-bold text-slate-900">Your Top Alumni Connections</h2>
            </div>

            {companies.map((company) => {
              const paths = alumniByCompany[company.id] ?? [];
              return (
                <div key={company.id} className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">{company.logoPlaceholder}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{company.name}</p>
                      <p className="text-xs text-slate-400">{company.industry}</p>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{company.warmthScore}%</div>
                  </div>

                  {paths.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-slate-400 italic">Searching for connections...</div>
                  ) : paths.map((path) => (
                    <div key={path.alumni.id} className="px-5 py-4 border-b border-slate-50 last:border-0">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                          {path.alumni.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{path.alumni.name}</p>
                          <p className="text-xs text-slate-500 truncate">{path.alumni.currentRole}</p>
                        </div>
                        <a href={path.alumni.linkedinUrl} target="_blank" rel="noopener noreferrer"
                          onClick={() => track("demo_linkedin_click", { alumni: path.alumni.name, company: company.name })}
                          className="shrink-0 rounded-lg bg-[#0A66C2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#004182] transition-colors">
                          LinkedIn
                        </a>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{path.narrative}</p>
                      <div className="rounded-lg bg-slate-50 p-3 relative group">
                        <p className="text-sm text-slate-700 pr-14 leading-relaxed">&ldquo;{path.suggestedOpener}&rdquo;</p>
                        <button type="button" onClick={() => handleCopy(path.suggestedOpener, path.alumni.id)}
                          className="absolute top-2 right-2 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors">
                          {copied === path.alumni.id ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-center text-white">
              <p className="text-xl font-bold mb-1">Imagine this on autopilot.</p>
              <p className="text-emerald-100 text-sm mb-5">An AI agent in your inbox — finds people, writes messages, follows up.</p>
              <div className="flex gap-2 max-w-sm mx-auto">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-white/50" />
                <button type="button" onClick={handleSignup}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors whitespace-nowrap">
                  Join Pilot
                </button>
              </div>
              {signupError && <p className="text-sm text-red-200 mt-2">{signupError}</p>}
              <p className="text-xs text-emerald-200 mt-3">We&apos;ll reach out when it&apos;s ready.</p>
            </div>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-8 text-center">
              <p className="text-3xl mb-3">&#x1F389;</p>
              <p className="text-xl font-bold text-emerald-900 mb-2">You&apos;re on the list!</p>
              <p className="text-sm text-emerald-700">We&apos;ll reach out when the pilot is ready.</p>
              <button type="button" onClick={() => setStep("results")}
                className="mt-4 rounded-xl border border-emerald-300 px-5 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                Back to your results
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-8">
          Built by Rice students. <a href="/privacy" className="hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
