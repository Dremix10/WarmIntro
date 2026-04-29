"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "copilot" | "preview" | "auto";

const MODES: { id: Mode; label: string; subtitle: string; description: string }[] = [
  {
    id: "copilot",
    label: "Copilot",
    subtitle: "drafts only · you copy & send",
    description:
      "Alma drafts every email and shows it to you. You copy, edit, send from Gmail. Nothing leaves your inbox without you. Most students start here for the first two weeks.",
  },
  {
    id: "preview",
    label: "Preview-veto",
    subtitle: "15-min window · skip if you want",
    description:
      "Each draft sits in a 15-minute window. Tap &apos;skip&apos; to kill it. Otherwise it sends from Gmail at the time you set.",
  },
  {
    id: "auto",
    label: "Autopilot",
    subtitle: "sends + Sunday digest",
    description:
      "Alma sends. You read a Sunday digest. One tap returns to Preview-veto.",
  },
];

export function TrustGradient() {
  const sectionRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<Mode>("copilot");
  const hasAutoPlayedRef = useRef(false);

  useEffect(() => {
    const sec = sectionRef.current;
    if (!sec || hasAutoPlayedRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      hasAutoPlayedRef.current = true;
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAutoPlayedRef.current) {
          hasAutoPlayedRef.current = true;
          // Sequence: copilot → preview → auto → settle on copilot
          window.setTimeout(() => setMode("preview"), 350);
          window.setTimeout(() => setMode("auto"), 700);
          window.setTimeout(() => setMode("copilot"), 1100);
          observer.disconnect();
        }
      },
      { threshold: 0.45 }
    );
    observer.observe(sec);
    return () => observer.disconnect();
  }, []);

  const activeIdx = MODES.findIndex((m) => m.id === mode);
  const current = MODES[activeIdx];

  return (
    <section ref={sectionRef} className="mx-auto max-w-3xl px-6 py-20" aria-label="Trust gradient">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
          You stay in control
        </p>
        <h2 className="mt-3 text-[40px] leading-[1.05] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[64px]">
          Three trust levels. You pick. You change anytime.
        </h2>
      </div>

      <div
        className="relative mx-auto mt-10 flex items-center rounded-full border border-[#D9CFB5] bg-white p-2"
        role="radiogroup"
        aria-label="Trust gradient mode"
      >
        <span
          className="absolute top-2 bottom-2 rounded-full bg-[#1B3B5F] transition-[left] duration-500 ease-out"
          aria-hidden
          style={{
            left: `calc(${(activeIdx / 3) * 100}% + 0.5rem)`,
            width: "calc(33.3333% - 0.6667rem)",
          }}
        />
        {MODES.map((m) => {
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(m.id)}
              className={
                "relative z-10 flex-1 rounded-full px-4 py-3 text-center text-sm font-semibold transition-colors duration-300 " +
                (active ? "text-white" : "text-[#5C6472] hover:text-[#1B3B5F]")
              }
            >
              <div>{m.label}</div>
              <div className={"mt-1 text-[10px] font-normal " + (active ? "text-white/80" : "text-[#8A8674]")}>
                {m.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 alma-card rounded-2xl border border-[#D9CFB5] p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#2E5A88]">
          Right now: {current.label}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#4A5260]">{current.description}</p>
      </div>

      <p className="mt-4 text-center text-xs text-[#8A8674]">
        Auto-graduates as you approve drafts. Always one tap to step back.
      </p>
    </section>
  );
}
