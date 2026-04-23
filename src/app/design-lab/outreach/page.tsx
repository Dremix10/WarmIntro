import { Composer } from "./_parts/Composer";
import { AlumniRail } from "./_parts/AlumniRail";

const COMPANY = {
  name: "Linear",
  logo: "L",
  rank: 1,
  alumni: 12,
  contacted: 4,
  roles: 4,
};

const SELECTED = {
  name: "Maya Chen",
  role: "Senior Product Manager",
  team: "Product · Core",
  university: "Brown",
  classOf: 2019,
  major: "Computer Science",
  avatar: "M",
  warmth: 88,
  warmthLabel: "strongest match",
  location: "San Francisco, CA",
  sharedPoints: [
    "Same major — Brown CS",
    "Active in Brown CS Slack",
    "Replied to a classmate last month",
    "Part of WICS (you both)",
  ],
  story:
    "Maya majored in CS at Brown four years ahead of you and still shows up in the CS Slack — that’s rare. A classmate reached out last month and got a 20-minute coffee. She’s not a cold contact; she’s an older sibling waiting to be asked.",
};

export default function OutreachTemplate() {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[#EAE3D2] text-[#14182A]">
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-16">
        <Header />
        <Breadcrumb />
        <CompanyStrip />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Spotlight />
            <Composer />
          </div>
          <AlumniRail />
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between">
      <p className="text-2xl italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">alma</p>
      <nav className="flex items-center gap-6 text-sm text-[#5C6472]">
        <span>Pipeline</span>
        <span className="font-medium text-[#14182A]">Companies</span>
        <span>CRM</span>
        <span>Leaderboard</span>
        <a href="/design-lab" className="text-[#2E5A88] hover:underline">&larr; lab</a>
      </nav>
    </header>
  );
}

function Breadcrumb() {
  return (
    <p className="mt-10 text-xs font-medium text-[#5C6472]">
      <span className="hover:text-[#1B3B5F] cursor-pointer">Pipeline</span>
      <span className="mx-2 text-[#D9CFB5]">/</span>
      <span className="hover:text-[#1B3B5F] cursor-pointer">Linear</span>
      <span className="mx-2 text-[#D9CFB5]">/</span>
      <span className="text-[#14182A]">Maya Chen</span>
    </p>
  );
}

function CompanyStrip() {
  const pct = (COMPANY.contacted / COMPANY.alumni) * 100;
  return (
    <div className="mt-4 flex items-center justify-between gap-6 rounded-2xl border border-[#D9CFB5] bg-white px-6 py-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F4EDDB] text-lg font-[family-name:var(--font-fraunces)] text-[#1B3B5F]">
          {COMPANY.logo}
        </div>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-[family-name:var(--font-fraunces)] leading-none text-[#14182A]">
              {COMPANY.name}
            </h1>
            <span className="rounded-full bg-[#F4EDDB] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#1B3B5F]">
              shortlist #{COMPANY.rank}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-[#5C6472]">
            <span>{COMPANY.alumni} Brown alumni</span>
            <span className="h-1 w-1 rounded-full bg-[#D9CFB5]" />
            <span>{COMPANY.roles} open internships</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 max-w-sm items-center gap-4">
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">Contacted</p>
            <p className="text-xs tabular-nums text-[#14182A]">
              <span className="font-semibold">{COMPANY.contacted}</span>
              <span className="text-[#5C6472]"> / {COMPANY.alumni}</span>
            </p>
          </div>
          <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-[#F4EDDB]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1B3B5F] to-[#3F6FA3]" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full border border-[#D9CFB5] bg-white px-4 py-1.5 text-xs font-medium text-[#1B3B5F] hover:border-[#2E5A88]"
        >
          ← Pipeline
        </button>
      </div>
    </div>
  );
}

function Spotlight() {
  return (
    <div className="rounded-2xl border border-[#D9CFB5] bg-white p-6">
      <div className="flex items-start gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2E5A88] to-[#1B3B5F] text-2xl font-[family-name:var(--font-fraunces)] text-white">
          {SELECTED.avatar}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-[family-name:var(--font-fraunces)] leading-tight text-[#14182A]">
                {SELECTED.name}
              </h2>
              <p className="mt-1 text-sm text-[#4A5260]">
                {SELECTED.role} · {SELECTED.team}
              </p>
              <p className="mt-0.5 text-xs text-[#5C6472]">
                {SELECTED.university} ’{String(SELECTED.classOf).slice(-2)} · {SELECTED.major} · {SELECTED.location}
              </p>
            </div>
            <div className="shrink-0 rounded-2xl border border-[#2E5A88]/30 bg-[#F8F2E2] px-4 py-2.5 text-center">
              <p className="text-2xl font-[family-name:var(--font-fraunces)] tabular-nums leading-none text-[#1B3B5F]">
                {SELECTED.warmth}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#1B3B5F]">warmth</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-[#F8F2E2] px-5 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">Why she’s a warm path</p>
        <p
          className="mt-2 text-[15px] leading-relaxed text-[#14182A] font-[family-name:var(--font-fraunces)] italic"
          dangerouslySetInnerHTML={{ __html: SELECTED.story }}
        />
        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-[#E8DFC7] pt-3">
          {SELECTED.sharedPoints.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D9CFB5] bg-white px-2.5 py-1 text-[11px] text-[#14182A]"
            >
              <span className="h-1 w-1 rounded-full bg-[#2E5A88]" />
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
