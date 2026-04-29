"use client";

import { useEffect, useRef, useState } from "react";

type AgentId = "researcher" | "correspondent" | "critic" | "watcher" | "curator";

type Variant = "default" | "draft" | "reject" | "approve";

type Step = {
  agent: AgentId;
  eyebrow: string;
  title: string;
  body: string;
  variant?: Variant;
};

const STEPS: Step[] = [
  {
    agent: "researcher",
    eyebrow: "Researcher · just now",
    title: "Found Maya Chen, VP TMT, Morgan Stanley",
    body: "Brown CS '15 · same-school priority on · warmth 88 · public Q4 2025 software deal · most recent post 2 days ago",
  },
  {
    agent: "correspondent",
    eyebrow: "Correspondent · drafting",
    title: "Draft v1",
    body: "Hi Maya, I hope this email finds you well. I'm a sophomore at Brown studying CS, passionate about finance and excited about the intersection of technology and capital markets. I'd love to learn more about your journey at Morgan Stanley TMT.",
    variant: "draft",
  },
  {
    agent: "critic",
    eyebrow: "Critic · reviewing v1",
    title: "Rejected — too generic",
    body: "Voice: too formal. Specificity: missing the recent deal reference. Try again.",
    variant: "reject",
  },
  {
    agent: "correspondent",
    eyebrow: "Correspondent · revised",
    title: "Draft v2",
    body: "Hi Maya, I'm a Brown CS sophomore looking at TMT and saw your team led the Q4 software deal. I'm trying to learn how a banker actually thinks about a deal like that. Free for 15 minutes next week?",
    variant: "draft",
  },
  {
    agent: "critic",
    eyebrow: "Critic · reviewing v2",
    title: "Approved",
    body: "Voice ✓ · Specificity ✓ · Arc ✓ · Ask ✓. Ready to send.",
    variant: "approve",
  },
  {
    agent: "watcher",
    eyebrow: "Watcher · 2 days later",
    title: "Reply received",
    body: "Maya: \"Tuesday 4pm work for you?\" → Stage advanced to Coffee.",
  },
  {
    agent: "curator",
    eyebrow: "Curator · background",
    title: "Updated Maya's profile + recent_deal signal",
    body: "Tomorrow's queue is sharper, for everyone using Alma.",
  },
];

const AGENTS: { id: AgentId; label: string }[] = [
  { id: "researcher", label: "Researcher" },
  { id: "correspondent", label: "Correspondent" },
  { id: "critic", label: "Critic" },
  { id: "watcher", label: "Watcher" },
  { id: "curator", label: "Curator" },
];

function useReducedMotion() {
  // Initialise from the media query synchronously so there's no flash.
  // typeof window guard keeps SSR safe; the component is "use client" so
  // this always runs in the browser, but the guard satisfies strict mode.
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

  // Reduced-motion fallback: one-shot autoplay through the steps when section enters viewport.
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
      // Pinned-scroll range: from when section top hits viewport top
      // to when section bottom is one viewport above viewport top.
      const pinTop = -rect.top; // 0 when section just hit top
      const pinRange = rect.height - vh; // total scroll distance available within the pinned section
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
  const completed = new Set<AgentId>();
  for (let i = 0; i < activeIndex; i++) completed.add(STEPS[i].agent);

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ minHeight: "160vh" }}
      aria-label="The agent loop, one banker through the pipeline"
    >
      <div className="sticky top-20 mx-auto max-w-5xl px-6 py-12">
        <div className="mb-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            One banker, six agents
          </p>
          <h2 className="mt-3 text-[40px] leading-[1.05] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[64px]">
            The loop, in motion.
          </h2>
        </div>

        {/* Agent badges row */}
        <div className="mt-10 flex flex-wrap items-center gap-2">
          {AGENTS.map((a, i) => {
            const isActive = a.id === step.agent;
            const isDone = completed.has(a.id);
            return (
              <span key={a.id} className="contents">
                <span
                  className={
                    "rounded-md px-3 py-2 text-xs font-semibold transition-colors duration-300 " +
                    (isActive
                      ? "bg-[#1B3B5F] text-white"
                      : isDone
                      ? "bg-[#1B3B5F]/15 text-[#1B3B5F] border border-[#1B3B5F]/25"
                      : "border border-[#D9CFB5] bg-white text-[#5C6472]")
                  }
                >
                  {a.label}
                </span>
                {i < AGENTS.length - 1 && (
                  <span className="hidden h-px flex-1 bg-[#D9CFB5] sm:block" aria-hidden />
                )}
              </span>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-[3px] overflow-hidden rounded-sm bg-[#D9CFB5]">
          <div
            className="h-full bg-[#1B3B5F] transition-[width] duration-300"
            style={{ width: `${((activeIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content card */}
        <div className="mt-6 min-h-[220px] alma-card rounded-2xl border border-[#D9CFB5] p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#2E5A88]">
            {step.eyebrow}
          </div>
          <div className="mt-2 text-xl text-[#14182A] font-[family-name:var(--font-fraunces)]">
            {step.title}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#4A5260]">{step.body}</p>
          {step.variant === "reject" && (
            <div className="mt-4 inline-flex items-center gap-2 rounded bg-[#FEE2E2] px-2 py-1 text-xs font-semibold text-[#991B1B]">
              ✗ Reject · revise required
            </div>
          )}
          {step.variant === "approve" && (
            <div className="mt-4 inline-flex items-center gap-2 rounded bg-[#D1FAE5] px-2 py-1 text-xs font-semibold text-[#065F46]">
              ✓ Approved · ready to send
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-[#8A8674]">
          Planner orchestrates this loop deterministically every fifteen minutes. Curator runs in the background, keeping the banker graph fresh.
        </p>
      </div>
    </section>
  );
}
