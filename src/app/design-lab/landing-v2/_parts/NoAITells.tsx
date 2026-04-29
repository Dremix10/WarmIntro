import { Reveal } from "@/components/Reveal";

const AI_DRAFT = `Hi Maya,

I hope this email finds you well. I'm a sophomore at Brown studying CS, passionate about finance and excited about the intersection of technology and capital markets. I'd love to learn more about your journey at Morgan Stanley TMT and would deeply appreciate 15 minutes of your time for a virtual coffee.

Best,
Sarah`;

const SENT = `Hi Maya,

I'm a Brown CS sophomore looking at TMT and saw your team led the Q4 software deal — the structure was wild. I'm trying to learn how a banker actually thinks about a deal like that. Free for 15 minutes next week?

Sarah`;

export function NoAITells() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            No AI tells
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-[40px] leading-[1.05] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[64px]">
            What Alma writes vs what you send.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[#4A5260] md:text-base">
            Critic rejects generic drafts. You make it yours in two edits. The recruiter sees one email — yours.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-2xl border border-dashed border-[#C9BFA5] bg-[#F9F5EB] p-5 text-[#8A8674]">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em]">Original AI draft</p>
            <pre className="mt-3 whitespace-pre-wrap font-[family-name:var(--font-fraunces)] text-sm leading-relaxed">
              {AI_DRAFT}
            </pre>
          </div>
        </Reveal>
        <Reveal delay={200}>
          <div className="h-full alma-card rounded-2xl border border-[#2E5A88] p-5 text-[#14182A] shadow-[0_0_0_4px_rgba(46,90,136,.08)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#2E5A88]">What Sarah sent</p>
            <pre className="mt-3 whitespace-pre-wrap font-[family-name:var(--font-fraunces)] text-sm leading-relaxed">
              {SENT}
            </pre>
          </div>
        </Reveal>
      </div>

      <Reveal delay={300}>
        <p className="mx-auto mt-8 max-w-md text-center text-xs text-[#5C6472]">
          The original draft is what Alma&apos;s Correspondent produced. The version on the right is what the student sent — same person, same email, two minutes of editing. Backed by the <code className="text-[#1B3B5F]">drafts_pre_edit_ai_body</code> column.
        </p>
      </Reveal>
    </section>
  );
}
