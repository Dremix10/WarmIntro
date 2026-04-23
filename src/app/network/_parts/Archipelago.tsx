"use client";

import { useState } from "react";
import { IslandDetail } from "./IslandDetail";

export type Stage = "sent" | "replied" | "coffee" | "referral" | "interview";

export type Marker = {
  name: string;
  role: string;
  stage: Stage;
  warmth: number;
  dx: number;
  dy: number;
  fresh?: boolean;
};

export type Detail = {
  vegetation: Array<{ cx: number; cy: number; rx: number; ry: number; rot: number; opacity?: number }>;
  ridge?: string;
};

export type Island = {
  id: string;
  company: string;
  cluster: string;
  cx: number;
  cy: number;
  rotation: number;
  path: string;
  width: number;
  height: number;
  details: Detail;
  markers: Marker[];
};

type ClusterLabel = { id: string; label: string; x: number; y: number };

export const STAGE_COLOR: Record<Stage, string> = {
  sent: "#C9C1A4",
  replied: "#6E8F6A",
  coffee: "#E8B339",
  referral: "#C86B4F",
  interview: "#1B3B5F",
};

export const STAGE_LABEL: Record<Stage, string> = {
  sent: "Outreach sent",
  replied: "Replied",
  coffee: "Coffee shared",
  referral: "Referred you",
  interview: "Interview scheduled",
};

const CLUSTERS: ClusterLabel[] = [
  { id: "devtools", label: "DEV TOOLS", x: 260, y: 112 },
  { id: "fintech", label: "FINTECH", x: 650, y: 150 },
  { id: "saas", label: "SAAS", x: 990, y: 100 },
];

