"use client";

import type { Company } from "@/shared/types";
import { AlumniBadge } from "@/components/AlumniBadge";

interface CompanyCardProps {
  company: Company;
  selected: boolean;
  onToggle: () => void;
}

export function CompanyCard({ company, selected, onToggle }: CompanyCardProps) {
  const topInternship = company.openInternships[0];

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-full rounded-xl border p-4 text-left transition-all ${
        selected
          ? "border-emerald-500 bg-emerald-50/50 shadow-md ring-1 ring-emerald-500"
          : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md"
      }`}
    >
      {/* Checkbox */}
      <div
        className={`absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
          selected
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-slate-300 bg-white"
        }`}
      >
        {selected && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </div>

      {/* Logo + name */}
      <div className="flex items-center gap-3 mb-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
          {company.logoPlaceholder}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{company.name}</p>
          <p className="text-xs text-slate-500">{company.location} &middot; {company.size}</p>
        </div>
      </div>

      {/* Alumni badge + warmth */}
      <div className="flex items-center justify-between mb-3">
        <AlumniBadge count={company.alumniCount} university="Rice University" />
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${company.warmthScore}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-500">{company.warmthScore}</span>
        </div>
      </div>

      {/* Top internship */}
      {topInternship && (
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs font-medium text-slate-700 truncate">{topInternship.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{topInternship.type}</span>
            <span className="text-xs text-slate-300">&middot;</span>
            <span className="text-xs font-medium text-emerald-600">{topInternship.matchScore}% match</span>
          </div>
        </div>
      )}
    </button>
  );
}
