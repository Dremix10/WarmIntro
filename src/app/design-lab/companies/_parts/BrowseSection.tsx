"use client";

import { useState } from "react";
import { BrowseRow } from "./BrowseRow";

type Company = {
  name: string;
  industry: string;
  alumni: number;
  roles: number;
  size: "Startup" | "Growth" | "Enterprise";
  hiring: boolean;
};

const BROWSE: Company[] = [
  { name: "Rippling", industry: "SaaS", alumni: 7, roles: 5, size: "Growth", hiring: true },
  { name: "Plaid", industry: "Fintech", alumni: 6, roles: 3, size: "Growth", hiring: true },
  { name: "Anthropic", industry: "AI", alumni: 4, roles: 8, size: "Growth", hiring: true },
  { name: "Scale AI", industry: "AI", alumni: 5, roles: 6, size: "Growth", hiring: true },
  { name: "Airtable", industry: "SaaS", alumni: 4, roles: 2, size: "Growth", hiring: false },
  { name: "Asana", industry: "SaaS", alumni: 3, roles: 2, size: "Enterprise", hiring: true },
  { name: "Datadog", industry: "Infra", alumni: 6, roles: 4, size: "Enterprise", hiring: true },
  { name: "Snowflake", industry: "Data", alumni: 5, roles: 5, size: "Enterprise", hiring: true },
  { name: "Retool", industry: "Dev tools", alumni: 2, roles: 3, size: "Growth", hiring: true },
  { name: "Mercury", industry: "Fintech", alumni: 3, roles: 2, size: "Growth", hiring: true },
  { name: "Brex", industry: "Fintech", alumni: 4, roles: 3, size: "Growth", hiring: false },
  { name: "Attio", industry: "SaaS", alumni: 2, roles: 2, size: "Startup", hiring: true },
  { name: "OpenAI", industry: "AI", alumni: 3, roles: 7, size: "Growth", hiring: true },
  { name: "Perplexity", industry: "AI", alumni: 2, roles: 4, size: "Startup", hiring: true },
  { name: "Vanta", industry: "SaaS", alumni: 3, roles: 3, size: "Growth", hiring: true },
  { name: "Modal", industry: "Infra", alumni: 1, roles: 2, size: "Startup", hiring: true },
  { name: "Cursor", industry: "Dev tools", alumni: 1, roles: 3, size: "Startup", hiring: true },
  { name: "Replit", industry: "Dev tools", alumni: 3, roles: 4, size: "Growth", hiring: true },
  { name: "Supabase", industry: "Dev tools", alumni: 2, roles: 3, size: "Growth", hiring: true },
  { name: "Hex", industry: "Data", alumni: 2, roles: 2, size: "Startup", hiring: false },
  { name: "Segment", industry: "Data", alumni: 5, roles: 3, size: "Enterprise", hiring: true },
  { name: "Vapi", industry: "AI", alumni: 1, roles: 2, size: "Startup", hiring: true },
  { name: "Clay", industry: "SaaS", alumni: 2, roles: 4, size: "Startup", hiring: true },
  { name: "Arc", industry: "Design", alumni: 2, roles: 1, size: "Startup", hiring: false },
];

const INDUSTRIES = ["All", "Fintech", "Dev tools", "SaaS", "AI", "Infra", "Design", "Data"];
const ROLES = ["SWE", "Product", "Design", "Data", "Ops"];
const SIZES: Company["size"][] = ["Startup", "Growth", "Enterprise"];
const ALUMNI_STEPS = [0, 3, 5, 10];
const PAGE_SIZE = 8;

