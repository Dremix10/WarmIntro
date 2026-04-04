"use client";

import { ResumeUpload } from "@/components/ResumeUpload";
import { useAppState } from "@/components/AppProvider";

export default function HomePage() {
  const { isProfileShared, setIsProfileShared } = useAppState();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
      <div className="w-full max-w-2xl px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 mb-6">
            <span>Rice University</span>
            <span className="text-emerald-400">|</span>
            <span>Internship Pipeline</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">
            Warm<span className="text-emerald-600">Intro</span>
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Turn cold applications into warm introductions.
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Paste your resume and we&apos;ll find alumni at your dream companies who can help you get in.
          </p>
        </div>

        {/* Funnel preview */}
        <div className="flex flex-wrap items-center justify-center gap-y-1 gap-x-1 text-xs text-slate-400 mb-8">
          {[
            { n: "100", label: "Outreach" },
            { n: "30", label: "Replies" },
            { n: "15", label: "Coffees" },
            { n: "6", label: "Referrals" },
            { n: "3", label: "Interviews" },
            { n: "1", label: "Offer" },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-300 mx-0.5 hidden sm:inline">&rarr;</span>}
              <span className="font-semibold text-slate-600">{step.n}</span>
              <span>{step.label}</span>
            </div>
          ))}
        </div>

        {/* Resume sharing opt-in */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 mb-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-slate-900">Share your resume on the Leaderboard?</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  isProfileShared
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-400"
                }`}>
                  {isProfileShared ? "Sharing" : "Private"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isProfileShared
                  ? "Your analyzed resume will be visible to leaderboard members who also opted in. You'll be able to view their resumes too."
                  : "Your resume stays private. You won't be able to view other members' resumes on the leaderboard."}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                This choice is locked once you upload your resume.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsProfileShared(!isProfileShared)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors mt-0.5 ${
                isProfileShared ? "bg-emerald-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  isProfileShared ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Upload */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <ResumeUpload />
        </div>
      </div>
    </div>
  );
}
