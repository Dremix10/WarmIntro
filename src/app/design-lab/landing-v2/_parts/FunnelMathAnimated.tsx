"use client";

import { useEffect, useRef, useState } from "react";

// Staggered funnel chart: each bar rises, its number counts up, and its label
// fades in as a single unit. Bars sequence left-to-right on a 350ms stagger.
//
// Scroll-triggered: when the chart enters the viewport (30% visible) the
// sequence fires. If the user lands past the chart (refresh at bottom), the
// component jumps to the final state instantly — no animation missed.

const STAGES = [
  { value: 120, label: "calls sent", sub: "networking reaches" },
  { value: 40, label: "responses", sub: "~33% reply rate" },
  { value: 20, label: "coffees", sub: "warm conversations" },
  { value: 8, label: "referrals", sub: "a banker vouches" },
  { value: 4, label: "first rounds", sub: "HireVue / phone" },
  { value: 2, label: "superdays", sub: "the final 6 hours" },
  { value: 1, label: "offer", sub: "yours" },
];

const MAX = 120;
const STAGGER = 350; // ms between each bar starting
const GROW_DURATION = 800; // ms for each bar to reach full height + number
const EASING = "cubic-bezier(.22,.75,.3,1)";

type State = "off" | "on" | "instant";

export function FunnelMathAnimated() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>("off");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setState("instant");
      return;
    }

    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;

    if (rect.bottom < 0) {
      setState("instant");
      return;
    }
    if (rect.top < vh * 0.75) {
      setState("on");
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
          setState("on");
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="rounded-3xl border border-[#D9CFB5] bg-white p-5 sm:p-6 md:p-8"
    >
      <div className="flex flex-col gap-1.5 sm:hidden">
        {STAGES.map((s, i) => (
          <FunnelRowMobile
            key={s.label}
            stage={s}
            state={state}
            delay={i * 200}
            isLast={i === STAGES.length - 1}
          />
        ))}
      </div>

      <div className="hidden items-end justify-between gap-1 sm:flex sm:gap-2 md:gap-3">
        {STAGES.map((s, i) => (
          <AnimatedBar
            key={s.label}
            stage={s}
            state={state}
            delay={i * STAGGER}
            isLast={i === STAGES.length - 1}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#ECE5D0] pt-4 text-[11px] text-[#5C6472] sm:mt-6 sm:pt-5 sm:text-xs">
        <p>Based on the 2026 BB + EB cycle, Brown &amp; Rice cohorts</p>
        <p className="hidden font-medium text-[#C86B4F] sm:block">
          → that&rsquo;s ~8 calls/week for 16 weeks
        </p>
      </div>
    </div>
  );
}

type Stage = (typeof STAGES)[number];

function FunnelRowMobile({
  stage,
  state,
  delay,
  isLast,
}: {
  stage: Stage;
  state: State;
  delay: number;
  isLast: boolean;
}) {
  const [count, setCount] = useState(state === "instant" ? stage.value : 0);
  const [grown, setGrown] = useState(state === "instant");

  useEffect(() => {
    let rafId = 0;
    if (state === "off") {
      const resetTimer = window.setTimeout(() => {
        setCount(0);
        setGrown(false);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
    if (state === "instant") {
      const instantTimer = window.setTimeout(() => {
        setCount(stage.value);
        setGrown(true);
      }, 0);
      return () => window.clearTimeout(instantTimer);
    }

    const timer = window.setTimeout(() => {
      setGrown(true);
      const dur = 600;
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min((t - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setCount(Math.round(stage.value * eased));
        if (p < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [state, delay, stage.value]);

  const widthPct = (stage.value / MAX) * 100;
  const barColor = isLast ? "bg-[#C86B4F]" : stage.value >= 40 ? "bg-[#1B3B5F]" : "bg-[#2E5A88]";
  const numColor = isLast ? "text-[#C86B4F]" : "text-[#14182A]";

  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`w-9 shrink-0 text-right font-[family-name:var(--font-fraunces)] tabular-nums leading-none ${
          isLast ? "text-2xl" : "text-xl"
        } ${numColor}`}
      >
        {count}
      </span>
      <div className="h-3.5 flex-1 overflow-hidden rounded-md bg-[#F4EDDB]">
        <div
          className={`h-full rounded-md ${barColor} transition-[width] ease-out`}
          style={{
            width: grown ? `${widthPct}%` : "0%",
            transitionDuration: "700ms",
          }}
        />
      </div>
      <span className="w-[88px] shrink-0 text-[10px] font-medium uppercase leading-tight tracking-[0.08em] text-[#14182A]/80">
        {stage.label}
      </span>
    </div>
  );
}

function AnimatedBar({
  stage,
  state,
  delay,
  isLast,
}: {
  stage: Stage;
  state: State;
  delay: number;
  isLast: boolean;
}) {
  const [grown, setGrown] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (state === "off") {
      setGrown(false);
      setCount(0);
      return;
    }

    if (state === "instant") {
      setGrown(true);
      setCount(stage.value);
      return;
    }

    // state === "on" — wait `delay` ms, then grow + count up.
    const timer = setTimeout(() => {
      setGrown(true);
      const start = performance.now();
      let rafId = 0;
      const tick = (t: number) => {
        const p = Math.min((t - start) / GROW_DURATION, 1);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
        setCount(Math.round(eased * stage.value));
        if (p < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    }, delay);

    return () => clearTimeout(timer);
  }, [state, delay, stage.value]);

  const finalHeight = Math.max((stage.value / MAX) * 220, 18);
  const barHeight = grown ? finalHeight : 0;
  const animated = state === "on";

  const numberColor = isLast ? "text-[#C86B4F]" : "text-[#14182A]";
  const barClass = isLast
    ? "bg-gradient-to-t from-[#A85535] to-[#E89872]"
    : "bg-gradient-to-t from-[#1B3B5F] to-[#3F6FA3]";

  const barStyle: React.CSSProperties = {
    height: `${barHeight}px`,
    transition: animated
      ? `height ${GROW_DURATION}ms ${EASING}`
      : "none",
    willChange: "height",
  };

  const labelStyle: React.CSSProperties = {
    opacity: grown ? 1 : 0,
    transform: grown ? "translateY(0)" : "translateY(6px)",
    transition: animated
      ? `opacity 500ms ${EASING} 150ms, transform 500ms ${EASING} 150ms`
      : "none",
  };

  const subStyle: React.CSSProperties = {
    opacity: grown ? 1 : 0,
    transform: grown ? "translateY(0)" : "translateY(6px)",
    transition: animated
      ? `opacity 500ms ${EASING} 250ms, transform 500ms ${EASING} 250ms`
      : "none",
  };

  return (
    <div className="flex flex-1 flex-col items-center">
      <p
        className={`mb-2 font-[family-name:var(--font-fraunces)] tabular-nums leading-none sm:mb-3 ${
          isLast ? "text-2xl sm:text-3xl md:text-4xl" : "text-xl sm:text-2xl md:text-3xl"
        } ${numberColor}`}
      >
        {count}
      </p>
      <div className="flex h-[160px] w-full items-end sm:h-[200px] md:h-[220px]">
        <div
          className={`mx-auto w-full max-w-[44px] rounded-t-lg ${barClass}`}
          style={barStyle}
        />
      </div>
      <p
        className="mt-2 text-center text-[8px] font-medium uppercase tracking-[0.1em] text-[#14182A] sm:mt-3 sm:text-[10px] sm:tracking-[0.14em]"
        style={labelStyle}
      >
        {stage.label}
      </p>
      <p
        className="mt-0.5 hidden text-center text-[10px] text-[#5C6472] sm:block"
        style={subStyle}
      >
        {stage.sub}
      </p>
    </div>
  );
}
