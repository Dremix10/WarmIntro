"use client";

import type { UserProfile } from "@/shared/types";

export function ProfileCard({ profile }: { profile: UserProfile }) {
  return (
    <div className="rounded-2xl bg-white border border-[#ECE5D0] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#1B3B5F] px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white">
            {profile.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{profile.name}</h2>
            <p className="text-sm text-[#EAE3D2]">
              {profile.university} &middot; {profile.major} &middot; Class of {profile.graduationYear}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#ECE5D0]">
        {/* Skills */}
        <div className="px-6 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8A8674] mb-2">
            Skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-[#F4EDDB] px-2.5 py-1 text-xs font-medium text-[#2A2F3B]"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Experience */}
        <div className="px-6 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8A8674] mb-3">
            Experience
          </h3>
          <div className="space-y-4">
            {profile.experience.map((exp) => (
              <div key={`${exp.company}-${exp.role}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1F2330]">{exp.role}</p>
                    <p className="text-sm text-[#5C6472]">{exp.company}</p>
                  </div>
                  <span className="shrink-0 text-xs text-[#8A8674]">{exp.duration}</span>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {exp.highlights.map((h, i) => (
                    <li key={i} className="text-xs text-[#5C6472] pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-[#A8A494]">
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
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8A8674] mb-2">
            Target Roles
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.targetRoles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-[#F4EDDB] px-2.5 py-1 text-xs font-medium text-[#0F2A45]"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
