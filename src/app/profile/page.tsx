"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { track } from "@/lib/track";
import { ProfileCard } from "@/components/ProfileCard";
import { ResumeUpload } from "@/components/ResumeUpload";
import { findCompanies } from "@/hooks/useApi";
import { INDUSTRIES } from "@/shared/constants";

export default function ProfilePage() {
  const router = useRouter();
  const { session, profile, setAllCompanies } = useAppState();
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#FBF7EC] py-12">
        <div className="mx-auto max-w-2xl px-6">
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-[#1B3B5F] mb-1">{session ? "Your Profile" : "Guest Preview"}</p>
            <h1 className="text-3xl font-bold tracking-tight text-[#14182A]">Upload Your Resume</h1>
            <p className="mt-1 text-sm text-[#5C6472]">
              {session ? "We'll parse your resume and find alumni bankers at every BB, EB, and MM shop." : "Try Alma — upload a resume to see how it works."}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-[#ECE5D0]">
            <ResumeUpload />
          </div>
          {!session && (
            <p className="text-center text-xs text-[#8A8674] mt-4">
              <a href="/" className="text-[#1B3B5F] font-medium hover:underline">Sign up</a> to save your progress and access all features.
            </p>
          )}
        </div>
      </div>
    );
  }

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(industry)
        ? prev.filter((i) => i !== industry)
        : [...prev, industry]
    );
  };

  const handleContinue = async () => {
    if (selectedIndustries.length === 0) {
      setError("Pick at least one industry.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      track("industry_selected", { industries: selectedIndustries });
      const res = await findCompanies({
        industries: selectedIndustries,
        university: profile.university,
        skills: profile.skills,
        roles: profile.targetRoles,
      });
      track("companies_loaded", { count: res.companies.length });
      setAllCompanies(res.companies);
      router.push("/companies");
    } catch {
      setError("Failed to load companies. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF7EC] py-12">
      <div className="mx-auto max-w-2xl px-6">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-[#1B3B5F] mb-1">Your Profile</p>
          <h1 className="text-3xl font-bold tracking-tight text-[#14182A]">
            Your Profile
          </h1>
          <p className="mt-1 text-sm text-[#5C6472]">
            Review your parsed resume and pick the industries you want to target.
          </p>
        </div>

        {/* Profile card */}
        <ProfileCard profile={profile} />

        {/* Industry picker */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-[#14182A] mb-1">
            Target Industries
          </h2>
          <p className="text-sm text-[#5C6472] mb-4">
            Select the industries you want to explore. We&apos;ll find companies with alumni from {profile.university}.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {INDUSTRIES.map((industry) => {
              const selected = selectedIndustries.includes(industry);
              return (
                <button
                  key={industry}
                  type="button"
                  onClick={() => toggleIndustry(industry)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all ${
                    selected
                      ? "border-[#2E5A88] bg-[#F4EDDB] text-[#0F2A45] shadow-sm"
                      : "border-[#D9CFB5] bg-white text-[#2A2F3B] hover:border-[#C7BC9F] hover:shadow-sm"
                  }`}
                >
                  {selected && <span className="mr-1.5">&#10003;</span>}
                  {industry}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-500 font-medium">{error}</p>
        )}

        {/* Continue */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={loading || selectedIndustries.length === 0}
          className="mt-6 w-full rounded-xl bg-[#1B3B5F] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#2E5A88] focus:outline-none focus:ring-2 focus:ring-[#2E5A88]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Finding companies...
            </span>
          ) : (
            `Find Companies in ${selectedIndustries.length || "..."} ${selectedIndustries.length === 1 ? "Industry" : "Industries"}`
          )}
        </button>
      </div>
    </div>
  );
}
