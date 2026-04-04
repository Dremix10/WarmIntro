"use client";

import { ResumeUpload } from "@/components/ResumeUpload";

export default function HomePage() {
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
        <div className="flex items-center justify-center gap-1 text-xs text-slate-400 mb-8">
          {[
            { n: "100", label: "Outreach" },
            { n: "30", label: "Replies" },
            { n: "15", label: "Coffees" },
            { n: "6", label: "Referrals" },
            { n: "3", label: "Interviews" },
            { n: "1", label: "Offer" },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-300 mx-0.5">&rarr;</span>}
              <span className="font-semibold text-slate-600">{step.n}</span>
              <span>{step.label}</span>
            </div>
          ))}
        </div>

        {/* Upload */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <ResumeUpload />
        </div>
      </div>
    </div>
  );
}
