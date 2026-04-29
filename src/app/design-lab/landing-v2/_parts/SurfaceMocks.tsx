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
      line: "Saw your team led the Q4 software deal — the structure was wild…",
      tag: "ready",
    },
    {
      who: "Alex Park",
      firm: "Goldman Sachs · M&A Associate",
      warmth: 76,
      line: "Brown CS '20, same Fenway club as you — would love 15 minutes…",
      tag: "ready",
    },
    {
      who: "Sara Patel",
      firm: "Evercore · Sponsors Analyst",
      warmth: 82,
      line: "Both Rice '23, you mentored at TIE — looking at sponsors coverage…",
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
  // Archipelago — three islands with construction stages.
  // Stages: logs (just sent), foundation (replied), walls (coffee), roof (referral), home (interview).
  const ISLANDS = [
    { name: "Morgan Stanley", x: 22, y: 38, stage: "home", scale: 1 },
    { name: "Goldman Sachs", x: 56, y: 56, stage: "walls", scale: 0.9 },
    { name: "Evercore", x: 80, y: 32, stage: "foundation", scale: 0.8 },
  ];

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${PALETTE.bgWarm} 0%, ${PALETTE.bg} 100%)`,
      }}
      aria-hidden
    >
      {/* Header */}
      <div className="absolute left-3 top-3 flex items-baseline gap-2 md:left-4 md:top-4">
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

      {/* Wave lines for water atmosphere */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 70 Q 25 65 50 70 T 100 72"
          stroke="rgba(46,90,136,0.12)"
          strokeWidth="0.3"
          fill="none"
        />
        <path
          d="M 0 80 Q 30 76 60 81 T 100 83"
          stroke="rgba(46,90,136,0.08)"
          strokeWidth="0.3"
          fill="none"
        />
        <path
          d="M 0 90 Q 20 87 40 90 T 100 92"
          stroke="rgba(46,90,136,0.06)"
          strokeWidth="0.3"
          fill="none"
        />

        {ISLANDS.map((island, i) => {
          const cx = island.x;
          const cy = island.y;
          const w = 14 * island.scale;
          const h = 4 * island.scale;
          return (
            <g key={i}>
              {/* Island base — flattened ellipse */}
              <ellipse
                cx={cx}
                cy={cy + h * 0.6}
                rx={w}
                ry={h}
                fill={PALETTE.terracotta}
                opacity="0.75"
              />
              <ellipse
                cx={cx}
                cy={cy + h * 0.4}
                rx={w * 0.85}
                ry={h * 0.7}
                fill={PALETTE.bgWarm}
              />

              {/* Construction by stage */}
              {island.stage === "foundation" && (
                <rect
                  x={cx - 1.5}
                  y={cy - 0.5}
                  width="3"
                  height="1"
                  fill={PALETTE.muted}
                  opacity="0.6"
                />
              )}
              {island.stage === "walls" && (
                <>
                  <rect x={cx - 2} y={cy - 2} width="4" height="2" fill={PALETTE.cardBg} stroke={PALETTE.border} strokeWidth="0.15" />
                </>
              )}
              {island.stage === "home" && (
                <>
                  {/* Walls */}
                  <rect x={cx - 2.4} y={cy - 3} width="4.8" height="3" fill={PALETTE.cardBg} stroke={PALETTE.border} strokeWidth="0.15" />
                  {/* Roof */}
                  <polygon
                    points={`${cx - 2.8},${cy - 3} ${cx},${cy - 5} ${cx + 2.8},${cy - 3}`}
                    fill={PALETTE.terracotta}
                  />
                  {/* Door */}
                  <rect x={cx - 0.5} y={cy - 1.5} width="1" height="1.5" fill={PALETTE.blue} />
                  {/* Window */}
                  <rect x={cx - 1.8} y={cy - 2.4} width="0.8" height="0.8" fill={PALETTE.ochre} opacity="0.7" />
                </>
              )}

              {/* Bank label */}
              <text
                x={cx}
                y={cy + h * 1.8}
                textAnchor="middle"
                fontSize="2.2"
                fill={PALETTE.ink}
                fontFamily="var(--font-fraunces)"
              >
                {island.name}
              </text>
              <text
                x={cx}
                y={cy + h * 2.6}
                textAnchor="middle"
                fontSize="1.6"
                fill={PALETTE.faint}
              >
                {island.stage}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend bottom-right */}
      <div
        className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[6px] md:bottom-4 md:right-4 md:gap-2 md:text-[7px]"
        style={{
          backgroundColor: "rgba(255,255,255,0.7)",
          border: `1px solid ${PALETTE.border}`,
          backdropFilter: "blur(4px)",
          color: PALETTE.muted,
        }}
      >
        <span>logs → foundation → walls → roof → home</span>
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
