const STAGES = [
  { value: 120, label: "calls sent", sub: "networking reaches" },
  { value: 40, label: "responses", sub: "~33% reply rate" },
  { value: 20, label: "coffees", sub: "warm conversations" },
  { value: 8, label: "referrals", sub: "a banker vouches" },
  { value: 4, label: "first rounds", sub: "HireVue / phone" },
  { value: 2, label: "superdays", sub: "the final 6 hours" },
  { value: 1, label: "offer", sub: "yours" },
];

const MAX = 120;

export function FunnelMath() {
  return (
    <div className="rounded-3xl border border-[#D9CFB5] bg-white p-6 md:p-8">
      <div className="flex items-end justify-between gap-2 md:gap-3">
        {STAGES.map((s, i) => {
          const height = Math.max((s.value / MAX) * 220, 18);
          const isLast = i === STAGES.length - 1;
          return (
            <div key={s.label} className="flex flex-1 flex-col items-center">
              <p className={`mb-3 font-[family-name:var(--font-fraunces)] tabular-nums leading-none ${isLast ? "text-4xl text-[#C86B4F]" : "text-3xl text-[#14182A]"} md:text-4xl`}>
                {s.value}
              </p>
              <div className="flex h-[220px] w-full items-end">
                <div
                  className={`mx-auto w-full max-w-[44px] rounded-t-lg ${
                    isLast ? "bg-gradient-to-t from-[#A85535] to-[#E89872]" : "bg-gradient-to-t from-[#1B3B5F] to-[#3F6FA3]"
                  }`}
                  style={{ height: `${height}px` }}
                />
              </div>
              <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-[#14182A]">
                {s.label}
              </p>
              <p className="mt-0.5 text-center text-[10px] text-[#5C6472]">{s.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-[#ECE5D0] pt-5 text-xs text-[#5C6472]">
        <p>Based on the 2026 BB + EB cycle, Brown &amp; Rice cohorts</p>
        <p className="hidden text-[#C86B4F] font-medium sm:block">→ that&rsquo;s ~8 calls/week for 16 weeks</p>
      </div>
    </div>
  );
}
