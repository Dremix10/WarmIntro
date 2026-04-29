"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/Reveal";

type Surface = {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  src: string;
  alt: string;
  imageRight: boolean;
};

const SURFACES: Surface[] = [
  {
    href: "/today",
    eyebrow: "Your queue",
    title: "Today’s outreach, lined up.",
    body: "Drafts ready for review. Trust dial: Copilot, Preview-veto, Autopilot. You decide.",
    src: "/landing/today.png",
    alt: "Today's outreach queue with drafts and trust dial",
    imageRight: true,
  },
  {
    href: "/network",
    eyebrow: "Archipelago",
    title: "Your network, as a place.",
    body: "Every bank is an island. Every intro builds more of a home on it.",
    src: "/landing/network.png",
    alt: "Network archipelago with bank islands at different construction stages",
    imageRight: false,
  },
  {
    href: "/crm",
    eyebrow: "Pipeline",
    title: "Every banker, every stage.",
    body: "Draft → sent → replied → coffee → referral → first round → superday → offer.",
    src: "/landing/crm.png",
    alt: "CRM kanban with bankers across pipeline stages",
    imageRight: true,
  },
];

function ParallaxImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let rafId = 0;
    const update = () => {
      rafId = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // -1 when card is below fold, 0 when centered, +1 when above fold.
      const ratio = (rect.top + rect.height / 2 - vh / 2) / vh;
      const clamped = Math.max(-1, Math.min(1, ratio));
      setOffset(clamped * 20); // 20px max travel
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
  }, []);

  return (
    <div
      ref={ref}
      className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-[#ECE7DE] bg-[#F4EDDB]"
    >
      <div
        className="absolute inset-0"
        style={{ transform: `translate3d(0, ${offset}px, 0)`, willChange: "transform" }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}

export function SurfacesStack() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <Reveal>
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            Your week in Alma
          </p>
          <h2 className="mt-3 text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
            Three surfaces. Zero spreadsheet.
          </h2>
        </div>
      </Reveal>

      <div className="mt-10 flex flex-col gap-5">
        {SURFACES.map((s, i) => (
          <Reveal key={s.href} delay={i * 80}>
            <Link
              href={s.href}
              className="group block rounded-2xl border border-[#D9CFB5] bg-white p-5 transition-colors hover:border-[#2E5A88] md:p-6"
            >
              <div className={"grid grid-cols-1 gap-5 md:grid-cols-2 md:items-center md:gap-8 " + (s.imageRight ? "" : "md:[&>*:first-child]:order-2")}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5C6472]">
                    {s.eyebrow}
                  </p>
                  <h3 className="mt-2 text-2xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A]">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A5260]">{s.body}</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#1B3B5F] group-hover:underline">
                    Take a look <span aria-hidden>→</span>
                  </p>
                </div>
                <ParallaxImage src={s.src} alt={s.alt} />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
