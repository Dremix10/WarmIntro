import { Reveal } from "@/components/Reveal";

export function FlywheelTile() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            The flywheel
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-[40px] leading-[1.05] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[64px]">
            Every Sunday, Alma learns something.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[#4A5260] md:text-base">
            Each send writes a signal. Each Sunday at 11pm UTC, a batch updates the banker scoring weights and the Critic&apos;s rubric. Then Alma is sharper for everyone.
          </p>
        </div>
      </Reveal>

      <Reveal delay={150}>
        <div className="mx-auto mt-10 max-w-xl alma-card rounded-2xl border border-[#D9CFB5] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#2E5A88]">
                Release · pending
              </p>
              <p className="mt-1 text-lg font-[family-name:var(--font-fraunces)] text-[#14182A]">
                First release publishes Sun May 3, 11pm UTC
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-[#FCD34D] bg-[#FEF3C7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#92400E]">
              Upcoming
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="alma-flywheel-slot rounded-lg border border-dashed border-[#C9BFA5] bg-[#F9F5EB] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A8674]">
                Banker scoring weights
              </p>
              <p className="mt-2 text-xs text-[#5C6472]">
                Updated based on which warmth signals correlate with replies. (Empty until first release.)
              </p>
            </div>
            <div className="alma-flywheel-slot rounded-lg border border-dashed border-[#C9BFA5] bg-[#F9F5EB] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A8674]">
                Critic calibration
              </p>
              <p className="mt-2 text-xs text-[#5C6472]">
                Rubric updates from drafts that scored high but got no reply. (Empty until first release.)
              </p>
            </div>
          </div>
          <p className="mt-4 border-t border-[#ECE7DE] pt-4 text-xs text-[#5C6472]">
            Public release notes will name what changed and why. Like a software release, but for the network&apos;s intuition.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