export const ISLANDS: Island[] = [
  {
    id: "linear",
    company: "Linear",
    cluster: "Dev Tools",
    cx: 260,
    cy: 270,
    rotation: -6,
    path: "M -110 0 C -108 -42 -62 -60 -20 -56 C 34 -52 82 -38 108 -14 C 118 8 104 30 70 42 C 38 54 -8 58 -54 50 C -96 42 -116 22 -110 0 Z",
    width: 240,
    height: 130,
    details: {
      vegetation: [
        { cx: -36, cy: -24, rx: 30, ry: 14, rot: -12, opacity: 0.55 },
        { cx: 46, cy: -6, rx: 26, ry: 11, rot: 8, opacity: 0.45 },
        { cx: -14, cy: 18, rx: 34, ry: 9, rot: -4, opacity: 0.35 },
      ],
      ridge: "M -72 -12 C -40 -30 10 -34 60 -18",
    },
    markers: [
      { name: "Maya Chen", role: "Senior PM", stage: "replied", warmth: 88, dx: -58, dy: -12, fresh: true },
      { name: "Alex Park", role: "Staff Engineer", stage: "replied", warmth: 76, dx: 16, dy: -32 },
      { name: "Amir Shah", role: "Eng Lead", stage: "coffee", warmth: 81, dx: 62, dy: 6 },
      { name: "Sam Okafor", role: "Frontend Eng", stage: "sent", warmth: 63, dx: -22, dy: 22 },
    ],
  },
  {
    id: "stripe",
    company: "Stripe",
    cluster: "Fintech",
    cx: 560,
    cy: 340,
    rotation: 5,
    path: "M -106 -8 C -96 -44 -46 -58 4 -52 C 56 -46 102 -26 108 4 C 110 26 94 40 54 40 C 44 34 34 42 30 52 C 12 56 -24 54 -62 44 C -98 34 -118 12 -106 -8 Z",
    width: 230,
    height: 120,
    details: {
      vegetation: [
        { cx: -32, cy: -20, rx: 32, ry: 12, rot: -8, opacity: 0.55 },
        { cx: 42, cy: -10, rx: 28, ry: 10, rot: 6, opacity: 0.45 },
        { cx: -64, cy: 8, rx: 22, ry: 8, rot: -12, opacity: 0.38 },
      ],
      ridge: "M -70 -18 C -30 -34 20 -32 70 -12",
    },
    markers: [
      { name: "Jamie Wu", role: "Senior SWE", stage: "sent", warmth: 78, dx: -62, dy: -4 },
      { name: "Taylor Reese", role: "PM", stage: "coffee", warmth: 74, dx: 6, dy: -32 },
      { name: "Ben Torres", role: "Staff PM", stage: "referral", warmth: 79, dx: 66, dy: 8 },
    ],
  },
  {
    id: "ramp",
    company: "Ramp",
    cluster: "Fintech",
    cx: 770,
    cy: 270,
    rotation: -3,
    path: "M -78 -8 C -70 -38 -30 -50 5 -44 C 42 -38 72 -18 78 4 C 82 26 60 40 28 38 C 16 32 4 40 -2 46 C -32 44 -82 22 -78 -8 Z",
    width: 170,
    height: 100,
    details: {
      vegetation: [
        { cx: -18, cy: -18, rx: 24, ry: 10, rot: -10, opacity: 0.55 },
        { cx: 32, cy: 0, rx: 22, ry: 9, rot: 8, opacity: 0.42 },
      ],
      ridge: "M -48 -18 C -12 -28 30 -24 52 -8",
    },
    markers: [
      { name: "Dana Kim", role: "Senior SWE", stage: "referral", warmth: 82, dx: -32, dy: -16 },
      { name: "Leila Haddad", role: "Hiring Manager", stage: "interview", warmth: 70, dx: 30, dy: 12 },
    ],
  },
  {
    id: "notion",
    company: "Notion",
    cluster: "SaaS",
    cx: 965,
    cy: 235,
    rotation: 4,
    path: "M -74 -10 C -68 -36 -30 -46 10 -40 C 48 -34 78 -14 78 10 C 78 32 50 42 18 40 C -22 40 -80 18 -74 -10 Z",
    width: 160,
    height: 96,
    details: {
      vegetation: [
        { cx: -20, cy: -18, rx: 26, ry: 10, rot: -8, opacity: 0.55 },
        { cx: 28, cy: -4, rx: 22, ry: 9, rot: 10, opacity: 0.42 },
      ],
      ridge: "M -44 -20 C -8 -30 30 -26 52 -10",
    },
    markers: [
      { name: "Priya Venkat", role: "Product Designer", stage: "replied", warmth: 72, dx: -24, dy: -10, fresh: true },
      { name: "Nina Ortiz", role: "PM", stage: "sent", warmth: 68, dx: 26, dy: 12 },
    ],
  },
  {
    id: "figma",
    company: "Figma",
    cluster: "SaaS",
    cx: 1075,
    cy: 440,
    rotation: -8,
    path: "M -52 -2 C -48 -22 -22 -30 0 -26 C 22 -22 52 -10 52 6 C 52 22 28 26 8 24 C -20 26 -54 16 -52 -2 Z",
    width: 110,
    height: 60,
    details: {
      vegetation: [{ cx: -8, cy: -10, rx: 20, ry: 7, rot: -6, opacity: 0.5 }],
    },
    markers: [{ name: "Ravi Patel", role: "Design Eng", stage: "sent", warmth: 71, dx: 0, dy: -2 }],
  },
];

const HOME = { x: 110, y: 560 };

const JOURNEY_PATH = `M ${HOME.x} ${HOME.y}
  C 170 500 210 380 ${ISLANDS[0].cx} ${ISLANDS[0].cy + 50}
  C 320 360 460 370 ${ISLANDS[1].cx} ${ISLANDS[1].cy + 40}
  C 640 310 700 280 ${ISLANDS[2].cx} ${ISLANDS[2].cy + 30}
  C 830 220 900 190 ${ISLANDS[3].cx} ${ISLANDS[3].cy + 30}
  C 1010 290 1040 370 ${ISLANDS[4].cx} ${ISLANDS[4].cy + 10}`;

const BOAT = { x: ISLANDS[0].cx + 88, y: ISLANDS[0].cy + 68 };

