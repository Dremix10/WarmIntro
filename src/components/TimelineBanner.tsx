// IB recruiting calendar for the 2026 cycle (sophomore summer → junior summer internship).
// Phases are fixed — every Brown/Rice student is on the same clock.
// Backend note: replace the `currentPhaseId` prop default with a `getCurrentPhase(date)` helper
// once the calendar is stored in config. See BACKEND_REQUESTS.md → "IB recruiting calendar config".

type Phase = {
  id: string;
  label: string;
  range: string;
};

const PHASES: Phase[] = [
  { id: "prep", label: "Prep", range: "May — Aug" },
  { id: "networking", label: "Networking", range: "Sept — Oct" },
  { id: "apps", label: "Apps open", range: "late Sept" },
  { id: "firstrounds", label: "First rounds", range: "Nov — Dec" },
  { id: "superdays", label: "Superdays", range: "Jan — Feb" },
  { id: "offers", label: "Offers", range: "Feb — Mar" },
];

// inset each side of the track so endpoints land exactly on the first/last dot centers
const TRACK_INSET_PCT = 100 / (PHASES.length * 2);
const TRACK_SPAN_PCT = 100 - TRACK_INSET_PCT * 2;

export function TimelineBanner({
  currentPhaseId = "networking",
  daysToNext = 46,
  nextMilestone = "Summer analyst apps open at Goldman Sachs",
}: {
  currentPhaseId?: string;
  daysToNext?: number;
  nextMilestone?: string;
}) {
  const currentIdx = Math.max(0, PHASES.findIndex((p) => p.id === currentPhaseId));
  const fillWidthPct =
    currentIdx <= 0 ? 0 : (currentIdx / (PHASES.length - 1)) * TRACK_SPAN_PCT;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D9CFB5] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ECE5D0] bg-[#F8F2E2] px-5 py-3.5">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            2026 recruiting cycle
          </p>
          <p className="mt-1 text-sm text-[#14182A]">
            <span className="font-semibold">{PHASES[currentIdx].label}</span>
            <span className="text-[#5C6472]"> · {PHASES[currentIdx].range}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#C86B4F]">
            Next milestone
          </p>
          <p className="mt-1 text-sm text-[#14182A]">
            <span className="font-semibold tabular-nums">{daysToNext}</span>
            <span className="text-[#5C6472]"> days &middot; </span>
            <span className="italic text-[#5C6472] font-[family-name:var(--font-fraunces)]">
              {nextMilestone}
            </span>
          </p>
        </div>
      </div>

      <div className="px-5 pt-5 pb-5">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${PHASES.length}, minmax(0, 1fr))` }}
        >
          {PHASES.map((p, i) => (
            <p
              key={p.id}
              className={`text-center text-[10px] font-medium uppercase tracking-[0.14em] leading-none ${
                i === currentIdx
                  ? "text-[#C86B4F]"
                  : i < currentIdx
                  ? "text-[#1B3B5F]"
                  : "text-[#5C6472]"
              }`}
            >
              {p.label}
            </p>
          ))}
        </div>

        <div className="relative mt-4 h-4">
          <div
            className="absolute top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-[#F4EDDB]"
            style={{ left: `${TRACK_INSET_PCT}%`, right: `${TRACK_INSET_PCT}%` }}
          />
          <div
            className="absolute top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-gradient-to-r from-[#1B3B5F] to-[#3F6FA3]"
            style={{ left: `${TRACK_INSET_PCT}%`, width: `${fillWidthPct}%` }}
          />
          <div
            className="relative grid h-full"
            style={{ gridTemplateColumns: `repeat(${PHASES.length}, minmax(0, 1fr))` }}
          >
            {PHASES.map((p, i) => {
              const reached = i < currentIdx;
              const current = i === currentIdx;
              return (
                <div key={p.id} className="flex items-center justify-center">
                  <div
                    className={`h-3 w-3 rounded-full ring-[5px] ring-white ${
                      current
                        ? "bg-[#C86B4F] outline outline-2 outline-[#C86B4F]/30 outline-offset-[3px]"
                        : reached
                        ? "bg-[#2E5A88]"
                        : "border-2 border-[#D9CFB5] bg-white"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="mt-4 grid gap-2"
          style={{ gridTemplateColumns: `repeat(${PHASES.length}, minmax(0, 1fr))` }}
        >
          {PHASES.map((p) => (
            <p
              key={p.id}
              className="text-center text-[10px] tabular-nums text-[#5C6472] leading-none"
            >
              {p.range}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
