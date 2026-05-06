"use client";

import { useEffect, useRef, useState } from "react";

type Variant = "default" | "draft" | "approve";

type Step = {
  shortLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  variant?: Variant;
};

// Four visitor-facing steps. Internal multi-agent architecture (the
// revise loop, the per-axis Critic, the cross-user signal flywheel) is
// intentionally not surfaced here — that's IP we don't hand to readers
// of the marketing page.
const STEPS: Step[] = [
  {
    shortLabel: "Match",
    eyebrow: "Step 1 · reply-likely match",
    title: "Alma finds someone worth emailing",
    body: "Jordan Lee is in our private recruiting database: same school, studied engineering before banking, works with software companies, and has replied to student cold emails before.",
  },
  {
    shortLabel: "Draft",
    eyebrow: "Step 2 · in your voice",
    title: "A curious beginner email, not pretend-expert finance talk",
    body: "Hi Jordan, I'm an architecture major starting to learn how students break into banking. I saw you studied engineering before moving into a group that works with software companies, and I wanted to ask how you explained a non-finance background in recruiting. Would 15 minutes by phone next week work?",
    variant: "draft",
  },
  {
    shortLabel: "Approve",
    eyebrow: "Step 3 · from your Gmail",
    title: "You approve before anything sends",
    body: "Alma puts the draft in Gmail. You can edit the wording, skip the banker, or approve it. The first version always stays under your control.",
    variant: "approve",
  },
  {
    shortLabel: "Book",
    eyebrow: "Step 4 · 2 days later",
    title: "Reply received",
    body: "\"Tuesday 4pm works.\" Alma moves the banker from Sent to Coffee Chat and reminds you what to ask before the call.",
  },
];