export function Archipelago() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const selected = ISLANDS.find((i) => i.id === selectedId) ?? null;

  return (
    <>
      <svg viewBox="0 0 1200 720" className="block h-auto w-full">
        <SvgDefs />
        <rect x="0" y="0" width="1200" height="720" fill="url(#sea)" />
        <rect x="0" y="0" width="1200" height="720" fill="url(#sun)" />

        <Waves />
        <Sparkles />
        <Birds />

        <path
          d={JOURNEY_PATH}
          fill="none"
          stroke="#1B3B5F"
          strokeWidth={1.6}
          strokeDasharray="5 6"
          strokeLinecap="round"
          opacity={0.55}
        />

        {CLUSTERS.map((c) => (
          <g key={c.id}>
            <text x={c.x} y={c.y} textAnchor="middle" fontSize={11} letterSpacing={3.5} fill="#1B3B5F" fontWeight={600} opacity={0.75}>
              {c.label}
            </text>
            <line x1={c.x - 34} x2={c.x + 34} y1={c.y + 8} y2={c.y + 8} stroke="#1B3B5F" strokeWidth={0.6} opacity={0.25} />
          </g>
        ))}

        {ISLANDS.map((island) => (
          <g
            key={island.id}
            onClick={() => setSelectedId(island.id)}
            onMouseEnter={() => setHoveredId(island.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{ cursor: "pointer" }}
          >
            <IslandMark island={island} hovered={hoveredId === island.id} />
          </g>
        ))}

        <HomePort />
        <Boat x={BOAT.x} y={BOAT.y} />
        <Compass x={1130} y={640} />

        <text x={1180} y={702} textAnchor="end" fontSize={9.5} fill="#1B3B5F" opacity={0.55} fontStyle="italic" fontFamily="var(--font-fraunces)">
          Kinsey’s archipelago · spring ’26 · tap an island
        </text>
      </svg>

      {selected && <IslandDetail island={selected} onClose={() => setSelectedId(null)} />}
    </>
  );
}

export function SvgDefs() {
  return (
    <defs>
      <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#D8E6EC" />
        <stop offset="55%" stopColor="#A9C4D2" />
        <stop offset="100%" stopColor="#7FA3B5" />
      </linearGradient>
      <radialGradient id="sun" cx="88%" cy="10%" r="45%">
        <stop offset="0%" stopColor="#FFEAB0" stopOpacity="0.85" />
        <stop offset="45%" stopColor="#FFEAB0" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#FFEAB0" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="beach" cx="38%" cy="35%" r="80%">
        <stop offset="0%" stopColor="#F6E7B6" />
        <stop offset="60%" stopColor="#E4CE91" />
        <stop offset="100%" stopColor="#B89964" />
      </radialGradient>
      <radialGradient id="land" cx="35%" cy="32%" r="85%">
        <stop offset="0%" stopColor="#C6D5A6" />
        <stop offset="55%" stopColor="#93A77A" />
        <stop offset="100%" stopColor="#5F7448" />
      </radialGradient>
      <filter id="softer" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.5" />
      </filter>
      <filter id="shimmer" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1" />
      </filter>
    </defs>
  );
}

function IslandMark({ island, hovered }: { island: Island; hovered: boolean }) {
  return (
    <g transform={`translate(${island.cx} ${island.cy}) rotate(${island.rotation})`}>
      {hovered && (
        <path d={island.path} transform="scale(1.28)" fill="none" stroke="#FBF7EC" strokeWidth={3} opacity={0.85} />
      )}
      <path d={island.path} transform="scale(1.3)" fill="#BBD6DC" opacity={0.28} filter="url(#softer)" />
      <path d={island.path} transform="scale(1.18)" fill="none" stroke="#E9F1F3" strokeWidth={2} opacity={0.55} />
      <path d={island.path} transform="scale(1.08) translate(3 7)" fill="#1B3B5F" opacity={0.18} filter="url(#softer)" />
      <path d={island.path} transform="scale(1.08)" fill="url(#beach)" />
      <path d={island.path} transform="scale(1.03)" fill="#D8BC85" opacity={0.55} />
      <path d={island.path} fill="url(#land)" />

      {island.details.vegetation.map((v, i) => (
        <ellipse key={i} cx={v.cx} cy={v.cy} rx={v.rx} ry={v.ry} fill="#5F7448" opacity={v.opacity ?? 0.45} transform={`rotate(${v.rot} ${v.cx} ${v.cy})`} />
      ))}

      <path d={island.path} transform="scale(0.84) translate(-6 -8)" fill="#D7E2B8" opacity={0.3} />

      {island.details.ridge && (
        <path d={island.details.ridge} fill="none" stroke="#3D5136" strokeWidth={1} opacity={0.35} strokeLinecap="round" />
      )}

      {island.markers.map((m, i) => (
        <MarkerStation key={i} marker={m} rotation={-island.rotation} />
      ))}

      <g transform={`rotate(${-island.rotation})`}>
        <rect
          x={-island.company.length * 4 - 6}
          y={island.height / 2 + 15}
          width={island.company.length * 8 + 12}
          height={16}
          rx={8}
          fill="#FBF7EC"
          opacity={0.85}
        />
        <text x={0} y={island.height / 2 + 26} textAnchor="middle" fontSize={13} fill="#1B3B5F" fontFamily="var(--font-fraunces)" fontStyle="italic" fontWeight={500}>
          {island.company}
        </text>
        <text x={0} y={island.height / 2 + 44} textAnchor="middle" fontSize={9.5} fill="#1B3B5F" opacity={0.7}>
          {island.markers.length} {island.markers.length === 1 ? "intro" : "intros"} · tap for details
        </text>
      </g>
    </g>
  );
}

