import Link from "next/link";

const variants = [
  {
    slug: "landing-v2",
    letter: "⌂",
    name: "Landing / — the front door",
    tagline: "Hero + bank marquee + animated funnel + scroll-triggered archipelago.",
  },
  {
    slug: "pipeline-hybrid",
    letter: "★",
    name: "Pipeline — hybrid",
    tagline: "Timeline banner + journey bar + today tasks + banks + trajectory.",
  },
  {
    slug: "companies",
    letter: "◆",
    name: "Companies — curated banks",
    tagline: "Alma's bank shortlist (BB/EB/MM) up top, browseable grid below.",
  },
  {
    slug: "outreach",
    letter: "✎",
    name: "Outreach — compose",
    tagline: "Warm path narrative + pre-drafted call request + alumni rail.",
  },
  {
    slug: "crm",
    letter: "▥",
    name: "CRM — network kanban",
    tagline: "7-stage IB funnel board with mentor read + needs-follow-up signals.",
  },
  {
    slug: "profile",
    letter: "◉",
    name: "Profile — parsed + pick groups",
    tagline: "What Alma read from your resume, plus coverage group picker.",
  },
  {
    slug: "network",
    letter: "⎈",
    name: "Archipelago — your crossings",
    tagline: "Aegean islands, one per bank. Every intro is a leap across water.",
  },
  {
    slug: "leaderboard",
    letter: "♦",
    name: "Leaderboard — class competition",
    tagline: "Position, distance to next rank, cohort spotlights.",
  },
  {
    slug: "recap",
    letter: "✉",
    name: "Weekly recap — Sunday letter",
    tagline: "Narrative letter from Alma summarizing your week.",
  },
  {
    slug: "cohort",
    letter: "◠",
    name: "Cohort — together, not ranked",
    tagline: "Aggregate numbers, heartbeat chart, anonymous signals.",
  },
  {
    slug: "quests",
    letter: "⬗",
    name: "Quests + milestones",
    tagline: "Structured weekly goals + private milestone celebrations.",
  },
];

export default function DesignLabIndex() {
  return (
    <div className="min-h-screen bg-[#EAE3D2]">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="flex items-baseline justify-between">
          <p className="text-2xl italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">alma</p>
          <p className="text-xs uppercase tracking-[0.18em] text-[#5C6472]">design lab</p>
        </div>

        <h1 className="mt-16 text-4xl font-[family-name:var(--font-fraunces)] leading-tight text-[#14182A]">
          The <span className="italic text-[#2E5A88]">Alma</span> reference designs.
        </h1>
        <p className="mt-3 max-w-md text-sm text-[#5C6472]">
          Every page of the product as a standalone preview. IB-flavored, Aegean-blue palette,
          Fraunces voice. Use these as the spec when migrating a legacy route to the new design.
        </p>

        <div className="mt-12 space-y-3">
          {variants.map((v) => (
            <Link
              key={v.slug}
              href={`/design-lab/${v.slug}`}
              className="group flex items-center gap-6 rounded-2xl border border-[#D9CFB5] bg-white px-6 py-5 transition-colors hover:border-[#2E5A88]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4EDDB] text-lg font-[family-name:var(--font-fraunces)] text-[#1B3B5F] transition-colors group-hover:bg-[#1B3B5F] group-hover:text-white">
                {v.letter}
              </span>
              <div className="flex-1">
                <p className="text-lg font-[family-name:var(--font-fraunces)] text-[#14182A]">{v.name}</p>
                <p className="mt-0.5 text-sm text-[#5C6472]">{v.tagline}</p>
              </div>
              <span className="text-[#5C6472] transition-colors group-hover:text-[#2E5A88]">→</span>
            </Link>
          ))}
        </div>

        <p className="mt-16 text-xs text-[#5C6472]">
          Throwaway visualizations — fake data, nothing persists.
        </p>
      </div>
    </div>
  );
}
