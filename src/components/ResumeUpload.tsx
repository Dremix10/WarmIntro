"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { parseResume } from "@/hooks/useApi";
import { useAppState } from "@/components/AppProvider";

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

type InputMode = "text" | "pdf";

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.legacy.js";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}

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

  const handlePdfFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Please upload a PDF under 10MB.");
      return;
    }

    setError(null);
    setExtracting(true);
    setFileName(file.name);

    try {
      const text = await extractTextFromPdf(file);
      if (!text.trim()) {
        setError("Could not extract text from this PDF. Try pasting the text instead.");
        setFileName(null);
      } else {
        setResumeText(text);
      }
    } catch (err) {
      console.error("PDF extraction error:", err);
      setError(`Failed to read PDF: ${err instanceof Error ? err.message : String(err)}`);
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
      setError(mode === "pdf" ? "Please upload a PDF first." : "Please paste your resume first.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await parseResume({
        resumeText: text,
        university: "Rice University",
      });
      setProfile(res.profile);
      router.push("/profile");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Authentication")) {
        setError("Rate limit reached for guests. Sign up with your Rice email for unlimited access.");
      } else {
        setError("Something went wrong parsing your resume. Try pasting the text instead, or sign up and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUseSample = () => {
    setResumeText(SAMPLE_RESUME);
    setMode("text");
    setFileName(null);
    setError(null);
  };

  const clearPdf = () => {
    setFileName(null);
    setResumeText("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => { setMode("pdf"); setError(null); }}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "pdf"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Upload PDF
        </button>
        <button
          type="button"
          onClick={() => { setMode("text"); setError(null); }}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "text"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Paste Text
        </button>
      </div>

      {/* PDF upload */}
      {mode === "pdf" && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          {!fileName ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-12 cursor-pointer transition-colors ${
                dragging
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              {extracting ? (
                <>
                  <span className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent mb-3" />
                  <p className="text-sm font-medium text-slate-700">Extracting text from PDF...</p>
                </>
              ) : (
                <>
                  <svg className="h-10 w-10 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  <p className="text-sm font-medium text-slate-700">
                    <span className="hidden sm:inline">Drop your resume PDF here or </span>
                    <span className="sm:hidden">Tap to </span>
                    <span className="text-emerald-600">choose a PDF</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">PDF up to 10MB — works with Files, Google Drive, iCloud</p>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <svg className="h-8 w-8 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{fileName}</p>
                <p className="text-xs text-emerald-600">Text extracted successfully</p>
              </div>
              <button
                type="button"
                onClick={clearPdf}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {!fileName && (
            <button
              type="button"
              onClick={handleUseSample}
              className="w-full rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              Skip — use sample resume for demo
            </button>
          )}
        </>
      )}

      {/* Text paste */}
      {mode === "text" && (
        <div className="relative">
          <textarea
            value={resumeText}
            onChange={(e) => {
              setResumeText(e.target.value);
              setError(null);
            }}
            placeholder="Paste your resume text here..."
            rows={10}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none transition-shadow"
          />
          {!resumeText && (
            <button
              type="button"
              onClick={handleUseSample}
              className="absolute bottom-3 right-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              Use sample resume
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}

      {loading ? (
        <div className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span className="text-sm font-semibold text-white">Analyzing your resume with AI...</span>
          </div>
          <p className="mt-1.5 text-xs text-emerald-200">Extracting skills, experience, and finding matches. This takes about 10 seconds.</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={extracting || !resumeText.trim()}
          className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Analyze Resume &amp; Find Connections
        </button>
      )}

      <p className="text-center text-xs text-slate-400">
        Claude AI will parse your resume to find the best alumni connections.
        {mode === "pdf" && <><br /><span className="sm:hidden">On mobile? Try <button type="button" onClick={() => setMode("text")} className="text-emerald-600 font-medium">pasting text</button> instead.</span></>}
      </p>
    </div>
  );
}