function MarkerStation({ marker, rotation }: { marker: Marker; rotation: number }) {
  return (
    <g transform={`translate(${marker.dx} ${marker.dy})`}>
      {marker.fresh && (
        <circle r={15} fill={STAGE_COLOR[marker.stage]} opacity={0.28}>
          <animate attributeName="r" values="12;19;12" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
        </circle>
      )}
      <StageGlyph stage={marker.stage} />
      <g transform={`rotate(${rotation})`}>
        <text y={20} textAnchor="middle" fontSize={8.5} fill="#1B3B5F" opacity={0.9} fontWeight={500}>
          {marker.name.split(" ")[0]}
        </text>
      </g>
    </g>
  );
}

export function StageGlyph({ stage }: { stage: Stage }) {
  switch (stage) {
    case "sent":
      return <Logs />;
    case "replied":
      return <Foundation />;
    case "coffee":
      return <WallsRising />;
    case "referral":
      return <RoofFrame />;
    case "interview":
      return <FinishedHome />;
  }
}

function Logs() {
  return (
    <g>
      <ellipse cx={0} cy={7} rx={10} ry={1.8} fill="#1B3B5F" opacity={0.25} />
      <rect x={-7} y={3.5} width={14} height={3} rx={1.5} fill="#8A6C44" stroke="#4A3422" strokeWidth={0.4} />
      <circle cx={-7} cy={5} r={1.5} fill="#B49774" stroke="#4A3422" strokeWidth={0.3} />
      <circle cx={-7} cy={5} r={0.55} fill="#6E5436" />
      <circle cx={7} cy={5} r={1.5} fill="#B49774" stroke="#4A3422" strokeWidth={0.3} />
      <circle cx={7} cy={5} r={0.55} fill="#6E5436" />
      <rect x={-5} y={0.4} width={10} height={3} rx={1.5} fill="#9B7A54" stroke="#4A3422" strokeWidth={0.4} />
      <circle cx={-5} cy={1.9} r={1.5} fill="#C4A582" stroke="#4A3422" strokeWidth={0.3} />
      <circle cx={-5} cy={1.9} r={0.55} fill="#7E5F3C" />
      <circle cx={5} cy={1.9} r={1.5} fill="#C4A582" stroke="#4A3422" strokeWidth={0.3} />
      <circle cx={5} cy={1.9} r={0.55} fill="#7E5F3C" />
      <rect x={-3} y={-2.3} width={6} height={2.6} rx={1.3} fill="#8A6C44" stroke="#4A3422" strokeWidth={0.4} />
      <circle cx={-3} cy={-1} r={1.3} fill="#B49774" stroke="#4A3422" strokeWidth={0.3} />
      <circle cx={-3} cy={-1} r={0.45} fill="#6E5436" />
      <circle cx={3} cy={-1} r={1.3} fill="#B49774" stroke="#4A3422" strokeWidth={0.3} />
      <circle cx={3} cy={-1} r={0.45} fill="#6E5436" />
    </g>
  );
}

