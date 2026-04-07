"use client";

import { useState } from "react";
import { ResumeUpload } from "@/components/ResumeUpload";
import { AuthForm } from "@/components/AuthForm";
import { useAppState } from "@/components/AppProvider";
import { useRouter } from "next/navigation";
import { INDUSTRIES } from "@/shared/constants";
import { saveProfile, findCompanies } from "@/hooks/useApi";
import type { UserProfile } from "@/shared/types";

const FUNNEL_STEPS = [
  { n: "100", label: "Outreach", color: "text-emerald-600" },
  { n: "30", label: "Replies", color: "text-blue-600" },
  { n: "15", label: "Coffees", color: "text-purple-600" },
  { n: "6", label: "Referrals", color: "text-pink-600" },
  { n: "3", label: "Interviews", color: "text-orange-600" },
  { n: "1", label: "Offer", color: "text-amber-600" },
];

export default function HomePage() {
  const { session, authLoading, profile, setProfile, setAllCompanies, isProfileShared, setIsProfileShared } = useAppState();
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

  const linkedInName = session?.user?.user_metadata?.name as string | undefined;
  const linkedInEmail = session?.user?.email;
  const isLinkedIn = session?.user?.app_metadata?.provider === "linkedin_oidc";

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
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 text-center mb-1">Get started</h2>
            <p className="text-sm text-slate-500 text-center mb-5">
              Sign up to find alumni connections at top companies.
            </p>
            <AuthForm onSuccess={() => {}} />
          </div>
        ) : isLinkedIn && !profile ? (
          <LinkedInProfileSetup
            name={linkedInName ?? ""}
            email={linkedInEmail ?? ""}
            isProfileShared={isProfileShared}
            setIsProfileShared={setIsProfileShared}
            onComplete={async (p) => {
              setProfile(p);
              const res = await findCompanies({
                industries: p.targetIndustries,
                university: p.university,
                skills: p.skills,
                roles: p.targetRoles,
              });
              setAllCompanies(res.companies);
              router.push("/companies");
            }}
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
              <p className="text-sm text-emerald-700">
                Signed in as <strong>{session.user.email}</strong>
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-900">Share your resume on the Leaderboard?</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isProfileShared ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                      {isProfileShared ? "Sharing" : "Private"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {isProfileShared ? "Your analyzed resume will be visible to leaderboard members who also opted in." : "Your resume stays private."}
                  </p>
                </div>
                <button type="button" onClick={() => setIsProfileShared(!isProfileShared)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors mt-0.5 ${isProfileShared ? "bg-emerald-600" : "bg-slate-200"}`}>
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isProfileShared ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Upload your resume</h2>
              <p className="text-sm text-slate-500 mb-4">We&apos;ll parse your skills and experience to find the best alumni matches.</p>
              <ResumeUpload />
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          Built by Rice students, for Rice students.
        </p>
      </div>
    </div>
  );
}

function LinkedInProfileSetup({
  name, email, isProfileShared, setIsProfileShared, onComplete,
}: {
  name: string;
  email: string;
  isProfileShared: boolean;
  setIsProfileShared: (v: boolean) => void;
  onComplete: (profile: UserProfile) => Promise<void>;
}) {
  const [major, setMajor] = useState("");
  const [gradYear, setGradYear] = useState("2027");
  const [industry, setIndustry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResumeUpload, setShowResumeUpload] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!major || !industry) { setError("Please fill in all fields"); return; }

    setSaving(true);
    setError(null);

    const profile: UserProfile = {
      name,
      email,
      university: "Rice University",
      graduationYear: parseInt(gradYear, 10),
      major,
      skills: [],
      experience: [],
      targetIndustries: [industry],
      targetRoles: [],
      resumeText: "",
    };

    try {
      await saveProfile(profile);
      onComplete(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
      setSaving(false);
    }
  };

  if (showResumeUpload) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
          <p className="text-sm text-emerald-700">Welcome, <strong>{name}</strong></p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Upload your resume</h2>
          <p className="text-sm text-slate-500 mb-4">This gives us your skills and experience for better alumni matching.</p>
          <ResumeUpload />
        </div>
        <button type="button" onClick={() => setShowResumeUpload(false)}
          className="w-full text-sm text-slate-500 hover:text-slate-700 py-2">
          &larr; Back to quick setup
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
        <p className="text-sm text-emerald-700">Welcome, <strong>{name}</strong></p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-1">Quick profile setup</h2>
        <p className="text-sm text-slate-500 mb-5">
          We pulled your name from LinkedIn. Just tell us a few more things to find your alumni connections.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Major</label>
              <input type="text" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="e.g. Mechanical Engineering" required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Graduation Year</label>
              <select value={gradYear} onChange={(e) => setGradYear(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                {["2025", "2026", "2027", "2028", "2029"].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Target Industry</label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} required
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
              <option value="">Select an industry</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          {/* Resume sharing toggle */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <div>
              <p className="text-xs font-semibold text-slate-700">Share resume on Leaderboard?</p>
              <p className="text-[10px] text-slate-400">{isProfileShared ? "Visible to opted-in members" : "Private"}</p>
            </div>
            <button type="button" onClick={() => setIsProfileShared(!isProfileShared)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${isProfileShared ? "bg-emerald-600" : "bg-slate-200"}`}>
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${isProfileShared ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Finding your alumni connections...
              </span>
            ) : "Find My Alumni Connections"}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-100 text-center">
          <button type="button" onClick={() => setShowResumeUpload(true)}
            className="text-sm text-emerald-600 font-medium hover:underline">
            Want better matches? Upload your resume instead
          </button>
        </div>
      </div>
    </div>
  );
}
