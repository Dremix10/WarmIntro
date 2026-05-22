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
          ? "border-[#2E5A88] bg-[#F4EDDB]/50 shadow-md ring-1 ring-[#2E5A88]"
          : "border-[#D9CFB5] bg-white shadow-sm hover:border-[#C7BC9F] hover:shadow-md"
      }`}
    >
      {/* Checkbox */}
      <div
        className={`absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
          selected
            ? "border-[#2E5A88] bg-[#2E5A88] text-white"
            : "border-[#C7BC9F] bg-white"
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4EDDB] text-sm font-bold text-[#4A5260]">
          {company.logoPlaceholder}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#14182A] truncate">{company.name}</p>
          <p className="text-xs text-[#5C6472]">{company.location} &middot; {company.size}</p>
        </div>
      </div>

      {/* Alumni badge + warmth */}
      <div className="flex items-center justify-between mb-3">
        <AlumniBadge count={company.alumniCount} university="Rice University" />
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-16 rounded-full bg-[#F4EDDB] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#2E5A88] transition-all"
              style={{ width: `${company.warmthScore}%` }}
            />
          </div>
          <span className="text-xs font-medium text-[#5C6472]">{company.warmthScore}</span>
        </div>
      </div>

      {/* Top internship */}
      {topInternship && (
        <div className="rounded-lg bg-[#FBF7EC] px-3 py-2">
          <p className="text-xs font-medium text-[#2A2F3B] truncate">{topInternship.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-[#8A8674]">{topInternship.type}</span>
            <span className="text-xs text-[#A8A494]">&middot;</span>
            <span className="text-xs font-medium text-[#1B3B5F]">{topInternship.matchScore}% match</span>
          </div>
        </div>
      )}
    </button>
  );
}