function Foundation() {
  return (
    <g>
      <ellipse cx={0} cy={7} rx={10} ry={1.8} fill="#1B3B5F" opacity={0.25} />
      <rect x={-7} y={3} width={4.5} height={3} rx={0.5} fill="#C8BC9C" stroke="#6E6246" strokeWidth={0.4} />
      <rect x={-2} y={3} width={4} height={3} rx={0.5} fill="#DAD0B0" stroke="#6E6246" strokeWidth={0.4} />
      <rect x={2.5} y={3} width={4.5} height={3} rx={0.5} fill="#C8BC9C" stroke="#6E6246" strokeWidth={0.4} />
      <rect x={-6.5} y={-0.2} width={4} height={2.8} rx={0.5} fill="#DAD0B0" stroke="#6E6246" strokeWidth={0.4} />
      <rect x={-2} y={-0.2} width={4} height={2.8} rx={0.5} fill="#C8BC9C" stroke="#6E6246" strokeWidth={0.4} />
      <rect x={2.5} y={-0.2} width={3.8} height={2.8} rx={0.5} fill="#DAD0B0" stroke="#6E6246" strokeWidth={0.4} />
      <line x1={-7} y1={3} x2={7} y2={3} stroke="#6E6246" strokeWidth={0.25} opacity={0.6} />
    </g>
  );
}

function WallsRising() {
  return (
    <g>
      <ellipse cx={0} cy={8} rx={11} ry={1.8} fill="#1B3B5F" opacity={0.27} />
      <rect x={-7} y={5.4} width={14} height={1.6} fill="#C8BC9C" stroke="#6E6246" strokeWidth={0.35} />
      <rect x={-6} y={-1.2} width={12} height={6.6} fill="#FBF7EC" stroke="#1B3B5F" strokeWidth={0.55} />
      <rect x={-1.5} y={1.8} width={3} height={3.6} fill="#6E6246" opacity={0.35} stroke="#1B3B5F" strokeWidth={0.4} />
      <path d="M -6 -1.2 L 6 -1.2" stroke="#1B3B5F" strokeWidth={0.7} strokeDasharray="2 1.5" fill="none" opacity={0.6} />
      <line x1={-6} y1={1.8} x2={6} y2={1.8} stroke="#1B3B5F" strokeWidth={0.3} opacity={0.4} />
      <line x1={-3} y1={-1.2} x2={-3} y2={1.8} stroke="#1B3B5F" strokeWidth={0.3} opacity={0.4} />
      <line x1={3} y1={-1.2} x2={3} y2={1.8} stroke="#1B3B5F" strokeWidth={0.3} opacity={0.4} />
    </g>
  );
}

function RoofFrame() {
  return (
    <g>
      <ellipse cx={0} cy={8.5} rx={11.5} ry={1.8} fill="#1B3B5F" opacity={0.27} />
      <rect x={-6.3} y={-2} width={12.6} height={8} fill="#FBF7EC" stroke="#1B3B5F" strokeWidth={0.55} />
      <rect x={-1.5} y={2} width={3} height={4} fill="#2E5A88" opacity={0.22} stroke="#1B3B5F" strokeWidth={0.4} />
      <rect x={-4.8} y={0} width={2.2} height={2.2} fill="#A9C4D2" stroke="#1B3B5F" strokeWidth={0.35} />
      <rect x={2.6} y={0} width={2.2} height={2.2} fill="#A9C4D2" stroke="#1B3B5F" strokeWidth={0.35} />
      <path d="M -7.5 -2 L 0 -10.5 L 7.5 -2" fill="none" stroke="#8A6C44" strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round" />
      <line x1={0} y1={-2} x2={0} y2={-10.5} stroke="#8A6C44" strokeWidth={0.9} strokeLinecap="round" />
      <line x1={-3.8} y1={-6.2} x2={3.8} y2={-6.2} stroke="#8A6C44" strokeWidth={0.7} />
      <line x1={-5.4} y1={-3.4} x2={5.4} y2={-3.4} stroke="#8A6C44" strokeWidth={0.7} />
    </g>
  );
}

