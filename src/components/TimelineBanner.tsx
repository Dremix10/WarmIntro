// IB recruiting calendar for the 2026 cycle (sophomore summer → junior summer internship).
// Phases are fixed — every Brown/Rice student is on the same clock.
// Backend note: replace hardcoded phase detection with a `getCurrentPhase(date)` helper
// once the calendar is stored in config. See BACKEND_REQUESTS.md → "Timeline awareness".

type Phase = {
  id: string;
  label: string;
  range: string;
  short: string;
};

const PHASES: Phase[] = [
  { id: "prep", label: "Prep & story", range: "May — Aug", short: "story + technicals" },
  { id: "networking", label: "Networking", range: "Sept — Oct", short: "calls, coffees" },
  { id: "apps", label: "Apps open", range: "late Sept", short: "submit + follow up" },
  { id: "firstrounds", label: "First rounds", range: "Nov — Dec", short: "HireVues + phones" },
  { id: "superdays", label: "Superdays", range: "Jan — Feb", short: "final rounds" },
  { id: "offers", label: "Offers", range: "Feb — Mar", short: "decisions" },
];

export function TimelineBanner({
  currentPhaseId = "networking",
  daysToNext = 46,
  nextMilestone = "Summer analyst apps open at Goldman Sachs",
}: {
  currentPhaseId?: string;
  daysToNext?: number;
  nextMilestone?: string;
}) {
  const currentIdx = PHASES.findIndex((p) => p.id === currentPhaseId);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D9CFB5] bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-[#ECE5D0] bg-[#F8F2E2] px-5 py-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            2026 recruiting cycle
          </p>
          <p className="mt-1 text-sm text-[#14182A]">
            <span className="font-semibold">{PHASES[currentIdx]?.label ?? "—"}</span>
            <span className="text-[#5C6472]"> · {PHASES[currentIdx]?.range}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#C86B4F]">Next milestone</p>
          <p className="mt-1 text-sm font-medium text-[#14182A]">
            <span className="tabular-nums">{daysToNext}</span>
            <span className="text-[#5C6472]"> days · </span>
            <span className="italic text-[#5C6472] font-[family-name:var(--font-fraunces)]">{nextMilestone}</span>
          </p>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="relative">
          <div className="absolute left-0 right-0 top-[13px] h-[3px] rounded-full bg-[#F4EDDB]" />
          <div
            className="absolute left-0 top-[13px] h-[3px] rounded-full bg-gradient-to-r from-[#1B3B5F] to-[#3F6FA3]"
            style={{ width: `${((currentIdx + 0.5) / PHASES.length) * 100}%` }}
          />
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${PHASES.length}, minmax(0, 1fr))` }}
          >
            {PHASES.map((p, i) => {
              const reached = i < currentIdx;
              const current = i === currentIdx;
              return (
                <div key={p.id} className="relative flex flex-col items-center pb-1">
                  <div
                    className={`h-[10px] w-[10px] rounded-full ring-4 ring-white ${
                      current
                        ? "bg-[#C86B4F] outline outline-2 outline-[#C86B4F]/30 outline-offset-[3px]"
                        : reached
                        ? "bg-[#2E5A88]"
                        : "border border-[#D9CFB5] bg-white"
                    }`}
                  />
                  <p
                    className={`mt-3 text-[10px] font-medium uppercase tracking-wider ${
                      current ? "text-[#C86B4F]" : reached ? "text-[#1B3B5F]" : "text-[#5C6472]"
                    }`}
                  >
                    {p.label}
                  </p>
                  <p className="mt-0.5 text-[9px] tabular-nums text-[#5C6472]">{p.range}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
