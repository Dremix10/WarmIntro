const WORDS_PREFIX = [
  "The",
  "warm-intro",
  "engine",
  "for",
  "breaking",
  "into",
];

const STAGGER = 75; // ms between each word starting
const DURATION = 650; // ms each word takes to fully arrive
const START = 150; // ms before the first word appears

export function AnimatedHeadline() {
  const italicStart = START + WORDS_PREFIX.length * STAGGER;
  const dotStart = italicStart + 180;

  return (
    <h1 className="mt-6 max-w-4xl text-[34px] leading-[1.04] tracking-[-0.02em] font-[family-name:var(--font-fraunces)] text-[#14182A] sm:text-[44px] md:text-[88px] lg:text-[104px]">
      {WORDS_PREFIX.map((w, i) => (
        <span
          key={i}
          className="inline-block opacity-0"
          style={{
            animation: `fade-rise ${DURATION}ms cubic-bezier(.22,.75,.3,1) ${START + i * STAGGER}ms forwards`,
          }}
        >
          {w}&nbsp;
        </span>
      ))}
      <span className="inline-block sm:whitespace-nowrap">
        <span
          className="inline italic text-[#2E5A88] opacity-0"
          style={{
            animation: `fade-rise ${DURATION}ms cubic-bezier(.22,.75,.3,1) ${italicStart}ms forwards, glow-in 1400ms ease-out ${italicStart + 300}ms forwards`,
          }}
        >
          investment banking
        </span>
        <span
          className="inline text-[#2E5A88] opacity-0"
          style={{
            animation: `fade-rise ${DURATION}ms cubic-bezier(.22,.75,.3,1) ${dotStart}ms forwards`,
          }}
        >
          .
        </span>
      </span>
    </h1>
  );
}
