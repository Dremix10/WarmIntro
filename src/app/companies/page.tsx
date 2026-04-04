"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { CompanyCard } from "@/components/CompanyCard";
import type { Company } from "@/shared/types";

export default function CompaniesPage() {
  const router = useRouter();
  const { allCompanies, profile, setSelectedCompanies } = useAppState();
  const [picked, setPicked] = useState<Set<string>>(new Set());

  if (!profile || allCompanies.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <p className="text-lg font-medium text-slate-700">No companies loaded</p>
          <p className="text-sm text-slate-400">Complete the previous steps first.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Start over
          </button>
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
    setSelectedCompanies(selected);
    router.push("/pipeline");
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-3xl px-6">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-emerald-600 mb-1">Step 3 of 6</p>
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
