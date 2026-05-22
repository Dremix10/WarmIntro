"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "review" | "learn" | "autopilot";

const MODES: { id: Mode; label: string; subtitle: string; description: string }[] = [
  {
    id: "review",
    label: "Review first",
    subtitle: "one-minute check",
    description:
      "Alma finds reply-likely alumni and bankers, writes the email, and places it in Gmail. You approve, edit, or skip before anything sends.",
  },
  {
    id: "learn",
    label: "Learns you",
    subtitle: "edits matter",
    description:
      "Every wording change, skip, reply, and preference tunes the next batch toward your voice and the kinds of people you actually want to meet.",
  },
  {
    id: "autopilot",
    label: "Autopilot later",
    subtitle: "optional later",
    description:
      "When the system earns your trust, routine outreach can run with less review and a clear digest. You can always move back to review-first.",
  },
];

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

export function TrustGradient() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const reducedMotion = useReducedMotion();

  // Reduced-motion fallback: auto-advance through modes once on viewport entry,
  // then settle on Drafts first.
  useEffect(() => {
    if (!reducedMotion) return;
    const sec = sectionRef.current;
    if (!sec) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          window.setTimeout(() => setActiveIdx(1), 350);
          window.setTimeout(() => setActiveIdx(2), 700);
          window.setTimeout(() => setActiveIdx(0), 1100);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(sec);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // No scroll listeners. The auto-play sequence above handles the demo
  // pass-through, then user clicks (handled in onClick below) take over.

  const current = MODES[activeIdx];

  const handleClick = (idx: number) => {
    setActiveIdx(idx);
  };

  return (
    <section
      ref={sectionRef}
      className="relative"
      aria-label="Review and automation settings"
    >
      <div className="mx-auto max-w-3xl px-6 py-24 md:py-32">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            Review less as trust builds
          </p>
          <h2 className="mt-3 text-[40px] leading-[1.08] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[64px]">
            <span className="block">Start with a quick check.</span>
            <span className="block italic text-[#2E5A88]">Let Alma take more once it proves itself.</span>
          </h2>
        </div>

        <div
          className="relative mx-auto mt-10 flex w-full items-center rounded-full border border-[#D9CFB5] bg-white p-2"
          role="radiogroup"
          aria-label="Review mode"
        >
          <span
            className="absolute top-2 bottom-2 rounded-full bg-[#1B3B5F] shadow-[0_8px_24px_-8px_rgba(27,59,95,.45)] transition-transform duration-500 ease-out"
            aria-hidden
            style={{
              left: "0.5rem",
              width: "calc((100% - 1rem) / 3)",
              transform: `translateX(${activeIdx * 100}%)`,
            }}
          />
          {MODES.map((m, i) => {
            const active = i === activeIdx;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => handleClick(i)}
                className={
                  "relative z-10 flex-1 rounded-full px-4 py-3 text-center text-sm font-semibold transition-colors duration-300 " +
                  (active ? "text-white" : "text-[#5C6472] hover:text-[#1B3B5F]")
                }
              >
                <div>{m.label}</div>
                <div
                  className={
                    "mt-1 text-[10px] font-normal " + (active ? "text-white/80" : "text-[#8A8674]")
                  }
                >
                  {m.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress + index */}
        <div className="mx-auto mt-3 flex w-full items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-[#8A8674]">
            {String(activeIdx + 1).padStart(2, "0")} / {String(MODES.length).padStart(2, "0")}
          </span>
          <div className="h-[2px] flex-1 overflow-hidden rounded-sm bg-[#D9CFB5]">
            <div
              className="h-full bg-[#1B3B5F] transition-[width] duration-500 ease-out"
              style={{ width: `${((activeIdx + 1) / MODES.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-7">
          <div
            key={activeIdx}
            className="agent-focus alma-card rounded-2xl border border-[#D9CFB5] p-6 md:p-7"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#2E5A88]">
              Current mode: {current.label}
            </p>
            <p className="mt-3 text-base leading-relaxed text-[#4A5260] md:text-lg">
              {current.description}
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[#8A8674]">
          Early users start review-first. More automation is optional, earned, and reversible.
        </p>
      </div>
    </section>
  );
}
