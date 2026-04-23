const STAGES = [
  { value: 100, label: "outreaches", sub: "warm messages" },
  { value: 30, label: "replies", sub: "~30%" },
  { value: 15, label: "coffees", sub: "~50% of replies" },
  { value: 6, label: "referrals", sub: "~40% of coffees" },
  { value: 3, label: "interviews", sub: "~50% of referrals" },
  { value: 1, label: "offer", sub: "yours" },
];

const MAX = 100;

export function FunnelMath() {
  return (
    <div className="rounded-3xl border border-[#D9CFB5] bg-white p-6 md:p-8">
      <div className="flex items-end justify-between gap-2 md:gap-4">
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
                  className={`mx-auto w-full max-w-[52px] rounded-t-lg ${
                    isLast ? "bg-gradient-to-t from-[#A85535] to-[#E89872]" : "bg-gradient-to-t from-[#1B3B5F] to-[#3F6FA3]"
                  }`}
                  style={{ height: `${height}px` }}
                />
              </div>
              <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#14182A]">
                {s.label}
              </p>
              <p className="mt-0.5 text-[10px] text-[#5C6472]">{s.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-[#ECE5D0] pt-5 text-xs text-[#5C6472]">
        <p>Based on aggregated Brown &amp; Rice student pipelines, spring ’26</p>
        <p className="hidden text-[#C86B4F] font-medium sm:block">→ that’s ~3 reaches, 3× a week for 12 weeks</p>
      </div>
    </div>
  );
}
