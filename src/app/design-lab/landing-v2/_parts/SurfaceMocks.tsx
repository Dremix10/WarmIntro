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
  const drafts = [
    {
      who: "Maya Chen",
      firm: "Morgan Stanley · TMT VP",
      warmth: 88,
      line: "Saw your team led the Q4 software deal. The structure was wild…",
      tag: "ready",
    },
    {
      who: "Alex Park",
      firm: "Goldman Sachs · M&A Associate",
      warmth: 76,
      line: "Brown CS '20, same Fenway club as you. Would love 15 minutes…",
      tag: "ready",
    },
    {
      who: "Sara Patel",
      firm: "Evercore · Sponsors Analyst",
      warmth: 82,
      line: "Both Rice '23, you mentored at TIE. Looking at sponsors coverage…",
      tag: "review",
    },
  ];

  return (
    <div
      className="relative h-full w-full overflow-hidden p-4 md:p-5"
      style={{ backgroundColor: PALETTE.bg }}
      aria-hidden
    >
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[14px] md:text-base"
            style={{ fontFamily: "var(--font-fraunces)", color: PALETTE.ink }}
          >
            Today
          </span>
          <span className="text-[8px] md:text-[9px]" style={{ color: PALETTE.faint }}>
            Tue · Apr 29
          </span>
        </div>
        {/* Trust dial pill */}
        <div
          className="flex items-center gap-0.5 rounded-full p-0.5 text-[7px] md:text-[8px]"
          style={{ backgroundColor: PALETTE.cardBg, border: `1px solid ${PALETTE.border}` }}
        >
          <span
            className="rounded-full px-1.5 py-0.5 font-semibold text-white"
            style={{ backgroundColor: PALETTE.blue }}
          >
            Copilot
          </span>
          <span className="px-1.5 py-0.5" style={{ color: PALETTE.muted }}>
            Preview
          </span>
          <span className="px-1.5 py-0.5" style={{ color: PALETTE.muted }}>
            Auto
          </span>
        </div>
      </div>

      <div className="mt-2 flex gap-3 text-[7px] md:text-[8px]" style={{ color: PALETTE.muted }}>
        <span>
          <strong style={{ color: PALETTE.ink }}>3</strong> drafts ready
        </span>
        <span>
          <strong style={{ color: PALETTE.ink }}>12</strong> sent this week
        </span>
        <span>
          <strong style={{ color: PALETTE.ink }}>4</strong> replies
        </span>
      </div>

      <div className="mt-2 space-y-1.5 md:mt-3 md:space-y-2">
        {drafts.map((d, i) => (
          <div
            key={i}
            className="rounded-md p-1.5 md:rounded-lg md:p-2"
            style={{ backgroundColor: PALETTE.cardBg, border: `1px solid ${PALETTE.border}` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-semibold md:text-[10px]" style={{ color: PALETTE.ink }}>
                {d.who}
              </span>
              <span
                className="rounded-full px-1 py-px text-[6px] font-semibold tracking-wide md:px-1.5 md:text-[7px]"
                style={{
                  backgroundColor: "rgba(27,59,95,0.12)",
                  color: PALETTE.blue,
                }}
              >
                warmth {d.warmth}
              </span>
            </div>
            <div className="text-[7px] md:text-[8px]" style={{ color: PALETTE.faint }}>
              {d.firm}
            </div>
            <div
              className="mt-1 truncate text-[8px] italic md:text-[9px]"
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
  // Archipelago — bird's-eye view of three banks as islands with progressively
  // built homes. Stages: logs → foundation → walls → roof → home.
  // SVG is drawn at viewBox 0 0 320 200 (16:10) so all coordinates are honest pixels.
  const ISLANDS = [
    { name: "Morgan Stanley", role: "TMT · home", cx: 80, cy: 110, stage: "home", base: 46 },
    { name: "Goldman Sachs", role: "M&A · roof", cx: 200, cy: 138, stage: "roof", base: 40 },
    { name: "Evercore", role: "Sponsors · walls", cx: 268, cy: 80, stage: "walls", base: 34 },
  ];

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: `radial-gradient(120% 80% at 50% 10%, #F4EDDB 0%, #EAE3D2 55%, #E3DCCB 100%)`,
      }}
      aria-hidden
    >
      {/* Header chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-baseline justify-between px-3 pt-3 md:px-4 md:pt-4">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[12px] md:text-[14px]"
            style={{ fontFamily: "var(--font-fraunces)", color: PALETTE.ink }}
          >
            Archipelago
          </span>
          <span className="text-[7px] md:text-[8px]" style={{ color: PALETTE.faint }}>
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
          <radialGradient id="island-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(20,24,42,0.18)" />
            <stop offset="100%" stopColor="rgba(20,24,42,0)" />
          </radialGradient>
          <linearGradient id="sand" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F4EDDB" />
            <stop offset="100%" stopColor="#E3D5B3" />
          </linearGradient>
          <linearGradient id="grass" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A6B58A" />
            <stop offset="100%" stopColor="#8C9D6F" />
          </linearGradient>
        </defs>

        {/* Water — depth lines for rhythm, no blue fill (we're light/sand themed) */}
        {[0.06, 0.05, 0.04, 0.035, 0.03].map((op, i) => {
          const y = 152 + i * 9;
          const a = 6 - i;
          return (
            <path
              key={i}
              d={`M 0 ${y} Q 80 ${y - a} 160 ${y} T 320 ${y}`}
              stroke={`rgba(46,90,136,${op})`}
              strokeWidth="1"
              fill="none"
            />
          );
        })}

        {/* Faint connection paths between islands — the "warm intro" lines */}
        <path
          d="M 80 110 Q 140 70 200 138"
          stroke="rgba(46,90,136,0.22)"
          strokeWidth="0.8"
          strokeDasharray="2 3"
          fill="none"
        />
        <path
          d="M 200 138 Q 235 110 268 80"
          stroke="rgba(46,90,136,0.15)"
          strokeWidth="0.8"
          strokeDasharray="2 3"
          fill="none"
        />

        {ISLANDS.map((island, i) => {
          const { cx, cy, base, stage, name, role } = island;
          return (
            <g key={i}>
              {/* Drop shadow on water */}
              <ellipse
                cx={cx}
                cy={cy + base * 0.55}
                rx={base * 1.1}
                ry={base * 0.32}
                fill="url(#island-shadow)"
              />
              {/* Sand outer */}
              <ellipse cx={cx} cy={cy + base * 0.4} rx={base} ry={base * 0.42} fill="url(#sand)" />
              {/* Grass plateau */}
              <ellipse
                cx={cx}
                cy={cy + base * 0.32}
                rx={base * 0.78}
                ry={base * 0.32}
                fill="url(#grass)"
              />
              {/* Subtle highlight stroke on grass */}
              <ellipse
                cx={cx}
                cy={cy + base * 0.28}
                rx={base * 0.78}
                ry={base * 0.28}
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="0.5"
              />

              {/* Construction by stage, drawn from the plateau center upwards */}
              {stage === "logs" && (
                <g>
                  <rect x={cx - 5} y={cy + base * 0.28 - 2} width="10" height="1.4" fill="#8B6F4E" rx="0.3" />
                  <rect x={cx - 5} y={cy + base * 0.28 - 4} width="10" height="1.4" fill="#A07F58" rx="0.3" />
                </g>
              )}
              {stage === "foundation" && (
                <g>
                  <rect
                    x={cx - 7}
                    y={cy + base * 0.28 - 3}
                    width="14"
                    height="3"
                    fill="#B5A88D"
                    stroke="rgba(20,24,42,0.18)"
                    strokeWidth="0.4"
                  />
                </g>
              )}
              {stage === "walls" && (
                <g>
                  {/* Foundation */}
                  <rect x={cx - 8} y={cy + base * 0.28 - 2} width="16" height="2" fill="#B5A88D" />
                  {/* Walls */}
                  <rect
                    x={cx - 7}
                    y={cy + base * 0.28 - 8}
                    width="14"
                    height="6"
                    fill="#FCFAF5"
                    stroke="rgba(20,24,42,0.18)"
                    strokeWidth="0.4"
                  />
                </g>
              )}
              {stage === "roof" && (
                <g>
                  <rect x={cx - 8} y={cy + base * 0.28 - 2} width="16" height="2" fill="#B5A88D" />
                  <rect
                    x={cx - 7}
                    y={cy + base * 0.28 - 8}
                    width="14"
                    height="6"
                    fill="#FCFAF5"
                    stroke="rgba(20,24,42,0.18)"
                    strokeWidth="0.4"
                  />
                  <polygon
                    points={`${cx - 8.5},${cy + base * 0.28 - 8} ${cx},${cy + base * 0.28 - 14} ${cx + 8.5},${cy + base * 0.28 - 8}`}
                    fill={PALETTE.terracotta}
                    stroke="rgba(20,24,42,0.18)"
                    strokeWidth="0.4"
                  />
                </g>
              )}
              {stage === "home" && (
                <g>
                  <rect x={cx - 8} y={cy + base * 0.28 - 2} width="16" height="2" fill="#B5A88D" />
                  <rect
                    x={cx - 7}
                    y={cy + base * 0.28 - 8}
                    width="14"
                    height="6"
                    fill="#FCFAF5"
                    stroke="rgba(20,24,42,0.18)"
                    strokeWidth="0.4"
                  />
                  <polygon
                    points={`${cx - 8.5},${cy + base * 0.28 - 8} ${cx},${cy + base * 0.28 - 14} ${cx + 8.5},${cy + base * 0.28 - 8}`}
                    fill={PALETTE.terracotta}
                    stroke="rgba(20,24,42,0.18)"
                    strokeWidth="0.4"
                  />
                  {/* Door */}
                  <rect x={cx - 1} y={cy + base * 0.28 - 5} width="2" height="3" fill={PALETTE.blue} />
                  {/* Window left */}
                  <rect x={cx - 5} y={cy + base * 0.28 - 6.5} width="2.5" height="2" fill={PALETTE.ochre} opacity="0.85" />
                  {/* Window right */}
                  <rect x={cx + 2.5} y={cy + base * 0.28 - 6.5} width="2.5" height="2" fill={PALETTE.ochre} opacity="0.85" />
                  {/* Chimney smoke */}
                  <circle cx={cx + 4} cy={cy + base * 0.28 - 16} r="0.8" fill="rgba(255,255,255,0.7)" />
                  <circle cx={cx + 5} cy={cy + base * 0.28 - 18} r="1.2" fill="rgba(255,255,255,0.5)" />
                  <circle cx={cx + 4.2} cy={cy + base * 0.28 - 20} r="1.6" fill="rgba(255,255,255,0.35)" />
                </g>
              )}

              {/* Labels under island */}
              <text
                x={cx}
                y={cy + base * 0.78}
                textAnchor="middle"
                fontSize="7"
                fill={PALETTE.ink}
                fontFamily="var(--font-fraunces)"
              >
                {name}
              </text>
              <text
                x={cx}
                y={cy + base * 0.78 + 8}
                textAnchor="middle"
                fontSize="5"
                fill={PALETTE.faint}
              >
                {role}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Stage legend bottom-left */}
      <div
        className="absolute bottom-3 left-3 flex items-center gap-1 rounded-md px-1.5 py-1 text-[6px] md:bottom-4 md:left-4 md:gap-1.5 md:text-[7px]"
        style={{
          backgroundColor: "rgba(255,255,255,0.78)",
          border: `1px solid ${PALETTE.border}`,
          color: PALETTE.muted,
        }}
      >
        logs · foundation · walls · roof · <span style={{ color: PALETTE.ink, fontWeight: 600 }}>home</span>
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
