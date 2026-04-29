"use client";

import { useEffect, useRef, useState } from "react";

type AgentId = "researcher" | "correspondent" | "critic" | "watcher" | "curator";

type Variant = "default" | "draft" | "reject" | "approve";

type Step = {
  agent: AgentId;
  shortLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  variant?: Variant;
};

const STEPS: Step[] = [
  {
    agent: "researcher",
    shortLabel: "Find",
    eyebrow: "Researcher · just now",
    title: "Found Maya Chen, VP TMT, Morgan Stanley",
    body: "Brown CS '15 · same-school priority on · warmth 88 · public Q4 2025 software deal · most recent post 2 days ago.",
  },
  {
    agent: "correspondent",
    shortLabel: "Draft v1",
    eyebrow: "Correspondent · drafting",
    title: "First pass at the email",
    body: "Hi Maya, I hope this email finds you well. I'm a sophomore at Brown studying CS, passionate about finance and excited about the intersection of technology and capital markets. I'd love to learn more about your journey at Morgan Stanley TMT.",
    variant: "draft",
  },
  {
    agent: "critic",
    shortLabel: "Reject",
    eyebrow: "Critic · reviewing v1",
    title: "Rejected — too generic",
    body: "Voice: too formal. Specificity: missing the recent deal reference. Send back to Correspondent for a revise.",
    variant: "reject",
  },
  {
    agent: "correspondent",
    shortLabel: "Draft v2",
    eyebrow: "Correspondent · revised",
    title: "Tighter, in the student's voice",
    body: "Hi Maya, I'm a Brown CS sophomore looking at TMT and saw your team led the Q4 software deal. I'm trying to learn how a banker actually thinks about a deal like that. Free for 15 minutes next week?",
    variant: "draft",
  },
  {
    agent: "critic",
    shortLabel: "Approve",
    eyebrow: "Critic · reviewing v2",
    title: "Approved on all four axes",
    body: "Voice ✓ · Specificity ✓ · Arc ✓ · Ask ✓. Ready to send from Gmail at the user's preferred time.",
    variant: "approve",
  },
  {
    agent: "watcher",
    shortLabel: "Reply",
    eyebrow: "Watcher · 2 days later",
    title: "Reply received from Maya",
    body: "\"Tuesday 4pm work for you?\" Stage advanced from Sent → Coffee. Calendar invite drafted automatically.",
  },
  {
    agent: "curator",
    shortLabel: "Learn",
    eyebrow: "Curator · background",
    title: "Profile + signal updated",
    body: "Maya's profile gets the recent_deal signal. Tomorrow's queue is sharper, for everyone using Alma.",
  },
];

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
  const reducedMotion = useReducedMotion();

  // Reduced-motion fallback: auto-advance once when section enters viewport.
  useEffect(() => {
    if (!reducedMotion) return;
    const sec = sectionRef.current;
    if (!sec) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          STEPS.forEach((_, i) => {
            window.setTimeout(() => setActiveIndex(i), i * 350);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(sec);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // Scroll-progress driven (default).
  useEffect(() => {
    if (reducedMotion) return;
    let rafId = 0;
    const update = () => {
      rafId = 0;
      const sec = sectionRef.current;
      if (!sec) return;
      const rect = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      const pinTop = -rect.top;
      const pinRange = rect.height - vh;
      const raw = pinRange > 0 ? pinTop / pinRange : 0;
      const progress = Math.max(0, Math.min(1, raw));
      const idx = Math.min(
        STEPS.length - 1,
        Math.max(0, Math.floor(progress * STEPS.length))
      );
      setActiveIndex((prev) => (prev === idx ? prev : idx));
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [reducedMotion]);

  const step = STEPS[activeIndex];

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ minHeight: "180vh" }}
      aria-label="The agent loop, one banker through the pipeline"
    >
      <div className="sticky top-16 mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-center px-6 py-10 md:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            One banker, six agents
          </p>
          <h2 className="mt-4 text-[40px] leading-[1.05] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[64px]">
            The loop, in motion.
          </h2>
        </div>

        {/* Horizontal pipeline of step chips */}
        <div className="agent-pipeline mx-auto mt-12 flex w-full max-w-5xl items-stretch gap-2 overflow-x-auto pb-2 md:gap-3 md:overflow-visible">
          {STEPS.map((s, i) => {
            const state =
              i < activeIndex ? "done" : i === activeIndex ? "active" : "folded";
            return (
              <div
                key={i}
                data-state={state}
                className="agent-chip relative flex w-[122px] shrink-0 flex-col rounded-xl border border-[#D9CFB5] bg-white p-3 md:w-auto md:flex-1"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[10px] tracking-[0.08em] text-[#8A8674]">
                    {pad(i + 1)}
                  </span>
                  {s.variant === "reject" && (
                    <span className="text-[10px] font-bold text-[#991B1B]">✗</span>
                  )}
                  {s.variant === "approve" && (
                    <span className="text-[10px] font-bold text-[#065F46]">✓</span>
                  )}
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#2E5A88]">
                  {s.agent}
                </p>
                <p className="mt-0.5 text-sm font-[family-name:var(--font-fraunces)] leading-tight text-[#14182A]">
                  {s.shortLabel}
                </p>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mx-auto mt-3 flex w-full max-w-5xl items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-[#8A8674]">
            {pad(activeIndex + 1)} / {pad(STEPS.length)}
          </span>
          <div className="h-[2px] flex-1 overflow-hidden rounded-sm bg-[#D9CFB5]">
            <div
              className="h-full bg-[#1B3B5F] transition-[width] duration-500 ease-out"
              style={{ width: `${((activeIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Focus panel — full content for the active step */}
        <div className="mx-auto mt-8 w-full max-w-3xl">
          <div
            key={activeIndex}
            className="agent-focus alma-card rounded-2xl border border-[#D9CFB5] p-6 md:p-8"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#2E5A88]">
                {step.eyebrow}
              </p>
              {step.variant === "reject" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#991B1B]">
                  ✗ rejected
                </span>
              )}
              {step.variant === "approve" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#065F46]">
                  ✓ approved
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
          Planner orchestrates this loop deterministically every fifteen minutes. Curator runs in the
          background, keeping the banker graph fresh.
        </p>
      </div>
    </section>
  );
}
