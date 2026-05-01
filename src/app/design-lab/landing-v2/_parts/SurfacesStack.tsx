"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { TodayMock, NetworkMock, CrmMock } from "./SurfaceMocks";

type Surface = {
  eyebrow: string;
  title: string;
  body: string;
  authedHref: string;
  Mock: React.ComponentType;
};

const SURFACES: Surface[] = [
  {
    eyebrow: "Your queue",
    title: "Today's outreach, lined up.",
    body: "Drafts ready for review. Trust dial: Copilot, Preview-veto, Autopilot. You decide.",
    authedHref: "/today",
    Mock: TodayMock,
  },
  {
    eyebrow: "Archipelago",
    title: "Your network, as a place.",
    body: "Every bank is an island. Every intro builds more of a home on it.",
    authedHref: "/network",
    Mock: NetworkMock,
  },
  {
    eyebrow: "Pipeline",
    title: "Every banker, every stage.",
    body: "Draft → sent → replied → coffee → referral → first round → superday → offer.",
    authedHref: "/crm",
    Mock: CrmMock,
  },
];

function useAuthHref(authedHref: string) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSignedIn(Boolean(session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSignedIn(Boolean(s));
    });
    return () => subscription.unsubscribe();
  }, []);
  // Until session resolves, send to /demo — safe default for visitors.
  return signedIn ? authedHref : "/demo";
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

export function SurfacesStack() {
  const sectionRef = useRef<HTMLElement>(null);
  // -1 = all cards closed. Cards open as activeIdx advances 0, 1, 2.
  const [activeIdx, setActiveIdx] = useState(-1);
  const reducedMotion = useReducedMotion();

  // Auto-unfold cards on viewport entry, staggered. Independent of scroll
  // position from then on; speed-scrolling never interrupts.
  useEffect(() => {
    const sec = sectionRef.current;
    if (!sec) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (reducedMotion) {
            setActiveIdx(SURFACES.length - 1);
          } else {
            // Stagger card 1, 2, 3 unfolds. Activeidx -1 = all closed; 0/1/2 reveal each.
            window.setTimeout(() => setActiveIdx(0), 600);
            window.setTimeout(() => setActiveIdx(1), 1300);
            window.setTimeout(() => setActiveIdx(2), 2000);
          }
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(sec);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative"
      aria-label="Three product surfaces"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            Your week in Alma
          </p>
          <h2 className="mt-3 text-[40px] leading-[1.08] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[64px]">
            <span className="block">Three surfaces.</span>
            <span className="block italic text-[#2E5A88]">Zero spreadsheet.</span>
          </h2>
        </div>

        {/* Leaflet — three panels unfold left-to-right with a 3D rotateY swing. */}
        <div className="surface-leaflet mx-auto mt-14 grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-3 md:gap-7">
          {SURFACES.map((s, i) => {
            const state = i <= activeIdx ? "open" : "closed";
            return (
              <SurfaceCard key={i} surface={s} state={state} delay={i * 80} />
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

function SurfaceCard({
  surface,
  state,
  delay,
}: {
  surface: Surface;
  state: "open" | "closed";
  delay: number;
}) {
  const href = useAuthHref(surface.authedHref);
  const isDemo = href === "/demo";
  const ctaLabel = isDemo ? "Try the demo" : "Take a look";

  return (
    <Link
      href={href}
      data-state={state}
      style={{ ["--surface-delay" as string]: `${delay}ms` }}
      className="surface-card group block"
    >
      <div className="alma-card flex h-full flex-col rounded-2xl border border-[#D9CFB5] p-4 transition-colors hover:border-[#2E5A88] md:p-5">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-[#ECE7DE] bg-[#F4EDDB]">
          <surface.Mock />
        </div>
        <div className="mt-4 flex flex-1 flex-col">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5C6472]">
            {surface.eyebrow}
          </p>
          <h3 className="mt-1.5 text-xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-2xl">
            {surface.title}
          </h3>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-[#4A5260]">{surface.body}</p>
          <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#1B3B5F] group-hover:underline">
            {ctaLabel} <span aria-hidden>→</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
