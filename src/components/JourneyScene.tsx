"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Scroll-TRIGGERED journey scene.
//
// When the scene enters the viewport (~25% visible), one smooth animation plays:
//   - boat sails along the path from home to the final island
//   - path draws progressively (stroke-dashoffset CSS transition)
//   - three construction stages bloom in staggered (opacity + scale transitions)
//
// IMPORTANT — CSS vs SVG transform gotcha: CSS `transform` style overrides
// SVG `transform` attribute on the same element. So we NEVER put a CSS
// transform on the same <g> that has an SVG positioning transform — instead
// we nest: outer <g transform="..."> for position, inner <g style={{ transform }}>
// for animated scale/opacity.

// Path visits each island by sailing over their centers, then parks just
// south of the Evercore house (y=460) — "right below the house, not on it".
const PATH_D =
  "M 90 500 Q 160 440 240 380 Q 420 300 600 340 Q 780 400 960 460";

const DURATION = 5500;
const EASING = "cubic-bezier(.22,.75,.3,1)";

const ISLANDS = [
  {
    name: "Morgan Stanley",
    meaning: "foundation · first reply",
    labelX: 240,
    labelY: 462,
    delay: 1300,
  },
  {
    name: "Goldman Sachs",
    meaning: "walls · coffee chat",
    labelX: 600,
    labelY: 425,
    delay: 3000,
  },
  {
    name: "Evercore",
    meaning: "home · interview earned",
    labelX: 960,
    labelY: 498,
    delay: 4700,
  },
];

type SceneState = "off" | "on" | "instant";

function easeInOutQuad(p: number) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

