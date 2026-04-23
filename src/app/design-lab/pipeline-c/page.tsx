const JOURNEY = [
  { name: "Outreach", current: 23, target: 100 },
  { name: "Replies", current: 5, target: 30 },
  { name: "Coffee", current: 1, target: 15 },
  { name: "Referral", current: 0, target: 6 },
  { name: "Interview", current: 0, target: 3 },
  { name: "Offer", current: 0, target: 1 },
];

const PROGRESS = 0.23;

type Momentum = { name: string; label: string; cta: string; kind: "live" | "attention" };
const MOMENTUM: Momentum[] = [
  { name: "Stripe", label: "2 alumni replied", cta: "Draft reply", kind: "live" },
  { name: "Linear", label: "Coffee with Maya · Thu 2pm", cta: "Prep notes", kind: "live" },
  { name: "Figma", label: "2/12 sent · quiet", cta: "Send 3 more", kind: "attention" },
  { name: "Rippling", label: "0/10 · never started", cta: "Pick first alum", kind: "attention" },
];

type Day = { day: string; count: number; today?: boolean };
const WEEK: Day[] = [
  { day: "M", count: 4 },
  { day: "T", count: 3 },
  { day: "W", count: 2, today: true },
  { day: "T", count: 0 },
  { day: "F", count: 0 },
  { day: "S", count: 0 },
  { day: "S", count: 0 },
];

export default function PipelineC() {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[#FAF7F1] text-[#14182A]">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header className="flex items-center justify-between">
          <p className="text-2xl italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">alma</p>
          <nav className="flex items-center gap-6 text-sm text-[#6B7280]">
            <span className="font-medium text-[#14182A]">Pipeline</span>
            <span>Companies</span>
            <span>CRM</span>
            <a href="/design-lab" className="text-[#2E5A88] hover:underline">&larr; lab</a>
          </nav>
        </header>

        <section className="mt-20 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#6B7280]">Wednesday, April 23</p>
          <h1 className="mx-auto mt-5 max-w-2xl text-4xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-5xl">
            You’re <span className="italic text-[#2E5A88]">23%</span> of the way to your offer.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm text-[#4A5260]">
            At your current pace of 5/day, Alma expects your first offer by
            <span className="font-medium text-[#C86B4F]"> May 30</span>.
          </p>
        </section>

        <JourneyBar />

        <section className="mt-16">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">What moves the needle today</p>
            <p className="text-xs text-[#6B7280]">sorted by momentum</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {MOMENTUM.map((m) => (
              <MomentumCard key={m.name} m={m} />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">This week</p>
            <p className="text-xs font-medium text-[#B08100]">7 day streak 🔥</p>
          </div>
          <div className="mt-4 rounded-2xl border border-[#ECE7DE] bg-white px-8 py-6">
            <div className="flex items-end justify-between gap-3">
              {WEEK.map((d, i) => {
                const height = Math.min(d.count * 14, 56);
                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="flex h-16 items-end">
                      {d.count > 0 ? (
                        <div
                          className={`w-8 rounded-t-md ${d.today ? "bg-[#E8B339]" : "bg-[#2E5A88]"}`}
                          style={{ height: `${height}px` }}
                        />
                      ) : (
                        <div className="h-[2px] w-8 rounded bg-[#ECE7DE]" />
                      )}
                    </div>
                    <p className={`text-[10px] font-medium uppercase tracking-wider ${d.today ? "text-[#B08100]" : "text-[#6B7280]"}`}>
                      {d.day}
                    </p>
                    <p className="text-[11px] tabular-nums text-[#14182A]">{d.count || "·"}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-5 border-t border-[#ECE7DE] pt-4 text-xs text-[#6B7280]">
              9 sends this week &middot; goal is 25 by Sunday &middot; 16 to go
            </p>
          </div>
        </section>

        <footer className="mt-12 border-t border-[#ECE7DE] pt-6 text-center text-xs text-[#6B7280]">
          1,240 xp &middot; Connector &middot; 260 xp to <span className="italic">Mentor</span>
        </footer>
      </div>
    </div>
  );
}

function JourneyBar() {
  const fillPct = PROGRESS * 100;
  return (
    <div className="mt-16 rounded-2xl border border-[#ECE7DE] bg-white px-8 py-10">
      <div className="relative">
        <div className="absolute left-[24px] right-[24px] top-[42px] h-[6px] rounded-full bg-[#F3EFE7]" />
        <div
          className="absolute left-[24px] top-[42px] h-[6px] rounded-full bg-gradient-to-r from-[#1B3B5F] to-[#3F6FA3]"
          style={{ width: `calc((100% - 48px) * ${PROGRESS})` }}
        />
        <div className="flex justify-between">
          {JOURNEY.map((stop, i) => {
            const x = JOURNEY.length > 1 ? i / (JOURNEY.length - 1) : 0;
            const reached = x <= PROGRESS + 0.001;
            const current = Math.abs(x - PROGRESS) < 1 / (JOURNEY.length - 1);
            return (
              <div key={stop.name} className="relative flex w-14 flex-col items-center">
                <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-[#6B7280] whitespace-nowrap">
                  {stop.name}
                </p>
                <div
                  className={`h-5 w-5 rounded-full ring-4 ring-[#FAF7F1] transition-all ${
                    current
                      ? "bg-[#C86B4F] ring-[#FAF7F1] outline outline-2 outline-[#C86B4F]/30 outline-offset-2"
                      : reached
                      ? "bg-[#2E5A88]"
                      : "border-2 border-[#D9D3C4] bg-white"
                  }`}
                />
                <p className="mt-3 text-sm font-[family-name:var(--font-fraunces)] tabular-nums text-[#14182A]">
                  {stop.current}
                </p>
                <p className="text-[10px] tabular-nums text-[#6B7280]">of {stop.target}</p>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-8 border-t border-[#ECE7DE] pt-5 text-center text-xs text-[#6B7280]">
        The funnel: 100 → 30 → 15 → 6 → 3 → 1. You’ve cleared the first climb.
      </p>
    </div>
  );
}

function MomentumCard({ m }: { m: Momentum }) {
  const isLive = m.kind === "live";
  return (
    <div
      className={`group cursor-pointer rounded-2xl border bg-white p-5 transition-colors ${
        isLive ? "border-[#2E5A88]/30 hover:border-[#2E5A88]" : "border-[#ECE7DE] hover:border-[#C86B4F]"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-[#14182A]">{m.name}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
            isLive ? "bg-[#2E5A88]/10 text-[#1B3B5F]" : "bg-[#C86B4F]/10 text-[#C86B4F]"
          }`}
        >
          {isLive ? "live" : "needs you"}
        </span>
      </div>
      <p className="mt-2 text-sm text-[#4A5260]">{m.label}</p>
      <button
        type="button"
        className={`mt-4 text-xs font-semibold ${isLive ? "text-[#1B3B5F]" : "text-[#C86B4F]"} group-hover:underline`}
      >
        {m.cta} →
      </button>
    </div>
  );
}
