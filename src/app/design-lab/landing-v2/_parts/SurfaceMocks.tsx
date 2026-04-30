// Inline product mocks for the landing surfaces section.
// These are not real screenshots — they're high-fidelity reproductions of
// what /today, /network, and /crm look like when populated, drawn in
// React + Tailwind so they stay crisp at any size and match the palette
// exactly. Demo data is illustrative.

const PALETTE = {
  bg: "#EAE3D2",
  bgWarm: "#F4EDDB",
  cardBg: "#FFFFFF",
  border: "#D9CFB5",
  borderSoft: "#ECE7DE",
  ink: "#14182A",
  text: "#4A5260",
  muted: "#5C6472",
  faint: "#8A8674",
  blue: "#1B3B5F",
  blueHover: "#2E5A88",
  ochre: "#E8B339",
  terracotta: "#C86B4F",
};

export function TodayMock() {
  // Two drafts only — three was visually scrambled at the rendered card size.
  // Each line is short enough not to need truncation.
  const drafts = [
    {
      who: "Maya Chen",
      firm: "Morgan Stanley · TMT",
      warmth: 88,
      line: "Saw your team led the Q4 software deal…",
    },
    {
      who: "Alex Park",
      firm: "Goldman Sachs · M&A",
      warmth: 76,
      line: "Brown CS '20, same Fenway club as you…",
    },
  ];

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden p-4 md:p-5"
      style={{ backgroundColor: PALETTE.bg }}
      aria-hidden
    >
      {/* Top bar — Today + dial */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-[15px] md:text-[17px]"
            style={{ fontFamily: "var(--font-fraunces)", color: PALETTE.ink, fontWeight: 600 }}
          >
            Today
          </span>
          <span className="text-[9px] md:text-[10px]" style={{ color: PALETTE.faint }}>
            Tue · Apr 30
          </span>
        </div>
        <div
          className="flex shrink-0 items-center gap-0.5 rounded-full p-0.5 text-[8px] md:text-[9px]"
          style={{ backgroundColor: PALETTE.cardBg, border: `1px solid ${PALETTE.border}` }}
        >
          <span
            className="rounded-full px-2 py-[3px] font-semibold text-white"
            style={{ backgroundColor: PALETTE.blue }}
          >
            Copilot
          </span>
          <span className="px-1.5 py-[3px]" style={{ color: PALETTE.muted }}>
            Preview
          </span>
          <span className="px-1.5 py-[3px]" style={{ color: PALETTE.muted }}>
            Auto
          </span>
        </div>
      </div>

      {/* Stats strip */}
      <div
        className="mt-2.5 flex items-center gap-3 text-[9px] md:text-[10px]"
        style={{ color: PALETTE.muted }}
      >
        <span>
          <strong style={{ color: PALETTE.ink }}>2</strong> ready
        </span>
        <span>
          <strong style={{ color: PALETTE.ink }}>12</strong> sent
        </span>
        <span>
          <strong style={{ color: PALETTE.ink }}>4</strong> replies
        </span>
      </div>

      {/* Draft list */}
      <div className="mt-3 flex flex-1 flex-col gap-2">
        {drafts.map((d, i) => (
          <div
            key={i}
            className="flex-1 rounded-lg p-2.5 md:p-3"
            style={{ backgroundColor: PALETTE.cardBg, border: `1px solid ${PALETTE.border}` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[11px] font-semibold md:text-[12px]"
                style={{ color: PALETTE.ink }}
              >
                {d.who}
              </span>
              <span
                className="shrink-0 rounded-full px-1.5 py-[2px] text-[8px] font-semibold tracking-wide md:text-[9px]"
                style={{
                  backgroundColor: "rgba(27,59,95,0.12)",
                  color: PALETTE.blue,
                }}
              >
                warmth {d.warmth}
              </span>
            </div>
            <div className="mt-0.5 text-[9px] md:text-[10px]" style={{ color: PALETTE.faint }}>
              {d.firm}
            </div>
            <div
              className="mt-1 truncate text-[10px] italic md:text-[11px]"
              style={{ color: PALETTE.text, fontFamily: "var(--font-fraunces)" }}
            >
              {d.line}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NetworkMock() {
  // Archipelago — three banks as islands, ascending diagonally to telegraph
  // progression. Stages: foundation (just sent) → walls (replied) → home
  // (interview earned). SVG viewBox is 320×200 (16:10) — honest pixels.
  type Stage = "foundation" | "walls" | "home";
  const ISLANDS: { name: string; stage: Stage; cx: number; cy: number; base: number }[] = [
    { name: "Morgan Stanley", stage: "foundation", cx: 60, cy: 138, base: 38 },
    { name: "Goldman Sachs", stage: "walls", cx: 160, cy: 108, base: 42 },
    { name: "Evercore", stage: "home", cx: 260, cy: 78, base: 44 },
  ];

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: `radial-gradient(130% 90% at 50% 0%, #F4EDDB 0%, #EAE3D2 60%, #DDD3BE 100%)`,
      }}
      aria-hidden
    >
      {/* Header chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-baseline justify-between px-4 pt-3.5">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[14px] md:text-[15px]"
            style={{ fontFamily: "var(--font-fraunces)", color: PALETTE.ink, fontWeight: 600 }}
          >
            Archipelago
          </span>
          <span className="text-[9px] md:text-[10px]" style={{ color: PALETTE.faint }}>
            3 banks · 14 paths
          </span>
        </div>
      </div>

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 320 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id="ar-island-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(20,24,42,0.22)" />
            <stop offset="100%" stopColor="rgba(20,24,42,0)" />
          </radialGradient>
          <linearGradient id="ar-sand" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F6E7B6" />
            <stop offset="100%" stopColor="#D6BD86" />
          </linearGradient>
          <linearGradient id="ar-grass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#B0BF92" />
            <stop offset="100%" stopColor="#83965E" />
          </linearGradient>
        </defs>

        {ISLANDS.map((island, i) => {
          const { cx, cy, base, stage, name } = island;
          // Construction sits centered horizontally on the island, anchored
          // to the top of the grass plateau (cy - base*0.05).
          const groundY = cy - base * 0.04;
          return (
            <g key={i}>
              {/* Drop shadow on water */}
              <ellipse
                cx={cx + 2}
                cy={cy + base * 0.55}
                rx={base * 1.1}
                ry={base * 0.3}
                fill="url(#ar-island-shadow)"
              />
              {/* Sand */}
              <ellipse cx={cx} cy={cy + base * 0.36} rx={base} ry={base * 0.42} fill="url(#ar-sand)" />
              {/* Grass plateau */}
              <ellipse
                cx={cx}
                cy={cy + base * 0.24}
                rx={base * 0.78}
                ry={base * 0.32}
                fill="url(#ar-grass)"
              />
              {/* Highlight on plateau */}
              <ellipse
                cx={cx - base * 0.08}
                cy={cy + base * 0.18}
                rx={base * 0.46}
                ry={base * 0.12}
                fill="rgba(255,255,255,0.32)"
              />

              {/* Construction — sized larger so it reads at small render */}
              {stage === "foundation" && (
                <g>
                  <rect
                    x={cx - 11}
                    y={groundY - 4}
                    width="22"
                    height="4"
                    fill="#B5A88D"
                    stroke="rgba(20,24,42,0.25)"
                    strokeWidth="0.6"
                    rx="0.6"
                  />
                  {/* Marker stones */}
                  <circle cx={cx - 8} cy={groundY - 6.5} r="1.2" fill="#9B8E70" />
                  <circle cx={cx + 8} cy={groundY - 6.5} r="1.2" fill="#9B8E70" />
                </g>
              )}

              {stage === "walls" && (
                <g>
                  {/* Foundation */}
                  <rect x={cx - 13} y={groundY - 3} width="26" height="3" fill="#B5A88D" />
                  {/* Walls */}
                  <rect
                    x={cx - 12}
                    y={groundY - 13}
                    width="24"
                    height="10"
                    fill="#FCFAF5"
                    stroke="rgba(20,24,42,0.28)"
                    strokeWidth="0.7"
                  />
                  {/* Wall studs */}
                  <line
                    x1={cx - 4}
                    y1={groundY - 13}
                    x2={cx - 4}
                    y2={groundY - 3}
                    stroke="rgba(20,24,42,0.15)"
                    strokeWidth="0.5"
                  />
                  <line
                    x1={cx + 4}
                    y1={groundY - 13}
                    x2={cx + 4}
                    y2={groundY - 3}
                    stroke="rgba(20,24,42,0.15)"
                    strokeWidth="0.5"
                  />
                </g>
              )}

              {stage === "home" && (
                <g>
                  {/* Foundation */}
                  <rect x={cx - 14} y={groundY - 3} width="28" height="3" fill="#B5A88D" />
                  {/* Walls */}
                  <rect
                    x={cx - 13}
                    y={groundY - 14}
                    width="26"
                    height="11"
                    fill="#FCFAF5"
                    stroke="rgba(20,24,42,0.3)"
                    strokeWidth="0.7"
                  />
                  {/* Roof */}
                  <polygon
                    points={`${cx - 15},${groundY - 14} ${cx},${groundY - 24} ${cx + 15},${groundY - 14}`}
                    fill={PALETTE.terracotta}
                    stroke="rgba(20,24,42,0.3)"
                    strokeWidth="0.7"
                    strokeLinejoin="round"
                  />
                  {/* Door */}
                  <rect x={cx - 2} y={groundY - 9} width="4" height="6" fill={PALETTE.blue} rx="0.4" />
                  {/* Windows */}
                  <rect x={cx - 9.5} y={groundY - 11} width="4" height="3.5" fill={PALETTE.ochre} stroke="rgba(20,24,42,0.3)" strokeWidth="0.4" />
                  <rect x={cx + 5.5} y={groundY - 11} width="4" height="3.5" fill={PALETTE.ochre} stroke="rgba(20,24,42,0.3)" strokeWidth="0.4" />
                  {/* Chimney */}
                  <rect x={cx + 6} y={groundY - 22} width="2.4" height="5" fill="#9B8E70" stroke="rgba(20,24,42,0.3)" strokeWidth="0.4" />
                </g>
              )}

              {/* Labels under island */}
              <text
                x={cx}
                y={cy + base * 0.85}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={PALETTE.ink}
                fontFamily="var(--font-fraunces)"
              >
                {name}
              </text>
              <text
                x={cx}
                y={cy + base * 0.85 + 11}
                textAnchor="middle"
                fontSize="8"
                fill={PALETTE.muted}
              >
                {stage === "foundation" ? "sent" : stage === "walls" ? "coffee" : "home"}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Bottom legend */}
      <div
        className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-2.5 py-1 text-[8px] md:text-[9px]"
        style={{
          backgroundColor: "rgba(255,255,255,0.85)",
          border: `1px solid ${PALETTE.border}`,
          color: PALETTE.muted,
        }}
      >
        sent → coffee → <span style={{ color: PALETTE.ink, fontWeight: 600 }}>home</span>
      </div>
    </div>
  );
}

export function CrmMock() {
  const COLS = [
    {
      name: "Sent",
      count: 8,
      cards: [
        { who: "M. Chen", firm: "MS TMT", age: "2d" },
        { who: "J. Liu", firm: "JPM Healthcare", age: "1d" },
      ],
    },
    {
      name: "Replied",
      count: 4,
      cards: [{ who: "S. Patel", firm: "Evercore", age: "today" }],
    },
    {
      name: "Coffee",
      count: 3,
      cards: [
        { who: "A. Park", firm: "Goldman", age: "Tue 4pm" },
        { who: "R. Kim", firm: "Lazard", age: "Thu 2pm" },
      ],
    },
    {
      name: "Referral",
      count: 2,
      cards: [{ who: "T. Wong", firm: "Citi M&A", age: "warm" }],
    },
    {
      name: "1st rd",
      count: 1,
      cards: [{ who: "K. Nash", firm: "Moelis", age: "scheduled" }],
    },
  ];

  return (
    <div
      className="relative h-full w-full overflow-hidden p-3 md:p-4"
      style={{ backgroundColor: PALETTE.bg }}
      aria-hidden
    >
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[12px] md:text-[14px]"
            style={{ fontFamily: "var(--font-fraunces)", color: PALETTE.ink }}
          >
            Pipeline
          </span>
          <span className="text-[7px] md:text-[8px]" style={{ color: PALETTE.faint }}>
            18 active · 2 won this cycle
          </span>
        </div>
        <span className="text-[7px] md:text-[8px]" style={{ color: PALETTE.muted }}>
          filter ⌄
        </span>
      </div>

      <div className="mt-2 grid h-[calc(100%-1.5rem)] grid-cols-5 gap-1.5 md:mt-3 md:gap-2">
        {COLS.map((col, i) => (
          <div key={i} className="flex flex-col gap-1 md:gap-1.5">
            <div className="flex items-baseline justify-between">
              <span
                className="text-[6px] font-bold uppercase tracking-wider md:text-[7px]"
                style={{ color: PALETTE.muted }}
              >
                {col.name}
              </span>
              <span
                className="text-[6px] md:text-[7px]"
                style={{ color: PALETTE.faint }}
              >
                {col.count}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1 overflow-hidden md:gap-1.5">
              {col.cards.map((c, j) => (
                <div
                  key={j}
                  className="rounded-md p-1 md:p-1.5"
                  style={{
                    backgroundColor: PALETTE.cardBg,
                    border: `1px solid ${PALETTE.border}`,
                  }}
                >
                  <div className="text-[7px] font-semibold md:text-[8px]" style={{ color: PALETTE.ink }}>
                    {c.who}
                  </div>
                  <div className="text-[6px] md:text-[7px]" style={{ color: PALETTE.faint }}>
                    {c.firm}
                  </div>
                  <div
                    className="mt-0.5 inline-block rounded-sm px-1 text-[5px] md:text-[6px]"
                    style={{
                      backgroundColor: i >= 2 ? "rgba(232,179,57,0.18)" : "rgba(46,90,136,0.08)",
                      color: i >= 2 ? "#92400E" : PALETTE.blue,
                    }}
                  >
                    {c.age}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
