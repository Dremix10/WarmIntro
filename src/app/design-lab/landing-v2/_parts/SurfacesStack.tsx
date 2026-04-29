"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TodayMock, NetworkMock, CrmMock } from "./SurfaceMocks";

type Surface = {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  Mock: React.ComponentType;
};

const SURFACES: Surface[] = [
  {
    href: "/today",
    eyebrow: "Your queue",
    title: "Today's outreach, lined up.",
    body: "Drafts ready for review. Trust dial: Copilot, Preview-veto, Autopilot. You decide.",
    Mock: TodayMock,
  },
  {
    href: "/network",
    eyebrow: "Archipelago",
    title: "Your network, as a place.",
    body: "Every bank is an island. Every intro builds more of a home on it.",
    Mock: NetworkMock,
  },
  {
    href: "/crm",
    eyebrow: "Pipeline",
    title: "Every banker, every stage.",
    body: "Draft → sent → replied → coffee → referral → first round → superday → offer.",
    Mock: CrmMock,
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

export function SurfacesStack() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const reducedMotion = useReducedMotion();

  // Reduced-motion fallback: auto-unfold all panels once on viewport entry.
  useEffect(() => {
    if (!reducedMotion) return;
    const sec = sectionRef.current;
    if (!sec) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          window.setTimeout(() => setActiveIdx(1), 350);
          window.setTimeout(() => setActiveIdx(2), 700);
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
        SURFACES.length - 1,
        Math.max(0, Math.floor(progress * SURFACES.length))
      );
      setActiveIdx((prev) => (prev === idx ? prev : idx));
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

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[150vh] md:min-h-[180vh]"
      aria-label="Three product surfaces"
    >
      <div className="sticky top-16 mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-center px-6 py-10 md:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            Your week in Alma
          </p>
          <h2 className="mt-3 text-[40px] leading-[1.05] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[64px]">
            Three surfaces. Zero spreadsheet.
          </h2>
        </div>

        {/* Leaflet — three panels unfold left-to-right with a 3D rotateY swing. */}
        <div className="surface-leaflet mx-auto mt-14 grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-3 md:gap-7">
          {SURFACES.map((s, i) => {
            const state = i <= activeIdx ? "open" : "closed";
            return (
              <Link
                key={s.href}
                href={s.href}
                data-state={state}
                style={{ ["--surface-delay" as string]: `${i * 60}ms` }}
                className="surface-card group block"
              >
                <div className="alma-card flex h-full flex-col rounded-2xl border border-[#D9CFB5] p-4 transition-colors hover:border-[#2E5A88] md:p-5">
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-[#ECE7DE] bg-[#F4EDDB]">
                    <s.Mock />
                  </div>
                  <div className="mt-4 flex flex-1 flex-col">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5C6472]">
                      {s.eyebrow}
                    </p>
                    <h3 className="mt-1.5 text-xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-2xl">
                      {s.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-[#4A5260]">{s.body}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Progress + counter */}
        <div className="mx-auto mt-7 flex w-full max-w-md items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-[#8A8674]">
            {String(activeIdx + 1).padStart(2, "0")} / {String(SURFACES.length).padStart(2, "0")}
          </span>
          <div className="h-[2px] flex-1 overflow-hidden rounded-sm bg-[#D9CFB5]">
            <div
              className="h-full bg-[#1B3B5F] transition-[width] duration-500 ease-out"
              style={{ width: `${((activeIdx + 1) / SURFACES.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
