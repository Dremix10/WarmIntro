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

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function StepRow({
  step,
  idx,
  isLast,
  onUnfold,
}: {
  step: Step;
  idx: number;
  isLast: boolean;
  onUnfold: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [unfolded, setUnfolded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setUnfolded(true);
      onUnfold(idx);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setUnfolded(true);
          onUnfold(idx);
          observer.disconnect();
        }
      },
      { threshold: 0.35, rootMargin: "0px 0px -15% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [idx, onUnfold]);

  const isReject = step.variant === "reject";
  const isApprove = step.variant === "approve";

  return (
    <div
      ref={ref}
      data-unfolded={unfolded}
      className="agent-row group relative grid grid-cols-[56px_1fr] gap-4 md:grid-cols-[88px_1fr] md:gap-7"
    >
      {/* Rail node + connector */}
      <div className="relative flex flex-col items-center">
        <div
          className={
            "agent-rail-node relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-fraunces)] text-base transition-all duration-500 md:h-14 md:w-14 md:text-lg " +
            (unfolded
              ? "bg-[#1B3B5F] text-white shadow-[0_8px_24px_-8px_rgba(27,59,95,.45)]"
              : "border border-[#D9CFB5] bg-white text-[#8A8674]")
          }
        >
          {pad(idx + 1)}
        </div>
        {!isLast && (
          <span
            className={
              "agent-rail-connector absolute left-1/2 top-12 -translate-x-1/2 w-px transition-colors duration-700 md:top-14 " +
              (unfolded ? "bg-[#1B3B5F]/35" : "bg-[#D9CFB5]")
            }
            style={{ height: "calc(100% - 3rem)" }}
            aria-hidden
          />
        )}
      </div>

      {/* Content card */}
      <div className="agent-row-content alma-card rounded-2xl border border-[#D9CFB5] p-5 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#2E5A88]">
            {step.eyebrow}
          </p>
          {isReject && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#991B1B]">
              ✗ rejected
            </span>
          )}
          {isApprove && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#065F46]">
              ✓ approved
            </span>
          )}
        </div>
        <h3 className="mt-2 text-2xl leading-[1.15] tracking-[-0.01em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[28px]">
          {step.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-[#4A5260] md:text-base">{step.body}</p>
      </div>
    </div>
  );
}

export function AgentLoop() {
  const [unfoldedSet, setUnfoldedSet] = useState<Set<number>>(new Set([0]));

  const handleUnfold = (i: number) => {
    setUnfoldedSet((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  };

  const progress = unfoldedSet.size / STEPS.length;

  return (
    <section
      className="relative mx-auto max-w-4xl px-6 py-24 md:py-32"
      aria-label="The agent loop, one banker through the pipeline"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
          One banker, six agents
        </p>
        <h2 className="mt-4 text-[40px] leading-[1.05] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[64px]">
          The loop, in motion.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#4A5260] md:text-lg">
          Watch one Brown sophomore reach a Morgan Stanley VP. Seven steps, six agents, one inbox.
        </p>
      </div>

      <div className="mx-auto mt-12 flex max-w-md items-center gap-3">
        <span className="font-mono text-xs tabular-nums text-[#8A8674]">
          {pad(unfoldedSet.size)} / {pad(STEPS.length)}
        </span>
        <div className="h-[2px] flex-1 overflow-hidden rounded-sm bg-[#D9CFB5]">
          <div
            className="h-full bg-[#1B3B5F] transition-[width] duration-700 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <div className="relative mt-14 space-y-6 md:space-y-7">
        {STEPS.map((step, i) => (
          <StepRow
            key={i}
            step={step}
            idx={i}
            isLast={i === STEPS.length - 1}
            onUnfold={handleUnfold}
          />
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-md text-center text-xs text-[#8A8674]">
        Planner orchestrates this loop deterministically every fifteen minutes. Curator runs in the
        background, keeping the banker graph fresh.
      </p>
    </section>
  );
}
