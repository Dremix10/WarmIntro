// Inline product mocks for the landing surfaces section.
// Drawn in React + Tailwind so they stay crisp at any size and match the
// Alma palette exactly. Each mirrors what the actual page renders:
//   TodayMock     → /today    (queue + trust dial)
//   DeckMock      → /deck     (firm decks + level pills)
//   PipelineMock  → /pipeline (transit map by firm)
// Demo data is illustrative.

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
      line: "Saw your team led the Q4 software deal",
    },
    {
      who: "Alex Park",
      firm: "Goldman Sachs · M&A",
      warmth: 76,
      line: "Same-school CS '20, shared club overlap",
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
            Today
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

export function DeckMock() {
  // Decks miniature — mirrors what /deck actually renders. Two firm decks,
  // each shown as a small stacked card with firm name + level pill. Sized
  // for the 16:10 surface card.
  const DECKS = [
    { firm: "Lazard", tier: "EB · Restructuring", count: 2, roman: "V", name: "1st Round", color: "#5A3D5C", levelTone: "gold" },
    { firm: "Goldman Sachs", tier: "BB · M&A", count: 3, roman: "IV", name: "Referral", color: "#2E5A88", levelTone: "ochre" },
    { firm: "Morgan Stanley", tier: "BB · TMT", count: 4, roman: "III", name: "Coffee", color: "#1B3B5F", levelTone: "blue" },
  ];
  const tonePill = (t: string) =>
    t === "gold"
      ? { bg: "rgba(201,162,76,0.15)", border: "rgba(201,162,76,0.45)", color: "#8E6E14" }
      : t === "ochre"
        ? { bg: "rgba(232,179,57,0.15)", border: "rgba(232,179,57,0.45)", color: "#92400E" }
        : { bg: "rgba(46,90,136,0.10)", border: "rgba(46,90,136,0.30)", color: PALETTE.blue };

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden p-4 md:p-5"
      style={{ backgroundColor: PALETTE.bg }}
      aria-hidden
    >
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-[15px] md:text-[17px]"
            style={{ fontFamily: "var(--font-fraunces)", color: PALETTE.ink, fontWeight: 600 }}
          >
            Deck
          </span>
          <span className="text-[9px] md:text-[10px]" style={{ color: PALETTE.faint }}>
            3 firms · 9 bankers
          </span>
        </div>
        <div
          className="flex shrink-0 items-center gap-0.5 rounded-full p-0.5 text-[8px] md:text-[9px]"
          style={{ backgroundColor: PALETTE.cardBg, border: `1px solid ${PALETTE.border}` }}
        >
          <span
            className="rounded-full px-1.5 py-[2px] font-semibold text-white"
            style={{ backgroundColor: PALETTE.blue }}
          >
            All
          </span>
          <span className="px-1 py-[2px]" style={{ color: PALETTE.muted }}>BB</span>
          <span className="px-1 py-[2px]" style={{ color: PALETTE.muted }}>EB</span>
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-2 md:mt-3 md:gap-2.5">
        {DECKS.map((d, i) => {
          const pill = tonePill(d.levelTone);
          return (
            <div key={i} className="relative flex-1">
              {/* Ghost cards behind */}
              <div
                className="absolute inset-0 rounded-[10px]"
                style={{
                  backgroundColor: PALETTE.cardBg,
                  border: `1px solid ${PALETTE.border}`,
                  transform: "translate(-3px, 2px) rotate(-1.4deg)",
                  opacity: 0.85,
                }}
              />
              <div
                className="absolute inset-0 rounded-[10px]"
                style={{
                  backgroundColor: PALETTE.cardBg,
                  border: `1px solid ${PALETTE.border}`,
                  transform: "translate(3px, 2px) rotate(1.4deg)",
                  opacity: 0.85,
                }}
              />
              {/* Top card */}
              <div
                className="relative flex h-full items-center justify-between gap-2 rounded-[10px] px-2.5 md:px-3"
                style={{
                  backgroundImage: "linear-gradient(180deg, #fff 0%, #FCFAF5 100%)",
                  border: `1px solid ${PALETTE.border}`,
                  boxShadow: "0 1px 0 0 rgba(255,255,255,0.9) inset, 0 4px 10px -4px rgba(20,24,42,0.10)",
                }}
              >
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[10px] leading-tight md:text-[11px]"
                    style={{ fontFamily: "var(--font-fraunces)", color: PALETTE.ink, fontWeight: 600 }}
                  >
                    {d.firm}
                  </div>
                  <div className="text-[7px] md:text-[8px]" style={{ color: PALETTE.faint }}>
                    {d.count} bankers · {d.tier}
                  </div>
                </div>
                <div
                  className="flex shrink-0 items-baseline gap-[3px] rounded-full px-1.5 py-[1px] text-[7px] font-semibold md:text-[8px]"
                  style={{
                    backgroundColor: pill.bg,
                    border: `1px solid ${pill.border}`,
                    color: pill.color,
                  }}
                >
                  <span style={{ fontFamily: "var(--font-fraunces)", fontStyle: "italic", fontWeight: 600 }}>
                    {d.roman}
                  </span>
                  <span style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "6px" }}>
                    {d.name}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PipelineMock() {
  // Transit-map miniature. Mirrors what /pipeline actually renders: each
  // firm is a horizontal line, stations are stages, bankers are circular
  // markers. Sized to the 16:10 surface card.
  type Stage = "sent" | "replied" | "coffee" | "referral" | "first" | "offer";
  const STATIONS: { stage: Stage; label: string }[] = [
    { stage: "sent", label: "Sent" },
    { stage: "replied", label: "Replied" },
    { stage: "coffee", label: "Coffee" },
    { stage: "referral", label: "Referral" },
    { stage: "first", label: "1st Rd" },
    { stage: "offer", label: "Offer" },
  ];
  type Marker = { stage: Stage; initial: string; size: "s" | "m" | "l"; status?: "positive" | "due" };
  type Firm = { name: string; tier: string; color: string; markers: Marker[] };

  const FIRMS: Firm[] = [
    {
      name: "Lazard",
      tier: "EB",
      color: "#5A3D5C",
      markers: [
        { stage: "offer", initial: "R", size: "l", status: "positive" },
      ],
    },
    {
      name: "Evercore",
      tier: "EB",
      color: PALETTE.terracotta,
      markers: [
        { stage: "coffee", initial: "N", size: "m", status: "positive" },
        { stage: "referral", initial: "S", size: "l", status: "positive" },
      ],
    },
    {
      name: "Morgan Stanley",
      tier: "BB",
      color: PALETTE.blue,
      markers: [
        { stage: "sent", initial: "J", size: "s", status: "due" },
        { stage: "replied", initial: "R", size: "m", status: "positive" },
        { stage: "coffee", initial: "M", size: "l", status: "positive" },
      ],
    },
    {
      name: "Goldman Sachs",
      tier: "BB",
      color: PALETTE.blueHover,
      markers: [
        { stage: "sent", initial: "S", size: "s" },
        { stage: "replied", initial: "A", size: "m", status: "positive" },
      ],
    },
  ];

  const STAGE_INDEX: Record<Stage, number> = {
    sent: 0,
    replied: 1,
    coffee: 2,
    referral: 3,
    first: 4,
    offer: 5,
  };
  const TICK_CENTERS = STATIONS.map((_, i) => ((i + 0.5) * 100) / STATIONS.length);
  function highestStageIndex(firm: Firm): number {
    return firm.markers.reduce(
      (highest, marker) => Math.max(highest, STAGE_INDEX[marker.stage]),
      -1,
    );
  }
  function fillEndForFirm(firm: Firm): number {
    const highest = highestStageIndex(firm);
    return highest === STATIONS.length - 1 ? 100 : TICK_CENTERS[Math.max(0, highest)];
  }

  const sizePx: Record<Marker["size"], number> = { s: 12, m: 14, l: 17 };
  const fontPx: Record<Marker["size"], number> = { s: 7, m: 8, l: 10 };

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden p-3 md:p-4"
      style={{ backgroundColor: PALETTE.bg }}
      aria-hidden
    >
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span
            className="text-[13px] md:text-[15px]"
            style={{ fontFamily: "var(--font-fraunces)", color: PALETTE.ink, fontWeight: 600 }}
          >
            Pipeline
          </span>
          <span className="text-[8px] md:text-[9px]" style={{ color: PALETTE.faint }}>
            4 firms · 8 active
          </span>
        </div>
        <div
          className="flex shrink-0 items-center gap-0.5 rounded-full p-0.5 text-[7px] md:text-[8px]"
          style={{ backgroundColor: PALETTE.cardBg, border: `1px solid ${PALETTE.border}` }}
        >
          <span
            className="rounded-full px-1.5 py-[2px] font-semibold text-white"
            style={{ backgroundColor: PALETTE.blue }}
          >
            All
          </span>
          <span className="px-1 py-[2px]" style={{ color: PALETTE.muted }}>
            BB
          </span>
          <span className="px-1 py-[2px]" style={{ color: PALETTE.muted }}>
            EB
          </span>
          <span className="px-1 py-[2px]" style={{ color: PALETTE.muted }}>
            MM
          </span>
        </div>
      </div>

      {/* Station headers */}
      <div
        className="mt-2.5 grid items-baseline pb-1 md:mt-3"
        style={{ gridTemplateColumns: `52px repeat(${STATIONS.length}, minmax(0, 1fr))` }}
      >
        <div />
        {STATIONS.map((st) => (
          <div
            key={st.stage}
            className="text-center text-[6px] font-bold uppercase tracking-[0.06em] md:text-[7px]"
            style={{ color: PALETTE.muted }}
          >
            {st.label}
          </div>
        ))}
      </div>

      {/* Firm rows */}
      <div className="flex flex-1 flex-col justify-around">
        {FIRMS.map((firm) => (
          <div
            key={firm.name}
            className="relative grid items-center"
            style={{
              gridTemplateColumns: `52px repeat(${STATIONS.length}, minmax(0, 1fr))`,
              color: firm.color,
            }}
          >
            {/* Firm label */}
            <div className="pr-1.5 text-right">
              <div
                className="truncate text-[7px] leading-tight md:text-[8px]"
                style={{ fontFamily: "var(--font-fraunces)", color: PALETTE.ink, fontWeight: 600 }}
              >
                {firm.name}
              </div>
              <div
                className="text-[5px] font-bold uppercase tracking-[0.06em] md:text-[6px]"
                style={{ color: PALETTE.faint }}
              >
                {firm.tier}
              </div>
            </div>

            {/* The line */}
            <svg
              className="pointer-events-none absolute"
              style={{ left: "52px", right: 0, top: 0, height: "100%" }}
              preserveAspectRatio="none"
              viewBox="0 0 100 24"
            >
              <path
                d="M 0 12 L 100 12"
                stroke={PALETTE.border}
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
                strokeDasharray="1.5 2.5"
                opacity="0.85"
              />
              <path
                d={`M 0 12 L ${fillEndForFirm(firm)} 12`}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Stations + markers */}
            {STATIONS.map((st, idx) => {
              const marker = firm.markers.find((m) => m.stage === st.stage);
              const reached = idx <= highestStageIndex(firm);
              return (
                <div
                  key={st.stage}
                  className="relative flex items-center justify-center"
                  style={{ height: "24px" }}
                >
                  {/* Empty tick on the line */}
                  <span
                    className="absolute z-[1] rounded-full"
                    style={{
                      width: "4px",
                      height: "4px",
                      backgroundColor: PALETTE.cardBg,
                      border: `1.2px solid ${reached ? firm.color : PALETTE.border}`,
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                  {/* Banker marker */}
                  {marker && (
                    <div
                      className="relative z-[2] flex items-center justify-center rounded-full font-semibold text-white"
                      style={{
                        width: `${sizePx[marker.size]}px`,
                        height: `${sizePx[marker.size]}px`,
                        fontSize: `${fontPx[marker.size]}px`,
                        fontFamily: "var(--font-fraunces)",
                        backgroundColor: firm.color,
                        boxShadow:
                          marker.status === "positive"
                            ? `0 0 0 2px ${PALETTE.bg}, 0 0 0 4px rgba(46,90,136,0.45)`
                            : marker.status === "due"
                              ? `0 0 0 2px ${PALETTE.bg}, 0 0 0 4px rgba(232,179,57,0.5)`
                              : `0 0 0 2px ${PALETTE.bg}`,
                      }}
                    >
                      {marker.initial}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
