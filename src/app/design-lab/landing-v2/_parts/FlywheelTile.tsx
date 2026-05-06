import { Reveal } from "@/components/Reveal";

export function FlywheelTile() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            Learns from you
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-[40px] leading-[1.05] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[64px]">
            Your edits become better next drafts.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[#4A5260] md:text-base">
            Alma improves in two ways: the product learns from early-user feedback, and your
            own drafts learn from your edits, skips, replies, and preferences.
          </p>
        </div>
      </Reveal>

      <Reveal delay={150}>
        <div className="mx-auto mt-10 max-w-xl alma-card rounded-2xl border border-[#D9CFB5] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#2E5A88]">
                Your personal voice loop
              </p>
              <p className="mt-1 text-lg font-[family-name:var(--font-fraunces)] text-[#14182A]">
                &ldquo;Too formal&rdquo; today should change tomorrow&rsquo;s emails
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-[#FCD34D] bg-[#FEF3C7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#92400E]">
              Live
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="alma-flywheel-slot rounded-lg border border-dashed border-[#C9BFA5] bg-[#F9F5EB] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A8674]">
                Feedback you give
              </p>
              <p className="mt-2 text-xs text-[#5C6472]">
                Edit a sentence, skip a banker, or say &ldquo;this sounds fake.&rdquo; Alma uses that on your next batch.
              </p>
            </div>
            <div className="alma-flywheel-slot rounded-lg border border-dashed border-[#C9BFA5] bg-[#F9F5EB] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A8674]">
                More context over time
              </p>
              <p className="mt-2 text-xs text-[#5C6472]">
                Beta users will get short check-ins and optional Gmail tone review, with permission, so drafts get closer to how they actually write.
              </p>
            </div>
          </div>
          <p className="mt-4 border-t border-[#ECE7DE] pt-4 text-xs text-[#5C6472]">
            This is why early users matter: every real edit turns into a better personal system.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
