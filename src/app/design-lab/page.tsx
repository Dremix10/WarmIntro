import Link from "next/link";

const variants = [
  {
    slug: "pipeline-hybrid",
    letter: "★",
    name: "Pipeline — hybrid",
    tagline: "Journey bar + trajectory + today + companies, on deeper paper.",
  },
  {
    slug: "companies",
    letter: "◆",
    name: "Companies — curated picks",
    tagline: "Alma's shortlist up top, browseable grid below.",
  },
  {
    slug: "outreach",
    letter: "✎",
    name: "Outreach — compose",
    tagline: "Warm path narrative + pre-drafted message + alumni rail.",
  },
  {
    slug: "crm",
    letter: "▥",
    name: "CRM — network kanban",
    tagline: "Six-stage funnel board with mentor read + needs-follow-up signals.",
  },
  {
    slug: "profile",
    letter: "◉",
    name: "Profile — parsed + pick industries",
    tagline: "What Alma read from your resume, plus the industry picker.",
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
    slug: "network",
    letter: "⎈",
    name: "Archipelago — your crossings",
    tagline: "Aegean islands, one per company. Every intro is a leap across water.",
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
  {
    slug: "landing",
    letter: "⌂",
    name: "Landing / — the front door",
    tagline: "Hero, funnel math, how it works, FAQ, closing CTA.",
  },
  {
    slug: "pipeline-a",
    letter: "A",
    name: "Morning Brief",
    tagline: "What to do in the next hour — mentor voice loud, data quiet.",
  },
  {
    slug: "pipeline-b",
    letter: "B",
    name: "Command Center",
    tagline: "Dashboard-forward, graphs first, most screenshot-able.",
  },
  {
    slug: "pipeline-c",
    letter: "C",
    name: "Trajectory",
    tagline: "One long journey bar that says: you're going to make it.",
  },
];

export default function DesignLabIndex() {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[#FAF7F1]">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="flex items-baseline justify-between">
          <p className="text-2xl italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">alma</p>
          <p className="text-xs uppercase tracking-[0.18em] text-[#6B7280]">design lab</p>
        </div>

        <h1 className="mt-16 text-4xl font-[family-name:var(--font-fraunces)] text-[#14182A] leading-tight">
          Three takes on <span className="italic text-[#2E5A88]">/pipeline</span>.
        </h1>
        <p className="mt-3 text-sm text-[#6B7280] max-w-md">
          Same direction — Aegean &times; Atrium. Different answers to “what is this page for?”
          Click through, react, hybridize.
        </p>

        <div className="mt-12 space-y-3">
          {variants.map((v) => (
            <Link
              key={v.slug}
              href={`/design-lab/${v.slug}`}
              className="group flex items-center gap-6 rounded-2xl border border-[#ECE7DE] bg-white px-6 py-5 transition-colors hover:border-[#2E5A88]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3EFE7] text-lg font-[family-name:var(--font-fraunces)] text-[#1B3B5F] group-hover:bg-[#1B3B5F] group-hover:text-white transition-colors">
                {v.letter}
              </span>
              <div className="flex-1">
                <p className="text-lg font-[family-name:var(--font-fraunces)] text-[#14182A]">{v.name}</p>
                <p className="mt-0.5 text-sm text-[#6B7280]">{v.tagline}</p>
              </div>
              <span className="text-[#6B7280] group-hover:text-[#2E5A88] transition-colors">→</span>
            </Link>
          ))}
        </div>

        <p className="mt-16 text-xs text-[#6B7280]">
          These are throwaway visualizations — fake data, no routing, nothing persists.
        </p>
      </div>
    </div>
  );
}
