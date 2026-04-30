import { Reveal } from "@/components/Reveal";

const TILES = [
  { name: "Demetris", initial: "D", school: "Rice", color: "#1B3B5F" },
  { name: "Christos", initial: "C", school: "Rice", color: "#1B3B5F" },
  { name: "Evangelos", initial: "E", school: "Brown", color: "#7B1F2C" },
  { name: "Theofanis", initial: "T", school: "MIT", color: "#8A8674" },
];

export function FoundersStrip() {
  return (
    <section id="about" className="mx-auto max-w-5xl px-6 py-20 text-center">
      <Reveal>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
          Who built this
        </p>
        <h2 className="mt-3 text-[30px] leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[56px]">
          <span className="block italic text-[#2E5A88] md:whitespace-nowrap">
            We&rsquo;re in the IB cycle too.
          </span>
          <span className="block md:whitespace-nowrap">We built Alma for our cycle.</span>
        </h2>
      </Reveal>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        {TILES.map((t, i) => (
          <Reveal key={i} delay={i * 80}>
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-[family-name:var(--font-fraunces)] text-white"
                style={{ backgroundColor: t.color }}
                aria-label={`${t.name}, ${t.school}`}
              >
                {t.initial}
              </div>
              <p className="text-sm font-semibold text-[#14182A]">{t.name}</p>
              <p className="-mt-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#5C6472]">
                {t.school}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={4 * 80 + 80}>
        <div className="mx-auto mt-10 flex max-w-xl items-center gap-4 alma-card rounded-2xl border border-[#D9CFB5] p-5 text-left">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#FCD34D] bg-[#FEF3C7] text-base font-bold text-[#92400E]"
            aria-hidden
          >
            ★
          </span>
          <div>
            <p className="text-sm font-semibold text-[#14182A]">
              Track winner · Y-Claude Hackathon at Rice
            </p>
            <p className="mt-1 text-xs text-[#5C6472]">
              April 2026 · Now in private beta with Rice, Brown &amp; MIT testers
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
