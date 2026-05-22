import { ShortlistCard } from "./_parts/ShortlistCard";
import { BrowseSection } from "./_parts/BrowseSection";

const SHORTLIST = [
  {
    rank: 1,
    name: "Morgan Stanley",
    logo: "MS",
    why: "18 Brown alumni across TMT, M&A, and Sponsors. Known for the strongest tech-student conversion among BBs. Your CS background fits TMT cleanly.",
    alumni: 18,
    roles: 6,
    tags: ["Bulge Bracket", "TMT", "M&A"],
    warmth: "strong" as const,
  },
  {
    rank: 2,
    name: "Goldman Sachs",
    logo: "GS",
    why: "22 alumni, 4 VPs who respond to students. Most competitive BB but the Brown pipeline is strong. Start early, lead with TMT or Healthcare.",
    alumni: 22,
    roles: 5,
    tags: ["Bulge Bracket", "TMT", "Healthcare"],
    warmth: "strong" as const,
  },
  {
    rank: 3,
    name: "Evercore",
    logo: "EV",
    why: "9 alumni at one of the top Elite Boutiques. M&A-focused, smaller class, higher per-capita comp. Responsive to networking when you lead with specifics.",
    alumni: 9,
    roles: 3,
    tags: ["Elite Boutique", "M&A"],
    warmth: "medium" as const,
  },
  {
    rank: 4,
    name: "Centerview Partners",
    logo: "CV",
    why: "4 alumni, but every one of them replied to a classmate last year. Smallest BB+EB tier — 30 summer analysts nationally. Pure M&A advisory.",
    alumni: 4,
    roles: 2,
    tags: ["Elite Boutique", "M&A"],
    warmth: "medium" as const,
  },
  {
    rank: 5,
    name: "JPMorgan",
    logo: "JPM",
    why: "24 alumni across LevFin, M&A, and coverage. Biggest analyst class of any BB — easier entry, more structured training. Strong Brown presence in NYC.",
    alumni: 24,
    roles: 8,
    tags: ["Bulge Bracket", "LevFin", "M&A"],
    warmth: "medium" as const,
  },
  {
    rank: 6,
    name: "PJT Partners",
    logo: "PJT",
    why: "6 alumni, 2 in RSSG (Restructuring). If you're open to RX, PJT is the top shop. Even if not, their M&A group punches above its weight.",
    alumni: 6,
    roles: 3,
    tags: ["Elite Boutique", "Restructuring", "M&A"],
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
              Alma&rsquo;s shortlist &middot; 6 banks to start with
            </p>
            <p className="text-xs text-[#5C6472]">ordered by alumni density × group fit × reply rate</p>
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
        Six banks where <span className="italic text-[#2E5A88]">you have a shot</span>.
      </h1>
      <p className="mt-4 max-w-2xl text-sm text-[#4A5260]">
        Alma ranked every Bulge Bracket, Elite Boutique, and Middle Market shop against your
        profile, your groups, and how often their Brown/Rice alumni actually reply. These six
        are where your hours return the most. Pick them — we&rsquo;ll build the pipeline next.
      </p>
    </div>
  );
}