function FinishedHome() {
  return (
    <g>
      <ellipse cx={0} cy={9} rx={13} ry={2.2} fill="#1B3B5F" opacity={0.3} />
      <rect x={-7} y={-2.5} width={14} height={10.5} fill="#FBF7EC" stroke="#1B3B5F" strokeWidth={0.6} />
      <rect x={-7} y={-2.5} width={0.6} height={10.5} fill="#E8DFC7" opacity={0.8} />
      <path d="M -8.5 -2.5 L 0 -11.5 L 8.5 -2.5 Z" fill="#C86B4F" stroke="#1B3B5F" strokeWidth={0.6} strokeLinejoin="round" />
      <path d="M -8 -2.5 L 0 -11 L 0 -10.3 L -7 -2.5 Z" fill="#DB7E5E" />
      <rect x={3.8} y={-8.5} width={1.6} height={3.5} fill="#8A7355" stroke="#1B3B5F" strokeWidth={0.3} />
      <rect x={-1.9} y={2} width={3.8} height={6} fill="#2E5A88" stroke="#1B3B5F" strokeWidth={0.4} />
      <rect x={-1.9} y={2} width={3.8} height={0.5} fill="#1B3B5F" opacity={0.5} />
      <circle cx={1.3} cy={5} r={0.35} fill="#E8B339" />
      <rect x={-5.6} y={0.5} width={2.6} height={2.6} fill="#A9C4D2" stroke="#1B3B5F" strokeWidth={0.35} />
      <line x1={-4.3} y1={0.5} x2={-4.3} y2={3.1} stroke="#1B3B5F" strokeWidth={0.25} />
      <line x1={-5.6} y1={1.8} x2={-3} y2={1.8} stroke="#1B3B5F" strokeWidth={0.25} />
      <rect x={3} y={0.5} width={2.6} height={2.6} fill="#A9C4D2" stroke="#1B3B5F" strokeWidth={0.35} />
      <line x1={4.3} y1={0.5} x2={4.3} y2={3.1} stroke="#1B3B5F" strokeWidth={0.25} />
      <line x1={3} y1={1.8} x2={5.6} y2={1.8} stroke="#1B3B5F" strokeWidth={0.25} />
      <circle cx={-8.2} cy={3.5} r={1} fill="#E85A7C" opacity={0.9} />
      <circle cx={-8.6} cy={5.6} r={1.2} fill="#D84D6E" opacity={0.85} />
      <circle cx={-7.2} cy={5} r={0.8} fill="#E85A7C" opacity={0.85} />
      <circle cx={-8.1} cy={7} r={0.9} fill="#B83757" opacity={0.8} />
      <ellipse cx={-7.7} cy={2.5} rx={1} ry={0.4} fill="#5F7448" opacity={0.55} transform="rotate(-15 -7.7 2.5)" />
      <ellipse cx={-7.9} cy={4.5} rx={0.9} ry={0.35} fill="#5F7448" opacity={0.5} transform="rotate(10 -7.9 4.5)" />
    </g>
  );
}

function Waves() {
  const lines = [
    { x: 70, y: 490, w: 28 }, { x: 160, y: 540, w: 30 }, { x: 420, y: 560, w: 22 },
    { x: 620, y: 600, w: 28 }, { x: 820, y: 560, w: 24 }, { x: 1040, y: 600, w: 30 },
    { x: 160, y: 200, w: 20 }, { x: 440, y: 180, w: 22 }, { x: 900, y: 540, w: 18 },
    { x: 880, y: 420, w: 22 }, { x: 310, y: 480, w: 22 }, { x: 520, y: 470, w: 20 },
  ];
  return (
    <g stroke="#1B3B5F" strokeWidth={0.7} strokeLinecap="round" opacity={0.16} fill="none">
      {lines.map((l, i) => (
        <path key={i} d={`M ${l.x} ${l.y} Q ${l.x + l.w / 2} ${l.y - 3} ${l.x + l.w} ${l.y}`} />
      ))}
    </g>
  );
}

function Sparkles() {
  const dots = [
    { x: 220, y: 500 }, { x: 380, y: 520 }, { x: 500, y: 470 }, { x: 680, y: 440 },
    { x: 870, y: 360 }, { x: 940, y: 500 }, { x: 1080, y: 540 }, { x: 180, y: 420 },
  ];
  return (
    <g fill="#FBF7EC" opacity={0.9}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={0.9} filter="url(#shimmer)" />
      ))}
    </g>
  );
}

