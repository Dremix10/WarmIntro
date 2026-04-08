"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { parseResume } from "@/hooks/useApi";
import { useAppState } from "@/components/AppProvider";
import { GoogleDrivePicker } from "@/components/GoogleDrivePicker";

const SAMPLE_RESUME = `Alex Rivera
Rice University — Mechanical Engineering, Class of 2027

EXPERIENCE
Rice Robotics Lab | Undergraduate Research Assistant | Jan 2025 – Present
• Designed adaptive gripper mechanisms for soft robotic manipulation
• Conducted FEA simulations improving grip reliability by 35%
• Programmed Arduino-based control systems for real-time sensor feedback

Apex Manufacturing Solutions | Manufacturing Engineering Intern | May – Aug 2025
• Implemented Lean Manufacturing principles, reducing cycle time by 18%
• Created SolidWorks assemblies and technical drawings for 12 custom fixtures
• Led root cause analysis for defect reduction, saving $45K annually

SKILLS
SolidWorks, Python, MATLAB, Lean Manufacturing, FEA, GD&T, CAD Design, Robotics

INTERESTS
Manufacturing Engineering, Process Engineering, Product Design, EV Industry`;

type InputMode = "pdf" | "gdrive" | "text";

export function ResumeUpload() {
  const router = useRouter();
  const { setProfile } = useAppState();
  const [mode, setMode] = useState<InputMode>("pdf");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractPdfServerSide = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to extract text");
    return data.text as string;
  };

  const handlePdfFile = async (file: File) => {
    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      setError("Please upload a PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Please upload a PDF under 10MB.");
      return;
    }

    setError(null);
    setExtracting(true);
    setFileName(file.name);

    try {
      const text = await extractPdfServerSide(file);
      setResumeText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read PDF. Try Google Drive or paste text.");
      setFileName(null);
    } finally {
      setExtracting(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePdfFile(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePdfFile(file);
  };

  const handleSubmit = async () => {
    const text = resumeText.trim();
    if (!text) {
      setError("Upload or paste your resume first.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await parseResume({ resumeText: text, university: "Rice University" });
      setProfile(res.profile);
      router.push("/profile");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Authentication") || msg.includes("Rate limit")) {
        setError("Rate limit reached. Sign up with your Rice email for unlimited access.");
      } else {
        setError("Something went wrong. Try uploading again or paste your resume text.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUseSample = () => {
    setResumeText(SAMPLE_RESUME);
    setFileName("sample-resume.txt");
    setError(null);
  };

  const clearFile = () => {
    setFileName(null);
    setResumeText("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasResume = !!resumeText.trim();

  return (
    <div className="w-full space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-lg bg-slate-100 p-1">
        {([
          { key: "pdf" as const, label: "Upload PDF" },
          { key: "gdrive" as const, label: "Google Drive" },
          { key: "text" as const, label: "Paste" },
        ]).map((tab) => (
          <button key={tab.key} type="button"
            onClick={() => { setMode(tab.key); setError(null); }}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* PDF upload */}
      {mode === "pdf" && !hasResume && (
        <>
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf"
            onChange={handleFileChange} className="hidden" />
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 cursor-pointer transition-colors ${
              dragging ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
            }`}>
            {extracting ? (
              <>
                <span className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent mb-3" />
                <p className="text-sm font-medium text-slate-700">Reading your resume...</p>
              </>
            ) : (
              <>
                <svg className="h-10 w-10 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <p className="text-sm font-medium text-slate-700">
                  Tap to upload your resume PDF
                </p>
                <p className="mt-1 text-xs text-slate-400">Works with Files, iCloud, Google Drive</p>
              </>
            )}
          </div>
          <button type="button" onClick={handleUseSample}
            className="w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
            Skip — use sample resume for demo
          </button>
        </>
      )}

      {/* Google Drive picker */}
      {mode === "gdrive" && !hasResume && (
        <GoogleDrivePicker
          extracting={extracting}
          onFilePicked={async (fileId, name, accessToken) => {
            setExtracting(true);
            setError(null);
            setFileName(name);
            try {
              // Download the file from Google Drive using the OAuth token
              const dlRes = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              if (!dlRes.ok) throw new Error("Could not download file from Drive");
              const blob = await dlRes.blob();
              const file = new File([blob], name, { type: "application/pdf" });

              // Send to our server for text extraction
              const text = await extractPdfServerSide(file);
              setResumeText(text);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to import from Google Drive");
              setFileName(null);
            } finally {
              setExtracting(false);
            }
          }}
        />
      )}

      {/* Text paste */}
      {mode === "text" && !hasResume && (
        <div className="relative">
          <textarea value={resumeText}
            onChange={(e) => { setResumeText(e.target.value); setError(null); }}
            placeholder="Paste your resume text here..."
            rows={8}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none transition-shadow" />
          {!resumeText && (
            <button type="button" onClick={handleUseSample}
              className="absolute bottom-3 right-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
              Use sample
            </button>
          )}
        </div>
      )}

      {/* File loaded state */}
      {hasResume && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <svg className="h-6 w-6 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800 truncate">{fileName ?? "Resume ready"}</p>
            <p className="text-xs text-emerald-600">{resumeText.length.toLocaleString()} characters extracted</p>
          </div>
          <button type="button" onClick={clearFile}
            className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-100 hover:text-emerald-600 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

      {loading ? (
        <div className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span className="text-sm font-semibold text-white">Analyzing your resume with AI...</span>
          </div>
          <p className="mt-1.5 text-xs text-emerald-200">Extracting skills, experience, and finding matches. ~10 seconds.</p>
        </div>
      ) : (
        <button type="button" onClick={handleSubmit} disabled={extracting || !hasResume}
          className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          Analyze Resume &amp; Find Connections
        </button>
      )}
    </div>
  );
}
