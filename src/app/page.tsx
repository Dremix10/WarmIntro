"use client";

import { ResumeUpload } from "@/components/ResumeUpload";
import { AuthForm } from "@/components/AuthForm";
import { useAppState } from "@/components/AppProvider";
import { useRouter } from "next/navigation";

const FUNNEL_STEPS = [
  { n: "100", label: "Outreach", color: "text-emerald-600" },
  { n: "30", label: "Replies", color: "text-blue-600" },
  { n: "15", label: "Coffees", color: "text-purple-600" },
  { n: "6", label: "Referrals", color: "text-pink-600" },
  { n: "3", label: "Interviews", color: "text-orange-600" },
  { n: "1", label: "Offer", color: "text-amber-600" },
];

export default function HomePage() {
  const { session, authLoading, profile, isProfileShared, setIsProfileShared } = useAppState();
  const router = useRouter();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (session && profile) {
    router.push("/companies");
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
      <div className="w-full max-w-2xl px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 mb-6">
            <span>Rice University</span>
            <span className="text-emerald-400">|</span>
            <span>Early Access</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900">
            Warm<span className="text-emerald-600">Intro</span>
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Turn cold applications into warm introductions.
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Find alumni at your dream companies. Get personalized outreach drafted by AI. Track your pipeline.
          </p>
        </div>

        {/* Funnel preview */}
        <div className="flex flex-wrap items-center justify-center gap-y-1 gap-x-1 text-xs text-slate-400 mb-8">
          {FUNNEL_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-300 mx-0.5 hidden sm:inline">&rarr;</span>}
              <span className={`font-bold ${step.color}`}>{step.n}</span>
              <span>{step.label}</span>
            </div>
          ))}
        </div>

        {!session ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 text-center mb-1">Get started</h2>
              <p className="text-sm text-slate-500 text-center mb-5">
                Sign up with your Rice email to find alumni at top companies.
              </p>
              <AuthForm onSuccess={() => {}} />
            </div>
            <button type="button" onClick={() => router.push("/profile")}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
              Try as guest — upload a resume to preview
            </button>
          </div>
        ) : (
          /* Signed in — resume upload */
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
              <p className="text-sm text-emerald-700">Signed in as <strong>{session.user.email}</strong></p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 mb-0.5">Share resume on Leaderboard?</p>
                  <p className="text-xs text-slate-500">
                    {isProfileShared ? "Visible to opted-in members." : "Private — only you can see it."}
                  </p>
                </div>
                <button type="button" onClick={() => setIsProfileShared(!isProfileShared)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${isProfileShared ? "bg-emerald-600" : "bg-slate-200"}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isProfileShared ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Upload your resume</h2>
              <p className="text-sm text-slate-500 mb-4">
                We&apos;ll parse your skills and experience to find the best alumni matches.
              </p>
              <ResumeUpload />
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">Built by Rice students, for Rice students.</p>
      </div>
    </div>
  );
}
