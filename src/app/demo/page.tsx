"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { track, trackError } from "@/lib/track";
import type { UserProfile, Company, WarmPath } from "@/shared/types";

type Step = "upload" | "parsing" | "companies" | "alumni" | "results" | "signup" | "done";

const STATUS_MESSAGES = {
  parsing: "Analyzing your resume with AI...",
  companies: "Finding your top companies...",
  alumni: "Searching for alumni connections...",
};

export default function DemoPage() {
  const [step, setStep] = useState<Step>("upload");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [alumniByCompany, setAlumniByCompany] = useState<Record<string, WarmPath[]>>({});
  const [loadingCompany, setLoadingCompany] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Resume state
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { track("demo_view"); }, []);

  // Global error capture
  useEffect(() => {
    const handler = (e: ErrorEvent) => trackError("global", e.message);
    const rejectionHandler = (e: PromiseRejectionEvent) => trackError("unhandled_rejection", e.reason);
    window.addEventListener("error", handler);
    window.addEventListener("unhandledrejection", rejectionHandler);
    return () => { window.removeEventListener("error", handler); window.removeEventListener("unhandledrejection", rejectionHandler); };
  }, []);

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
    } catch (err) { trackError("pdf_extract", err); setError("Failed to read PDF. Try pasting your resume text."); setFileName(null); }
    finally { setExtracting(false); }
  };

  const runDemo = async () => {
    const text = resumeText.trim();
    if (!text) { setError("Upload or paste your resume first."); return; }
    setError(null);

    // Step 1: Parse resume
    setStep("parsing");
    track("demo_parse_start");
    try {
      const res = await fetch("/api/parse-resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resumeText: text, university: "Rice University" }) });
      if (!res.ok) throw new Error((await res.json()).error);
      const { profile: p } = await res.json();
      setProfile(p);
      track("demo_parsed", { name: p.name, skills: p.skills?.length });
    } catch (err) { trackError("parse", err); setError("Failed to parse resume. Try again."); setStep("upload"); return; }

    // Step 2: Find companies
    setStep("companies");
    track("demo_companies_start");
    try {
      const res = await fetch("/api/find-companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ industries: [], university: "Rice University", skills: profile?.skills ?? [], roles: profile?.targetRoles ?? [] }) });
      if (!res.ok) throw new Error((await res.json()).error);
      const { companies: allCompanies } = await res.json();
      const top3 = allCompanies.slice(0, 3);
      setCompanies(top3);
      track("demo_companies_found", { count: top3.length, names: top3.map((c: Company) => c.name) });
    } catch (err) { trackError("companies", err); setError("Failed to find companies. Try again."); setStep("upload"); return; }

    // Step 3: Find alumni for each company (sequential)
    setStep("alumni");
    track("demo_alumni_start");
  };

  // Load alumni after companies are set
  useEffect(() => {
    if (step !== "alumni" || companies.length === 0 || !profile) return;
    let cancelled = false;

    async function loadAlumni() {
      const results: Record<string, WarmPath[]> = {};
      for (const company of companies) {
        if (cancelled) return;
        setLoadingCompany(company.name);
        try {
          const res = await fetch("/api/find-alumni", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: company.id, university: "Rice University", userMajor: profile!.major, userGradYear: profile!.graduationYear }) });
          if (!res.ok) throw new Error((await res.json()).error);
          const data = await res.json();
          results[company.id] = (data.warmPaths ?? []).slice(0, 2);
          track("demo_alumni_found", { company: company.name, count: results[company.id].length });
        } catch (err) { trackError("alumni_" + company.id, err); results[company.id] = []; }
      }
      if (!cancelled) {
        setAlumniByCompany(results);
        setLoadingCompany(null);
        setStep("results");
        track("demo_results_shown");
      }
    }
    loadAlumni();
    return () => { cancelled = true; };
  }, [step, companies, profile]);

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

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex rounded-lg bg-slate-100 p-1">
              <button type="button" onClick={() => setError(null)} className="flex-1 rounded-md px-3 py-1.5 text-sm font-medium bg-white text-slate-900 shadow-sm">
                {fileName ? fileName : "Upload PDF"}
              </button>
            </div>

            {!resumeText.trim() ? (
              <>
                <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); }} className="hidden" />
                <div onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-slate-300 px-4 py-10 cursor-pointer transition-colors">
                  {extracting ? (
                    <><div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent mb-3" /><p className="text-sm font-medium text-slate-700">Reading PDF...</p></>
                  ) : (
                    <><svg className="h-10 w-10 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                      <p className="text-sm font-medium text-slate-700">Tap to upload your resume</p>
                      <p className="mt-1 text-xs text-slate-400">PDF up to 10MB</p></>
                  )}
                </div>
                <div className="text-center">
                  <span className="text-xs text-slate-400">or </span>
                  <button type="button" onClick={() => { setResumeText("paste"); setTimeout(() => setResumeText(""), 0); }}
                    className="text-xs text-emerald-600 font-medium hover:underline">paste text</button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                <div className="flex-1"><p className="text-sm font-medium text-emerald-800">{fileName ?? "Resume ready"}</p></div>
                <button type="button" onClick={() => { setResumeText(""); setFileName(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-emerald-400 hover:text-emerald-600"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg></button>
              </div>
            )}

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <button type="button" onClick={runDemo} disabled={!resumeText.trim() || extracting}
              className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              Find My Alumni Connections
            </button>
          </div>
        )}

        {/* Loading states */}
        {(step === "parsing" || step === "companies" || step === "alumni") && (
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center">
            <div className="relative mx-auto mb-6 h-16 w-16">
              <div className="h-16 w-16 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-emerald-500" />
            </div>
            <p className="text-lg font-semibold text-slate-900">
              {STATUS_MESSAGES[step as keyof typeof STATUS_MESSAGES]}
            </p>
            {step === "alumni" && loadingCompany && (
              <p className="mt-2 text-sm text-emerald-600 animate-pulse">{loadingCompany}...</p>
            )}
            <p className="mt-2 text-xs text-slate-400">This usually takes 10-15 seconds</p>
          </div>
        )}

        {/* Results */}
        {step === "results" && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm font-medium text-emerald-600">Your top {companies.length} matches</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">Alumni at Your Dream Companies</h2>
            </div>

            {companies.map((company) => {
              const paths = alumniByCompany[company.id] ?? [];
              return (
                <div key={company.id} className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">{company.logoPlaceholder}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{company.name}</p>
                      <p className="text-xs text-slate-400">{company.industry} &middot; {company.location}</p>
                    </div>
                    <div className="ml-auto rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{company.warmthScore}% match</div>
                  </div>

                  {paths.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-slate-400">No alumni found at this company.</div>
                  ) : paths.map((path) => (
                    <div key={path.alumni.id} className="px-5 py-4 border-b border-slate-50 last:border-0">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-700">
                          {path.alumni.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">{path.alumni.name}</p>
                          <p className="text-xs text-slate-500">{path.alumni.currentRole}</p>
                        </div>
                        <a href={path.alumni.linkedinUrl} target="_blank" rel="noopener noreferrer"
                          onClick={() => track("demo_linkedin_click", { alumni: path.alumni.name, company: company.name })}
                          className="rounded-lg bg-[#0A66C2] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#004182] transition-colors">
                          View on LinkedIn
                        </a>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{path.narrative}</p>
                      <div className="rounded-lg bg-slate-50 p-3 relative">
                        <p className="text-sm text-slate-700 pr-16">{path.suggestedOpener}</p>
                        <button type="button" onClick={() => handleCopy(path.suggestedOpener, path.alumni.id)}
                          className="absolute top-2 right-2 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                          {copied === path.alumni.id ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            <button type="button" onClick={() => setStep("signup")}
              className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">
              Want this on autopilot? Join the pilot
            </button>
          </div>
        )}

        {/* Signup */}
        {step === "signup" && (
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center">
            <p className="text-2xl font-bold text-slate-900 mb-2">Imagine this on autopilot.</p>
            <p className="text-slate-500 mb-6">
              An AI agent that lives in your inbox — finds the right people, drafts the perfect message, and follows up for you.
            </p>
            <div className="flex gap-2 max-w-sm mx-auto">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              <button type="button" onClick={handleSignup}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors whitespace-nowrap">
                Join Pilot
              </button>
            </div>
            {signupError && <p className="text-sm text-red-500 mt-2">{signupError}</p>}
            <p className="text-xs text-slate-400 mt-3">We&apos;ll reach out when it&apos;s ready. Your data stays private.</p>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-8 text-center">
            <p className="text-3xl mb-3">&#x1F389;</p>
            <p className="text-xl font-bold text-emerald-900 mb-2">You&apos;re on the list!</p>
            <p className="text-sm text-emerald-700">We&apos;ll reach out when the pilot is ready. In the meantime, use the messages above to start connecting.</p>
            <button type="button" onClick={() => setStep("results")}
              className="mt-4 rounded-xl border border-emerald-300 px-5 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
              &larr; Back to your results
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-8">
          Built by Rice students, for Rice students. <a href="/privacy" className="hover:underline">Privacy</a>
        </p>
      </div>
    </div>
  );
}
