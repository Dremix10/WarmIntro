"use client";

import type { UserProfile } from "@/shared/types";

interface ProfileModalProps {
  profile: UserProfile;
  memberName: string;
  onClose: () => void;
}

export function ProfileModal({ profile, memberName, onClose }: ProfileModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-emerald-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
              {memberName.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">{memberName}</h2>
              <p className="text-xs text-emerald-100">
                {profile.university} &middot; {profile.major} &middot; Class of {profile.graduationYear}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Skills */}
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Skills
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Experience */}
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Experience
            </h3>
            <div className="space-y-4">
              {profile.experience.map((exp) => (
                <div key={`${exp.company}-${exp.role}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{exp.role}</p>
                      <p className="text-sm text-slate-500">{exp.company}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{exp.duration}</span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {exp.highlights.map((h, i) => (
                      <li key={i} className="text-xs text-slate-500 pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-slate-300">
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Target roles */}
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Target Roles
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.targetRoles.map((role) => (
                <span
                  key={role}
                  className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          {/* Target industries */}
          <div className="px-6 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Target Industries
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.targetIndustries.map((ind) => (
                <span
                  key={ind}
                  className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
