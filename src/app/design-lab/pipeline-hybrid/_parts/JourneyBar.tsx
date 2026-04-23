const JOURNEY = [
  { name: "Outreach", current: 23, target: 100 },
  { name: "Replies", current: 5, target: 30 },
  { name: "Coffee", current: 1, target: 15 },
  { name: "Referral", current: 0, target: 6 },
  { name: "Interview", current: 0, target: 3 },
  { name: "Offer", current: 0, target: 1 },
];

const PROGRESS = 0.23;
const CURRENT_IDX = Math.round(PROGRESS * (JOURNEY.length - 1));

const TRACK_INSET_PCT = 100 / (JOURNEY.length * 2);
const TRACK_SPAN_PCT = 100 - TRACK_INSET_PCT * 2;

export function JourneyBar() {
  return (
    <div className="rounded-2xl border border-[#D9CFB5] bg-white px-8 py-8">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5C6472]">Your journey</p>
        <p className="text-xs text-[#5C6472]">
          Offer expected by <span className="font-medium text-[#C86B4F]">May 30</span>
        </p>
      </div>

      <div className="mt-8">
        <div className="grid grid-cols-6">
          {JOURNEY.map((stop) => (
            <p
              key={stop.name}
              className="text-center text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]"
            >
              {stop.name}
            </p>
          ))}
        </div>

        <div className="relative mt-4 h-12">
          <div
            className="absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-[#F4EDDB]"
            style={{ left: `${TRACK_INSET_PCT}%`, right: `${TRACK_INSET_PCT}%` }}
          />
          <div
            className="absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-gradient-to-r from-[#1B3B5F] to-[#3F6FA3]"
            style={{ left: `${TRACK_INSET_PCT}%`, width: `${TRACK_SPAN_PCT * PROGRESS}%` }}
          />
          <div className="relative grid h-full grid-cols-6">
            {JOURNEY.map((_, i) => {
              const reached = i < CURRENT_IDX;
              const current = i === CURRENT_IDX;
              return (
                <div key={i} className="flex items-center justify-center">
                  <div
                    className={`h-6 w-6 rounded-full ring-[6px] ring-white ${
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

        <div className="mt-4 grid grid-cols-6">
          {JOURNEY.map((stop) => (
            <div key={stop.name} className="flex flex-col items-center">
              <p className="text-base leading-none font-[family-name:var(--font-fraunces)] tabular-nums text-[#14182A]">
                {stop.current}
              </p>
              <p className="mt-1 text-[10px] tabular-nums text-[#5C6472]">of {stop.target}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
