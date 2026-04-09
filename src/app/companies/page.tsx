"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { track } from "@/lib/track";
import { CompanyCard } from "@/components/CompanyCard";
import { saveSelectedCompanies, findCompanies } from "@/hooks/useApi";
import type { Company } from "@/shared/types";

export default function CompaniesPage() {
  const router = useRouter();
  const { allCompanies, setAllCompanies, profile, setSelectedCompanies } = useAppState();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [autoLoading, setAutoLoading] = useState(false);

  useEffect(() => {
    if (profile && allCompanies.length === 0 && !autoLoading) {
      setAutoLoading(true);
      findCompanies({
        industries: profile.targetIndustries,
        university: profile.university,
        skills: profile.skills,
        roles: profile.targetRoles,
      }).then((res) => {
        setAllCompanies(res.companies);
      }).finally(() => setAutoLoading(false));
    }
  }, [profile, allCompanies.length]);

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <p className="text-lg font-medium text-slate-700">Pick your industries first</p>
          <p className="text-sm text-slate-400">Select your target industries to see matching companies.</p>
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  if (allCompanies.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          {autoLoading ? (
            <>
              <div className="h-8 w-8 mx-auto animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
              <p className="text-lg font-medium text-slate-700">Finding companies with alumni...</p>
              <p className="text-sm text-slate-400">Matching your profile to companies with {profile.university} connections.</p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-slate-700">Pick your industries first</p>
              <p className="text-sm text-slate-400">Select your target industries to see matching companies.</p>
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                Go to Profile
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleContinue = () => {
    const selected: Company[] = allCompanies.filter((c) => picked.has(c.id));
    track("companies_selected", { count: selected.length, ids: selected.map((c) => c.id) });
    setSelectedCompanies(selected);
    saveSelectedCompanies(selected);
    router.push("/pipeline");
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-3xl px-6">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-emerald-600 mb-1">Select Companies</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Pick Your Target Companies
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {allCompanies.length} companies with {profile.university} alumni, ranked by connection strength. Select the ones you want to target.
          </p>
        </div>

        {/* Selection bar */}
        <div className="sticky top-0 z-10 -mx-6 mb-6 bg-slate-50/80 backdrop-blur-sm px-6 py-3 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-emerald-600">{picked.size}</span> {picked.size === 1 ? "company" : "companies"} selected
            </p>
            <button
              type="button"
              onClick={handleContinue}
              disabled={picked.size === 0}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Build My Pipeline
            </button>
          </div>
        </div>

        {/* Company grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allCompanies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              selected={picked.has(company.id)}
              onToggle={() => toggle(company.id)}
            />
          ))}
        </div>

        {/* Bottom CTA for long lists */}
        {allCompanies.length > 6 && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={handleContinue}
              disabled={picked.size === 0}
              className="rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Build Pipeline with {picked.size} {picked.size === 1 ? "Company" : "Companies"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
