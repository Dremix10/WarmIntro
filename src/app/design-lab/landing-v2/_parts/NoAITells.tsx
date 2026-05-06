import { Reveal } from "@/components/Reveal";

// What most students get out of ChatGPT or a generic template — formal,
// hedged, generic. The bits the banker reads as AI: "I hope this finds you
// well", "passionate about", "deeply appreciate", "intersection of...".
const TYPICAL_AI = `Hi Maya,

I hope this email finds you well. I'm a sophomore studying CS, passionate about finance and excited about the intersection of technology and capital markets. I'd love to learn more about your journey at Morgan Stanley TMT and would deeply appreciate 15 minutes of your time for a virtual coffee.

Best,
Sarah`;

// What Alma writes — short, specific, sounds like a real sophomore.
const ALMA = `Hi Maya,

I'm a sophomore studying Applied Mathematics-Computer Science and looking at TMT. I saw your team led the Q4 software deal, and I'm trying to understand how bankers think through retention and product risk in a process like that.

Would 15 minutes by phone next week work?

Sarah`;

export function NoAITells() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            No AI tells
          </p>
          <h2 className="mx-auto mt-3 max-w-3xl text-[40px] leading-[1.08] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[60px]">
            <span className="block">Bankers spot AI tells in three seconds.</span>
            <span className="block italic text-[#2E5A88]">Alma sounds like you.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[#4A5260] md:text-base">
            Same student, same banker, same ask. The difference is whether the email reads like a template or like a real person.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 items-center gap-4 md:grid-cols-[1fr_92px_1fr] md:gap-6">
        <Reveal>
          <div className="h-full rounded-2xl border border-dashed border-[#C9BFA5] bg-[#F9F5EB] p-5 text-[#8A8674]">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em]">Typical AI cold email</p>
            <pre className="mt-3 whitespace-pre-wrap font-[family-name:var(--font-fraunces)] text-sm leading-relaxed">
              {TYPICAL_AI}
            </pre>
          </div>
        </Reveal>

        {/* Leap arc — sits in its own column between the cards on desktop;
            hidden on mobile (cards stack). */}
        <Reveal delay={120}>
          <div className="hidden flex-col items-center justify-center md:flex" aria-hidden>
            <svg width="92" height="86" viewBox="0 0 92 86" fill="none">
              <defs>
                <marker
                  id="leap-arrow"
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 Z" fill="#1B3B5F" />
                </marker>
              </defs>
              <path
                d="M 6 56 Q 46 -6 86 56"
                stroke="#1B3B5F"
                strokeWidth="2"
                strokeDasharray="5 4"
                fill="none"
                strokeLinecap="round"
                markerEnd="url(#leap-arrow)"
              />
              <text
                x="46"
                y="80"
                textAnchor="middle"
                fontSize="16"
                fill="#1B3B5F"
                fontFamily="var(--font-fraunces)"
                fontStyle="italic"
              >
                alma
              </text>
            </svg>
          </div>
        </Reveal>

        <Reveal delay={240}>
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
          Specific deal reference. Real student context. One concrete ask. No hedging. Reads like a sophomore who actually noticed something, not a template.
        </p>
      </Reveal>
    </section>
  );
}
