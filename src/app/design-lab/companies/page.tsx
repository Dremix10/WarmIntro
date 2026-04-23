import { ShortlistCard } from "./_parts/ShortlistCard";
import { BrowseSection } from "./_parts/BrowseSection";

const SHORTLIST = [
  {
    rank: 1,
    name: "Linear",
    logo: "L",
    why: "12 Brown alumni, 3 in product. Your React + TypeScript work is a direct match for their design-engineer roles.",
    alumni: 12,
    roles: 4,
    tags: ["SaaS", "Dev tools"],
    warmth: "strong" as const,
  },
  {
    rank: 2,
    name: "Stripe",
    logo: "S",
    why: "8 alumni, 2 already replied to classmates last month. High-velocity hiring season starts next week.",
    alumni: 8,
    roles: 6,
    tags: ["Fintech", "Infra"],
    warmth: "strong" as const,
  },
  {
    rank: 3,
    name: "Figma",
    logo: "F",
    why: "6 alumni across design + eng. Your UI coursework and portfolio line up with their design-systems team.",
    alumni: 6,
    roles: 3,
    tags: ["Design", "SaaS"],
    warmth: "medium" as const,
  },
  {
    rank: 4,
    name: "Notion",
    logo: "N",
    why: "5 alumni, 1 senior. Smaller alumni pool but unusually responsive — 60% reply rate from classmates.",
    alumni: 5,
    roles: 2,
    tags: ["SaaS", "Productivity"],
    warmth: "medium" as const,
  },
  {
    rank: 5,
    name: "Ramp",
    logo: "R",
    why: "4 alumni, all ICs. Fast-growing with open generalist SWE internships that fit your CS/econ background.",
    alumni: 4,
    roles: 5,
    tags: ["Fintech"],
    warmth: "medium" as const,
  },
  {
    rank: 6,
    name: "Vercel",
    logo: "V",
    why: "3 alumni, 1 warm contact via your clubs. Lean alumni but strong signal on the ones you have.",
    alumni: 3,
    roles: 3,
    tags: ["Dev tools", "Infra"],
    warmth: "light" as const,
  },
];

export default function CompaniesTemplate() {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[#EAE3D2] text-[#14182A]">
      <div className="mx-auto max-w-5xl px-6 pt-10 pb-32">
        <Header />
        <Hero />

        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5C6472]">
              Alma’s shortlist &middot; 6 strong matches
            </p>
            <p className="text-xs text-[#5C6472]">ordered by alumni density × skill fit</p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {SHORTLIST.map((c) => (
              <ShortlistCard key={c.name} c={c} />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-[family-name:var(--font-fraunces)] text-[#14182A]">
                Keep exploring.
              </h2>
              <p className="mt-1 text-sm text-[#5C6472]">
                24 more companies ranked by alumni overlap. Filter, browse, add any to your shortlist.
              </p>
            </div>
          </div>
          <BrowseSection />
        </section>

        <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full border border-[#D9CFB5] bg-white px-5 py-3 shadow-lg shadow-[#1B3B5F]/5">
          <p className="text-sm text-[#14182A]">
            <span className="font-semibold">3</span> picked <span className="text-[#5C6472]">of 6 recommended</span>
          </p>
          <button
            type="button"
            className="rounded-full bg-[#1B3B5F] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2E5A88]"
          >
            Build my pipeline →
          </button>
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

function Hero() {
  return (
    <div className="mt-12">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">For Kinsey · Brown CS ’27</p>
      <h1 className="mt-4 text-4xl leading-[1.1] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-5xl">
        Six companies where <span className="italic text-[#2E5A88]">you have a shot</span>.
      </h1>
      <p className="mt-4 max-w-2xl text-sm text-[#4A5260]">
        Alma read your resume and ranked every company in our database. These six have the strongest
        combination of alumni density, role fit, and active hiring right now. Pick the ones that
        excite you — we’ll build the pipeline next.
      </p>
    </div>
  );
}