function placeBoat(g: SVGGElement, path: SVGPathElement, distance: number) {
  const len = path.getTotalLength();
  const d = Math.min(Math.max(distance, 0), len);
  const p = path.getPointAtLength(d);
  const ahead = path.getPointAtLength(Math.min(d + 3, len));
  const angle = (Math.atan2(ahead.y - p.y, ahead.x - p.x) * 180) / Math.PI;
  g.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${angle})`);
}

export function JourneyScene() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const boatRef = useRef<SVGGElement>(null);

  const [state, setState] = useState<SceneState>("off");
  const [pathLen, setPathLen] = useState(0);

  useLayoutEffect(() => {
    const path = pathRef.current;
    const boat = boatRef.current;
    if (!path || !boat) return;
    setPathLen(path.getTotalLength());
    placeBoat(boat, path, 0);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setState("instant");
      return;
    }

    const rect = el.getBoundingClientRect();

    // Already past it (page reload mid-scroll) — snap to final state.
    if (rect.bottom < 0) {
      setState("instant");
      return;
    }

    // rootMargin shrinks the virtual viewport from the bottom by 40%, so the
    // observer only fires once the scene crosses into the upper 60% of the
    // viewport. The user has to actually scroll to the scene before it plays.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("on");
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -40% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const boat = boatRef.current;
    const path = pathRef.current;
    if (!boat || !path || pathLen === 0) return;

    if (state === "instant") {
      placeBoat(boat, path, pathLen);
      return;
    }

    if (state === "on") {
      const start = performance.now();
      let rafId = 0;
      const tick = (t: number) => {
        const p = Math.min((t - start) / DURATION, 1);
        placeBoat(boat, path, easeInOutQuad(p) * pathLen);
        if (p < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafId);
    }
  }, [state, pathLen]);

  const visible = state !== "off";
  const animated = state === "on";

  const stageStyle = (delayMs: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: `scale(${visible ? 1 : 0.7})`,
    transformOrigin: "center",
    transformBox: "fill-box",
    transition: animated
      ? `opacity 900ms ${EASING} ${delayMs}ms, transform 900ms ${EASING} ${delayMs}ms`
      : "none",
  });

  const labelStyle = (delayMs: number): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transition: animated ? `opacity 800ms ${EASING} ${delayMs}ms` : "none",
  });

  const pathStyle: React.CSSProperties = {
    strokeDasharray: pathLen || 0,
    strokeDashoffset: visible ? 0 : pathLen || 0,
    transition: animated ? `stroke-dashoffset ${DURATION}ms ${EASING}` : "none",
  };

  return (
    <div ref={rootRef} className="relative aspect-[16/8] w-full overflow-hidden">
      <svg viewBox="0 0 1200 600" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="js-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D8E6EC" />
            <stop offset="55%" stopColor="#B8CEDB" />
            <stop offset="100%" stopColor="#8FB0BF" />
          </linearGradient>
          <radialGradient id="js-sun" cx="85%" cy="15%" r="45%">
            <stop offset="0%" stopColor="#FFE8A8" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#FFE8A8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFE8A8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="js-beach" cx="40%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#F6E7B6" />
            <stop offset="100%" stopColor="#B89964" />
          </radialGradient>
          <radialGradient id="js-land" cx="35%" cy="32%" r="85%">
            <stop offset="0%" stopColor="#C6D5A6" />
            <stop offset="100%" stopColor="#5F7448" />
          </radialGradient>
        </defs>

        <rect width="1200" height="600" fill="url(#js-sea)" />
        <rect width="1200" height="600" fill="url(#js-sun)" />

        <g stroke="#1B3B5F" strokeWidth="0.8" fill="none" opacity="0.18" strokeLinecap="round">
          <path d="M 60 420 Q 75 413 90 420" />
          <path d="M 180 470 Q 195 463 210 470" />
          <path d="M 410 450 Q 425 443 440 450" />
          <path d="M 640 510 Q 655 503 670 510" />
          <path d="M 920 470 Q 935 463 950 470" />
          <path d="M 1060 520 Q 1075 513 1090 520" />
        </g>

        {/* --- Island 1: beach + foundation (Morgan Stanley) --- */}
        <g transform="translate(240 380) rotate(-4)">
          <ellipse cx="10" cy="64" rx="96" ry="8" fill="#1B3B5F" opacity="0.22" />
          <ellipse cx="0" cy="0" rx="108" ry="58" fill="url(#js-beach)" />
          <ellipse cx="-4" cy="-8" rx="86" ry="44" fill="url(#js-land)" />
          <ellipse cx="-28" cy="-18" rx="20" ry="8" fill="#5F7448" opacity="0.5" />
          {/* Construction — nested so CSS transform doesn't clobber SVG attr */}
          <g style={stageStyle(1300)}>
            <g transform="translate(-6 -14) scale(2.4)">
              <ellipse cx="0" cy="8" rx="10" ry="1.8" fill="#1B3B5F" opacity="0.25" />
              <rect x="-7" y="3" width="4.5" height="3" rx="0.5" fill="#C8BC9C" stroke="#6E6246" strokeWidth="0.4" />
              <rect x="-2" y="3" width="4" height="3" rx="0.5" fill="#DAD0B0" stroke="#6E6246" strokeWidth="0.4" />
              <rect x="2.5" y="3" width="4.5" height="3" rx="0.5" fill="#C8BC9C" stroke="#6E6246" strokeWidth="0.4" />
              <rect x="-6.5" y="-0.2" width="4" height="2.8" rx="0.5" fill="#DAD0B0" stroke="#6E6246" strokeWidth="0.4" />
              <rect x="-2" y="-0.2" width="4" height="2.8" rx="0.5" fill="#C8BC9C" stroke="#6E6246" strokeWidth="0.4" />
              <rect x="2.5" y="-0.2" width="3.8" height="2.8" rx="0.5" fill="#DAD0B0" stroke="#6E6246" strokeWidth="0.4" />
            </g>
          </g>
        </g>

        {/* --- Island 2: beach + walls (Goldman Sachs) --- */}
        <g transform="translate(600 340) rotate(3)">
          <ellipse cx="8" cy="72" rx="116" ry="9" fill="#1B3B5F" opacity="0.22" />
          <ellipse cx="0" cy="0" rx="126" ry="62" fill="url(#js-beach)" />
          <ellipse cx="-4" cy="-8" rx="102" ry="48" fill="url(#js-land)" />
          <ellipse cx="-22" cy="-20" rx="26" ry="9" fill="#5F7448" opacity="0.5" />
          <ellipse cx="30" cy="-10" rx="22" ry="8" fill="#5F7448" opacity="0.45" />
          <g style={stageStyle(3000)}>
            <g transform="translate(-6 -18) scale(2.6)">
              <ellipse cx="0" cy="8" rx="11" ry="1.8" fill="#1B3B5F" opacity="0.27" />
              <rect x="-7" y="5.4" width="14" height="1.6" fill="#C8BC9C" stroke="#6E6246" strokeWidth="0.35" />
              <rect x="-6" y="-1.2" width="12" height="6.6" fill="#FBF7EC" stroke="#1B3B5F" strokeWidth="0.55" />
              <rect x="-1.5" y="1.8" width="3" height="3.6" fill="#6E6246" opacity="0.35" stroke="#1B3B5F" strokeWidth="0.4" />
              <path d="M -6 -1.2 L 6 -1.2" stroke="#1B3B5F" strokeWidth="0.7" strokeDasharray="2 1.5" fill="none" opacity="0.6" />
            </g>
          </g>
        </g>

        {/* --- Island 3: beach + finished home (Evercore) --- */}
        <g transform="translate(960 400) rotate(-5)">
          <ellipse cx="10" cy="68" rx="108" ry="9" fill="#1B3B5F" opacity="0.24" />
          <ellipse cx="0" cy="0" rx="118" ry="60" fill="url(#js-beach)" />
          <ellipse cx="-4" cy="-8" rx="94" ry="46" fill="url(#js-land)" />
          <ellipse cx="-26" cy="-20" rx="24" ry="9" fill="#5F7448" opacity="0.5" />
          <g style={stageStyle(4700)}>
            <g transform="translate(-4 -18) scale(2.6)">
              <ellipse cx="0" cy="9" rx="13" ry="2.2" fill="#1B3B5F" opacity="0.3" />
              <rect x="-7" y="-2.5" width="14" height="10.5" fill="#FBF7EC" stroke="#1B3B5F" strokeWidth="0.6" />
              <path d="M -8.5 -2.5 L 0 -11.5 L 8.5 -2.5 Z" fill="#C86B4F" stroke="#1B3B5F" strokeWidth="0.6" strokeLinejoin="round" />
              <path d="M -8 -2.5 L 0 -11 L 0 -10.3 L -7 -2.5 Z" fill="#DB7E5E" />
              <rect x="3.8" y="-8.5" width="1.6" height="3.5" fill="#8A7355" stroke="#1B3B5F" strokeWidth="0.3" />
              <rect x="-1.9" y="2" width="3.8" height="6" fill="#2E5A88" stroke="#1B3B5F" strokeWidth="0.4" />
              <circle cx="1.3" cy="5" r="0.35" fill="#E8B339" />
              <rect x="-5.6" y="0.5" width="2.6" height="2.6" fill="#A9C4D2" stroke="#1B3B5F" strokeWidth="0.35" />
              <rect x="3" y="0.5" width="2.6" height="2.6" fill="#A9C4D2" stroke="#1B3B5F" strokeWidth="0.35" />
              <circle cx="-8.2" cy="3.5" r="1" fill="#E85A7C" opacity="0.9" />
              <circle cx="-8.6" cy="5.6" r="1.2" fill="#D84D6E" opacity="0.85" />
              <circle cx="-7.2" cy="5" r="0.8" fill="#E85A7C" opacity="0.85" />
            </g>
          </g>
        </g>

        {/* --- Island labels (horizontal, not rotated) --- */}
        {ISLANDS.map((isl) => (
          <g key={isl.name} style={labelStyle(isl.delay + 600)}>
            <text
              x={isl.labelX}
              y={isl.labelY}
              textAnchor="middle"
              fontSize="14"
              fill="#1B3B5F"
              fontFamily="var(--font-fraunces)"
              fontStyle="italic"
              fontWeight="500"
            >
              {isl.name}
            </text>
            <text
              x={isl.labelX}
              y={isl.labelY + 15}
              textAnchor="middle"
              fontSize="10"
              fill="#5C6472"
              fontFamily="var(--font-fraunces)"
              fontStyle="italic"
              opacity="0.85"
            >
              {isl.meaning}
            </text>
          </g>
        ))}

        <path
          ref={pathRef}
          d={PATH_D}
          stroke="#1B3B5F"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
          style={pathStyle}
        />

        {/* Home port */}
        <g transform="translate(90 500)">
          <ellipse cx="0" cy="28" rx="50" ry="7" fill="#1B3B5F" opacity="0.2" />
          <ellipse cx="0" cy="0" rx="48" ry="22" fill="url(#js-beach)" />
          <ellipse cx="-3" cy="-5" rx="38" ry="16" fill="url(#js-land)" />
          <rect x="-5" y="-12" width="10" height="12" fill="#FBF7EC" stroke="#1B3B5F" strokeWidth="0.6" />
          <path d="M -7 -12 L 0 -20 L 7 -12 Z" fill="#C86B4F" stroke="#1B3B5F" strokeWidth="0.6" />
          <text y="42" textAnchor="middle" fontSize="13" fill="#1B3B5F" fontFamily="var(--font-fraunces)" fontStyle="italic" fontWeight="500">
            Home
          </text>
        </g>

        {/* Boat — transform mutated imperatively by rAF. No JSX transform. */}
        <g ref={boatRef}>
          <g transform="translate(-2 -10)">
            <ellipse cx="0" cy="9" rx="12" ry="2" fill="#1B3B5F" opacity="0.25" />
            <path d="M -10 3 L 10 3 L 8 7 L -8 7 Z" fill="#1B3B5F" />
            <path d="M 0 3 L 0 -12 L 9 -3 Z" fill="#FBF7EC" stroke="#1B3B5F" strokeWidth="0.8" />
            <line x1="0" y1="3" x2="0" y2="-12" stroke="#1B3B5F" strokeWidth="0.8" />
            <path d="M 0 -12 L -3 -10 L 0 -8" fill="#C86B4F" />
          </g>
        </g>
      </svg>

      <div className="pointer-events-none absolute left-6 top-5 max-w-sm rounded-2xl bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">
          Your archipelago
        </p>
        <p className="mt-1.5 text-sm font-[family-name:var(--font-fraunces)] italic text-[#14182A]">
          From a cold inbox to a home standing on its own island.
        </p>
      </div>
    </div>
  );
}
