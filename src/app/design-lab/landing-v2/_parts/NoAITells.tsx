import { Reveal } from "@/components/Reveal";

// What most students get out of ChatGPT or a generic template — formal,
// hedged, generic. The bits the banker reads as AI: "I hope this finds you
// well", "passionate about", "deeply appreciate", "intersection of...".
const TYPICAL_AI = `Hi Maya,

I hope this email finds you well. I'm a sophomore at Brown studying CS, passionate about finance and excited about the intersection of technology and capital markets. I'd love to learn more about your journey at Morgan Stanley TMT and would deeply appreciate 15 minutes of your time for a virtual coffee.

Best,
Sarah`;

// What Alma writes — short, specific, sounds like a real sophomore.
const ALMA = `Hi Maya,

I'm a Brown CS sophomore looking at TMT and saw your team led the Q4 software deal. The structure was wild. I'm trying to learn how a banker actually thinks about a deal like that. Free for 15 minutes next week?

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
            Bankers spot AI tells in three seconds. <span className="italic text-[#2E5A88]">Alma sounds like you.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[#4A5260] md:text-base">
            Same student, same banker, same ask. The difference is whether the email reads like a template or like a real person.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-2xl border border-dashed border-[#C9BFA5] bg-[#F9F5EB] p-5 text-[#8A8674]">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em]">Typical AI cold email</p>
            <pre className="mt-3 whitespace-pre-wrap font-[family-name:var(--font-fraunces)] text-sm leading-relaxed">
              {TYPICAL_AI}
            </pre>
          </div>
        </Reveal>
        <Reveal delay={200}>
          <div className="h-full alma-card rounded-2xl border border-[#2E5A88] p-5 text-[#14182A] shadow-[0_0_0_4px_rgba(46,90,136,.08)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#2E5A88]">What Alma sends</p>
            <pre className="mt-3 whitespace-pre-wrap font-[family-name:var(--font-fraunces)] text-sm leading-relaxed">
              {ALMA}
            </pre>
          </div>
        </Reveal>
      </div>

      <Reveal delay={300}>
        <p className="mx-auto mt-8 max-w-md text-center text-xs text-[#5C6472]">
          Specific deal reference. Honest framing. One concrete ask. No formal hedging. Reads like a sophomore who actually noticed something, not a template.
        </p>
      </Reveal>
    </section>
  );
}