// ms each step holds before auto-advancing to the next.
const STEP_HOLD_MS = [1800, 2400, 1900, 2200];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function useReducedMotion() {
  const [reduced, setReduced] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function AgentLoop() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [userOverride, setUserOverride] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  // Trigger the loop only when the user has actually scrolled the section
  // into the upper part of the viewport. rootMargin shrinks the virtual
  // viewport from the bottom by 30%, so the section's top must cross above
  // the lower 30% before the observer fires. Once started, the timer drives
  // step changes — scroll speed has no effect.
  useEffect(() => {
    const sec = sectionRef.current;
    if (!sec || started) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -30% 0px" }
    );
    observer.observe(sec);
    return () => observer.disconnect();
  }, [started]);

  // Auto-advance through the steps on a per-step timer. Stops if the user
  // clicks a chip (override) or after the last step.
  useEffect(() => {
    if (!started || userOverride || reducedMotion) return;
    if (activeIndex >= STEPS.length - 1) return;
    const hold = STEP_HOLD_MS[activeIndex] ?? 2000;
    const id = window.setTimeout(() => {
      setActiveIndex((prev) => (prev === activeIndex ? prev + 1 : prev));
    }, hold);
    return () => window.clearTimeout(id);
  }, [activeIndex, started, userOverride, reducedMotion]);

  // Reduced-motion: snap to final step on viewport entry.
  useEffect(() => {
    if (!started || !reducedMotion) return;
    const id = window.setTimeout(() => {
      setActiveIndex(STEPS.length - 1);
    }, 0);
    return () => window.clearTimeout(id);
  }, [started, reducedMotion]);

  const handleSelect = (i: number) => {
    setUserOverride(true);
    setActiveIndex(i);
  };

  const handleReplay = () => {
    setUserOverride(false);
    setActiveIndex(0);
  };

  const handleSwipeEnd = (x: number) => {
    if (touchStartX.current === null) return;
    const delta = x - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 42) return;
    if (delta < 0) {
      handleSelect(Math.min(STEPS.length - 1, activeIndex + 1));
    } else {
      handleSelect(Math.max(0, activeIndex - 1));
    }
  };

  const step = STEPS[activeIndex];
  const atEnd = activeIndex === STEPS.length - 1;

  return (
    <section
      id="how"
      ref={sectionRef}
      className="relative"
      aria-label="One banker, end to end"
    >
      <div className="mx-auto flex max-w-6xl flex-col px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            One banker, end to end
          </p>
          <h2 className="mt-4 text-[40px] leading-[1.05] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[64px]">
            From &ldquo;who should I email?&rdquo; to coffee chat.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#4A5260]">
            Swipe or tap through the path. Alma turns a bank target into a real
            person, writes the email, and keeps you in charge of what leaves your inbox.
          </p>
        </div>

        {/* Horizontal pipeline — tap/swipe any chip to jump */}
        <div className="agent-pipeline scrollbar-hidden mx-auto mt-10 flex w-full max-w-5xl snap-x items-stretch gap-3 overflow-x-auto pb-2 md:mt-12 md:overflow-visible md:pb-0">
          {STEPS.map((s, i) => {
            const state =
              i < activeIndex ? "done" : i === activeIndex ? "active" : "folded";
            return (
              <button
                key={i}
                type="button"
                data-state={state}
                onClick={() => handleSelect(i)}
                className="agent-chip relative flex min-w-[132px] flex-1 snap-start cursor-pointer flex-col rounded-xl border border-[#D9CFB5] bg-white p-3 text-left"
                aria-label={`Jump to step ${i + 1}: ${s.shortLabel}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[10px] tracking-[0.08em] text-[#8A8674]">
                    {pad(i + 1)}
                  </span>
                  {s.variant === "approve" && (
                    <span className="text-[10px] font-bold text-[#065F46]">✓</span>
                  )}
                </div>
                <p className="mt-3 text-base font-[family-name:var(--font-fraunces)] leading-tight text-[#14182A]">
                  {s.shortLabel}
                </p>
              </button>
            );
          })}
        </div>

        {/* Progress bar + nav */}
        <div className="mx-auto mt-4 flex w-full max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={() => handleSelect(Math.max(0, activeIndex - 1))}
            disabled={activeIndex === 0}
            aria-label="Previous step"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D9CFB5] bg-white text-[#1B3B5F] transition-colors hover:border-[#2E5A88] disabled:cursor-not-allowed disabled:opacity-30"
          >
            ‹
          </button>
          <span className="shrink-0 font-mono text-xs tabular-nums text-[#8A8674]">
            {pad(activeIndex + 1)} / {pad(STEPS.length)}
          </span>
          <div className="h-[2px] flex-1 overflow-hidden rounded-sm bg-[#D9CFB5]">
            <div
              className="h-full bg-[#1B3B5F] transition-[width] duration-500 ease-out"
              style={{ width: `${((activeIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          {atEnd ? (
            <button
              type="button"
              onClick={handleReplay}
              aria-label="Replay from start"
              className="flex h-8 shrink-0 items-center justify-center rounded-full bg-[#1B3B5F] px-3 text-xs font-semibold text-white hover:bg-[#2E5A88]"
            >
              ↺ Replay
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSelect(Math.min(STEPS.length - 1, activeIndex + 1))}
              aria-label="Next step"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1B3B5F] text-white transition-colors hover:bg-[#2E5A88]"
            >
              ›
            </button>
          )}
        </div>

        {/* Focus panel — full content for the active step */}
        <div className="mx-auto mt-8 w-full max-w-3xl">
          <div
            key={activeIndex}
            className="agent-focus alma-card rounded-2xl border border-[#D9CFB5] p-6 md:p-8"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              handleSwipeEnd(e.changedTouches[0]?.clientX ?? 0);
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#2E5A88]">
                {step.eyebrow}
              </p>
              {step.variant === "approve" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#065F46]">
                  ✓ ready
                </span>
              )}
            </div>
            <h3 className="mt-3 text-2xl leading-[1.15] tracking-[-0.01em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-3xl">
              {step.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#4A5260] md:text-base">{step.body}</p>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-md text-center text-xs text-[#8A8674]">
          This is the loop Alma repeats: find a reply-likely person, write a believable
          ask, get your approval, then keep track of the reply.
        </p>
      </div>
    </section>
  );
}
