"use client";

import { useRef } from "react";

export function TiltCard({
  children,
  maxTiltX = 3,
  maxTiltY = 4,
  className = "",
}: {
  children: React.ReactNode;
  maxTiltX?: number;
  maxTiltY?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handle = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1200px) rotateY(${x * maxTiltY}deg) rotateX(${-y * maxTiltX}deg)`;
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(1200px) rotateY(0) rotateX(0)";
  };

  return (
    <div
      ref={ref}
      onMouseMove={handle}
      onMouseLeave={reset}
      className={className}
      style={{
        transition: "transform 400ms cubic-bezier(.2,.6,.2,1)",
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </div>
  );
}
