const TODAY = [
  { id: 1, title: "Send 3 outreach to Stripe", cta: "Start" },
  { id: 2, title: "Follow up with Maya (Linear)", cta: "Open" },
  { id: 3, title: "Review your Figma draft", cta: "Open" },
];

const FUNNEL = [
  { name: "Outreach", target: 100, current: 23 },
  { name: "Replies", target: 30, current: 5 },
  { name: "Coffee", target: 15, current: 1 },
  { name: "Referral", target: 6, current: 0 },
  { name: "Offer", target: 1, current: 0 },
];

const COMPANIES = [
  { name: "Stripe", sent: 4, total: 8 },
  { name: "Figma", sent: 2, total: 12 },
  { name: "Linear", sent: 5, total: 6 },
  { name: "Rippling", sent: 0, total: 10 },
];

export default function PipelineA() {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[#FAF7F1] text-[#14182A]">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <Wordmark />

        <header className="mt-14 flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">Wednesday, April 23</p>
            <h1 className="mt-4 text-5xl font-[family-name:var(--font-fraunces)] leading-[1.05] text-[#14182A]">
              Good morning,<br />
              <span className="italic text-[#2E5A88]">Kinsey.</span>
            </h1>
            <p className="mt-5 text-base text-[#4A5260] max-w-md">
              Three intros are waiting on you. A calm hour is all it takes.
            </p>
          </div>
          <StreakChip days={7} />
        </header>

        <section className="mt-14">
          <SectionLabel>Today</SectionLabel>
          <div className="mt-4 divide-y divide-[#ECE7DE] rounded-2xl border border-[#ECE7DE] bg-white">
            {TODAY.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-6 py-5 group hover:bg-[#FBF9F4] transition-colors">
                <div className="h-2 w-2 rounded-full bg-[#2E5A88]" />
                <p className="flex-1 text-sm text-[#14182A]">{t.title}</p>
                <button
                  type="button"
                  className="rounded-full bg-[#1B3B5F] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#2E5A88]"
                >
                  {t.cta} →
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <SectionLabel>Your funnel</SectionLabel>
          <div className="mt-4 rounded-2xl border border-[#ECE7DE] bg-white px-8 py-8">
            <div className="flex items-end justify-between gap-3">
              {FUNNEL.map((f) => {
                const pct = Math.min((f.current / f.target) * 100, 100);
                return (
                  <div key={f.name} className="flex flex-1 flex-col items-center">
                    <p className="mb-3 text-3xl font-[family-name:var(--font-fraunces)] tabular-nums text-[#14182A]">
                      {f.current}
                    </p>
                    <div className="relative h-32 w-full max-w-[76px] overflow-hidden rounded-t-md bg-[#F3EFE7]">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#1B3B5F] to-[#3F6FA3] transition-all"
                        style={{ height: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                    <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#14182A]">{f.name}</p>
                    <p className="text-[10px] text-[#6B7280]">of {f.target}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-8 border-t border-[#ECE7DE] pt-5 text-sm text-[#4A5260]">
              On pace for <span className="font-medium text-[#C86B4F]">1 offer by May 30</span>. A steady 5/day keeps the door open.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <SectionLabel>Companies</SectionLabel>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {COMPANIES.map((c) => {
              const pct = c.total > 0 ? (c.sent / c.total) * 100 : 0;
              return (
                <div
                  key={c.name}
                  className="group cursor-pointer rounded-2xl border border-[#ECE7DE] bg-white px-5 py-4 transition-colors hover:border-[#2E5A88]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#14182A]">{c.name}</p>
                    <span className="text-xs text-[#6B7280] tabular-nums">{c.sent}/{c.total}</span>
                  </div>
                  <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-[#F3EFE7]">
                    <div className="h-full bg-[#2E5A88] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-[#6B7280]">
                    {c.sent === 0 ? "not started" : pct >= 100 ? "all contacted" : "in progress"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="mt-16 border-t border-[#ECE7DE] pt-6 text-center text-xs text-[#6B7280]">
          1,240 xp &middot; level 4 Connector &middot; 3 badges earned
        </footer>
      </div>
    </div>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center justify-between">
      <p className="text-2xl italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">alma</p>
      <nav className="flex items-center gap-6 text-sm text-[#6B7280]">
        <span className="font-medium text-[#14182A]">Pipeline</span>
        <span>Companies</span>
        <span>CRM</span>
        <a href="/design-lab" className="text-[#2E5A88] hover:underline">&larr; lab</a>
      </nav>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#6B7280]">{children}</p>;
}

function StreakChip({ days }: { days: number }) {
  return (
    <div className="shrink-0 rounded-2xl border border-[#E8B339]/40 bg-[#FFF8E8] px-5 py-3 text-center">
      <p className="text-3xl font-[family-name:var(--font-fraunces)] tabular-nums leading-none text-[#B08100]">{days}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#B08100]">day streak</p>
    </div>
  );
}