function Birds() {
  return (
    <g stroke="#1B3B5F" strokeWidth={1.1} fill="none" opacity={0.3} strokeLinecap="round">
      {[
        { x: 140, y: 80 }, { x: 170, y: 95 }, { x: 780, y: 70 }, { x: 810, y: 85 },
      ].map((b, i) => (
        <path key={i} d={`M ${b.x} ${b.y} Q ${b.x + 5} ${b.y - 4} ${b.x + 10} ${b.y} Q ${b.x + 15} ${b.y - 4} ${b.x + 20} ${b.y}`} />
      ))}
    </g>
  );
}

function HomePort() {
  return (
    <g transform={`translate(${HOME.x} ${HOME.y})`}>
      <ellipse cx={0} cy={38} rx={60} ry={8} fill="#1B3B5F" opacity={0.18} filter="url(#softer)" />
      <path d="M -66 8 C -60 -16 -24 -24 0 -20 C 28 -16 58 -4 62 12 C 64 24 32 32 4 30 C -22 30 -68 22 -66 8 Z" fill="url(#beach)" />
      <path d="M -56 -2 C -48 -14 -18 -16 4 -14 C 26 -10 48 -2 50 8 C 52 18 28 22 4 20 C -20 20 -58 12 -56 -2 Z" fill="url(#land)" />
      <ellipse cx={-18} cy={-6} rx={16} ry={5} fill="#5F7448" opacity={0.4} />
      <rect x={-6} y={-14} width={12} height={14} rx={1} fill="#FBF7EC" stroke="#1B3B5F" strokeWidth={0.7} />
      <path d="M -8 -14 L 0 -22 L 8 -14 Z" fill="#C86B4F" />
      <line x1={0} y1={-22} x2={0} y2={-28} stroke="#1B3B5F" strokeWidth={0.6} />
      <path d="M 0 -28 L 6 -26 L 0 -24 Z" fill="#C86B4F" />
      <g transform="translate(0 44)">
        <text textAnchor="middle" fontSize={12} fill="#1B3B5F" fontFamily="var(--font-fraunces)" fontStyle="italic" fontWeight={500}>
          Home
        </text>
        <text y={13} textAnchor="middle" fontSize={9.5} fill="#1B3B5F" opacity={0.65}>
          tended by Kinsey
        </text>
      </g>
    </g>
  );
}

function Boat({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={9} rx={16} ry={3} fill="#1B3B5F" opacity={0.22} filter="url(#softer)" />
      <path d="M -12 4 L 12 4 L 9 9 L -9 9 Z" fill="#1B3B5F" />
      <path d="M 0 4 L 0 -16 L 11 -3 Z" fill="#FBF7EC" stroke="#1B3B5F" strokeWidth={0.8} />
      <path d="M 0 4 L 0 -16" stroke="#1B3B5F" strokeWidth={0.9} />
      <path d="M 0 -16 L -4 -14 L 0 -12" fill="#C86B4F" />
      <g transform="translate(0 22)">
        <circle r={13} fill="none" stroke="#1B3B5F" strokeWidth={0.6} strokeDasharray="2 3" opacity={0.45} />
        <text y={29} textAnchor="middle" fontSize={9} fill="#1B3B5F" opacity={0.8} fontStyle="italic" fontFamily="var(--font-fraunces)">
          you are here
        </text>
      </g>
    </g>
  );
}

function Compass({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={0.55}>
      <circle r={22} fill="#FBF7EC" stroke="#1B3B5F" strokeWidth={0.8} />
      <path d="M 0 -18 L 3 0 L 0 18 L -3 0 Z" fill="#1B3B5F" />
      <path d="M -18 0 L 0 3 L 18 0 L 0 -3 Z" fill="#1B3B5F" opacity={0.55} />
      <text y={-11} textAnchor="middle" fontSize={8} fill="#1B3B5F" fontWeight={700}>N</text>
      <text y={16} textAnchor="middle" fontSize={8} fill="#1B3B5F" fontWeight={700}>S</text>
      <text x={13} y={3} textAnchor="middle" fontSize={8} fill="#1B3B5F" fontWeight={700}>E</text>
      <text x={-13} y={3} textAnchor="middle" fontSize={8} fill="#1B3B5F" fontWeight={700}>W</text>
      <circle r={1.2} fill="#C86B4F" />
    </g>
  );
}
