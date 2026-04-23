"use client";

import { useState } from "react";

type Industry = {
  id: string;
  name: string;
  icon: string;
  companies: number;
  alumni: number;
  examples: string[];
  recommended?: boolean;
};

const INDUSTRIES: Industry[] = [
  { id: "devtools", name: "Developer Tools", icon: "{ }", companies: 24, alumni: 47, examples: ["Linear", "Vercel", "Retool", "Cursor", "Replit"], recommended: true },
  { id: "infra", name: "Infrastructure & Cloud", icon: "☁", companies: 18, alumni: 32, examples: ["Cloudflare", "Datadog", "Snowflake", "Modal"], recommended: true },
  { id: "ai", name: "AI & ML", icon: "✺", companies: 22, alumni: 28, examples: ["Anthropic", "OpenAI", "Perplexity", "Scale", "Hex"] },
  { id: "fintech", name: "Fintech", icon: "$", companies: 30, alumni: 38, examples: ["Stripe", "Plaid", "Mercury", "Ramp", "Brex"] },
  { id: "saas", name: "SaaS & Productivity", icon: "▣", companies: 28, alumni: 41, examples: ["Notion", "Asana", "Airtable", "Rippling"] },
  { id: "design", name: "Design & Creative", icon: "◐", companies: 12, alumni: 19, examples: ["Figma", "Framer", "Arc"] },
  { id: "data", name: "Data & Analytics", icon: "≋", companies: 16, alumni: 22, examples: ["Segment", "Hex", "Dbt Labs"] },
  { id: "consumer", name: "Consumer & Social", icon: "◈", companies: 20, alumni: 34, examples: ["Discord", "Instagram", "BeReal"] },
  { id: "healthtech", name: "Healthcare Tech", icon: "✚", companies: 14, alumni: 17, examples: ["Oscar", "Alto", "Tempus"] },
  { id: "climate", name: "Climate", icon: "✿", companies: 11, alumni: 12, examples: ["Watershed", "Pachama"] },
  { id: "robotics", name: "Robotics & Hardware", icon: "⚙", companies: 9, alumni: 8, examples: ["Boston Dynamics", "Skydio"] },
  { id: "gaming", name: "Gaming", icon: "▷", companies: 8, alumni: 11, examples: ["Roblox", "Discord", "Riot"] },
];

const MAX = 3;

export function IndustryPicker() {
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX) next.add(id);
      return next;
    });
  };

  return (
    <>
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {INDUSTRIES.map((ind) => {
          const active = picked.has(ind.id);
          const full = !active && picked.size >= MAX;
          return (
            <button
              key={ind.id}
              type="button"
              onClick={() => toggle(ind.id)}
              disabled={full}
              className={`group relative flex h-full flex-col items-start rounded-2xl border p-5 text-left transition-all ${
                active
                  ? "border-[#1B3B5F] bg-[#F4EDDB] shadow-sm shadow-[#1B3B5F]/10"
                  : full
                  ? "border-[#ECE5D0] bg-white opacity-50 cursor-not-allowed"
                  : "border-[#D9CFB5] bg-white hover:border-[#2E5A88]"
              }`}
            >
              {ind.recommended && !active && (
                <span className="absolute right-3 top-3 rounded-full bg-[#F8F2E2] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#C86B4F]">
                  Alma’s pick
                </span>
              )}
              {active && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#1B3B5F] text-[10px] text-white">
                  ✓
                </span>
              )}

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4EDDB] text-lg font-[family-name:var(--font-fraunces)] text-[#1B3B5F]">
                {ind.icon}
              </div>
              <p className="mt-3 text-base font-semibold text-[#14182A]">{ind.name}</p>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-[#5C6472]">
                <span><span className="tabular-nums font-medium text-[#14182A]">{ind.companies}</span> companies</span>
                <span className="h-1 w-1 rounded-full bg-[#D9CFB5]" />
                <span><span className="tabular-nums font-medium text-[#14182A]">{ind.alumni}</span> alumni</span>
              </div>
              <p className="mt-3 text-[11px] text-[#5C6472]">
                Examples: <span className="text-[#14182A]">{ind.examples.slice(0, 3).join(", ")}</span>
              </p>
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full border border-[#D9CFB5] bg-white px-5 py-3 shadow-lg shadow-[#1B3B5F]/5">
        <p className="text-sm text-[#14182A]">
          <span className="font-semibold tabular-nums">{picked.size}</span>{" "}
          <span className="text-[#5C6472]">of {MAX} picked</span>
          {picked.size === 0 && <span className="text-[#5C6472]"> · choose one to three</span>}
        </p>
        <button
          type="button"
          disabled={picked.size === 0}
          className={`rounded-full px-5 py-2 text-xs font-semibold transition-colors ${
            picked.size === 0
              ? "bg-[#E8DFC7] text-[#8A8674]"
              : "bg-[#1B3B5F] text-white hover:bg-[#2E5A88]"
          }`}
        >
          Build my shortlist →
        </button>
      </div>
    </>
  );
}