export function BrowseSection() {
  const [industry, setIndustry] = useState<string>("All");
  const [moreOpen, setMoreOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [role, setRole] = useState<string | null>(null);
  const [size, setSize] = useState<Company["size"] | null>(null);
  const [alumniMin, setAlumniMin] = useState(0);
  const [hiringOnly, setHiringOnly] = useState(false);

  const filtered = BROWSE.filter((b) => {
    if (industry !== "All" && b.industry !== industry) return false;
    if (size && b.size !== size) return false;
    if (alumniMin > 0 && b.alumni < alumniMin) return false;
    if (hiringOnly && !b.hiring) return false;
    return true;
  });

  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - visible;

  const extraCount =
    (role ? 1 : 0) + (size ? 1 : 0) + (alumniMin > 0 ? 1 : 0) + (hiringOnly ? 1 : 0);

  const clearExtras = () => {
    setRole(null);
    setSize(null);
    setAlumniMin(0);
    setHiringOnly(false);
  };

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {INDUSTRIES.map((f) => (
          <Chip key={f} active={industry === f} onClick={() => { setIndustry(f); setVisible(PAGE_SIZE); }}>
            {f}
          </Chip>
        ))}
        <span className="mx-2 h-5 w-px bg-[#D9CFB5]" />
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
            moreOpen || extraCount > 0
              ? "border-[#1B3B5F] bg-[#F4EDDB] text-[#1B3B5F]"
              : "border-[#D9CFB5] bg-white text-[#14182A] hover:border-[#2E5A88]"
          }`}
        >
          <span className="text-sm leading-none">⊕</span>
          More filters
          {extraCount > 0 && (
            <span className="ml-0.5 rounded-full bg-[#1B3B5F] px-1.5 py-px text-[10px] font-semibold text-white tabular-nums">
              {extraCount}
            </span>
          )}
        </button>
      </div>

      {moreOpen && (
        <div className="mt-3 grid grid-cols-1 gap-6 rounded-2xl border border-[#D9CFB5] bg-[#F8F2E2] p-5 md:grid-cols-4">
          <FilterGroup label="Role">
            {ROLES.map((r) => (
              <RadioChip key={r} active={role === r} onClick={() => setRole(role === r ? null : r)}>
                {r}
              </RadioChip>
            ))}
          </FilterGroup>
          <FilterGroup label="Stage">
            {SIZES.map((s) => (
              <RadioChip key={s} active={size === s} onClick={() => { setSize(size === s ? null : s); setVisible(PAGE_SIZE); }}>
                {s}
              </RadioChip>
            ))}
          </FilterGroup>
          <FilterGroup label="Alumni at company">
            {ALUMNI_STEPS.map((n) => (
              <RadioChip key={n} active={alumniMin === n} onClick={() => { setAlumniMin(n); setVisible(PAGE_SIZE); }}>
                {n === 0 ? "Any" : `${n}+`}
              </RadioChip>
            ))}
          </FilterGroup>
          <FilterGroup label="Activity">
            <RadioChip active={hiringOnly} onClick={() => { setHiringOnly((v) => !v); setVisible(PAGE_SIZE); }}>
              Actively hiring
            </RadioChip>
          </FilterGroup>
          {extraCount > 0 && (
            <button
              type="button"
              onClick={clearExtras}
              className="col-span-full justify-self-start text-xs font-medium text-[#5C6472] hover:text-[#C86B4F]"
            >
              Clear {extraCount} filter{extraCount > 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#D9CFB5] bg-white">
        <div className="grid grid-cols-[32px_1fr_160px_100px_110px_auto] items-center gap-4 border-b border-[#ECE5D0] bg-[#F8F2E2] px-5 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">
          <span />
          <span>Company</span>
          <span>Industry</span>
          <span className="text-right">Alumni</span>
          <span className="text-right">Roles</span>
          <span />
        </div>
        {shown.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[#14182A] font-[family-name:var(--font-fraunces)] italic">
              No companies match these filters.
            </p>
            <p className="mt-1 text-xs text-[#5C6472]">Try loosening a filter to see more.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#ECE5D0]">
            {shown.map((b) => (
              <BrowseRow key={b.name} b={b} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <p className="text-xs text-[#5C6472] tabular-nums">
          Showing <span className="font-semibold text-[#14182A]">{shown.length}</span> of{" "}
          <span className="font-semibold text-[#14182A]">{filtered.length}</span>
        </p>
        {remaining > 0 ? (
          <button
            type="button"
            onClick={() => setVisible((v) => Math.min(v + PAGE_SIZE, filtered.length))}
            className="group inline-flex items-center gap-2 rounded-full border border-[#D9CFB5] bg-white px-6 py-2.5 text-sm font-medium text-[#1B3B5F] transition-all hover:border-[#2E5A88] hover:bg-[#F4EDDB]"
          >
            Show {Math.min(PAGE_SIZE, remaining)} more
            <span className="transition-transform group-hover:translate-y-0.5">↓</span>
          </button>
        ) : filtered.length > PAGE_SIZE ? (
          <div className="flex items-center gap-3">
            <p className="text-xs italic text-[#5C6472] font-[family-name:var(--font-fraunces)]">
              You’ve seen every company.
            </p>
            <button
              type="button"
              onClick={() => setVisible(PAGE_SIZE)}
              className="text-xs font-medium text-[#2E5A88] hover:underline"
            >
              collapse ↑
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-[#1B3B5F] bg-[#1B3B5F] text-white"
          : "border-[#D9CFB5] bg-white text-[#14182A] hover:border-[#2E5A88]"
      }`}
    >
      {children}
    </button>
  );
}

function RadioChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-[#2E5A88] bg-white text-[#1B3B5F]"
          : "border-transparent bg-white/60 text-[#5C6472] hover:bg-white hover:text-[#14182A]"
      }`}
    >
      {children}
    </button>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
