const WORDS_PREFIX = [
  "The",
  "warm-intro",
  "engine",
  "for",
  "students",
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
    <h1 className="mt-5 max-w-3xl text-5xl leading-[1.02] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[68px]">
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
      <span
        className="inline-block italic text-[#2E5A88] opacity-0"
        style={{
          animation: `fade-rise ${DURATION}ms cubic-bezier(.22,.75,.3,1) ${italicStart}ms forwards, glow-in 1400ms ease-out ${italicStart + 300}ms forwards`,
        }}
      >
        investment banking
      </span>
      <span
        className="inline-block opacity-0"
        style={{
          animation: `fade-rise ${DURATION}ms cubic-bezier(.22,.75,.3,1) ${dotStart}ms forwards`,
        }}
      >
        .
      </span>
    </h1>
  );
}
