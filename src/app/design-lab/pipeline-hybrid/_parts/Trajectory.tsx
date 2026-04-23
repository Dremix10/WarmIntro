type Point = { week: string; actual: number | null; target: number };

const DATA: Point[] = [
  { week: "Mar 10", actual: 2, target: 0 },
  { week: "Mar 17", actual: 5, target: 8 },
  { week: "Mar 24", actual: 9, target: 17 },
  { week: "Mar 31", actual: 14, target: 25 },
  { week: "Apr 7", actual: 18, target: 34 },
  { week: "Apr 14", actual: 21, target: 42 },
  { week: "Apr 23", actual: 23, target: 50 },
  { week: "Apr 28", actual: null, target: 58 },
  { week: "May 5", actual: null, target: 67 },
  { week: "May 12", actual: null, target: 75 },
  { week: "May 19", actual: null, target: 84 },
  { week: "May 26", actual: null, target: 100 },
];

const W = 1000;
const H = 260;
const PAD = { l: 40, r: 20, t: 16, b: 34 };
const INNER_W = W - PAD.l - PAD.r;
const INNER_H = H - PAD.t - PAD.b;
const MAX_Y = 100;

const xAt = (i: number) => PAD.l + (i / (DATA.length - 1)) * INNER_W;
const yAt = (v: number) => PAD.t + INNER_H - (v / MAX_Y) * INNER_H;

export function Trajectory() {
  const actualCoords = DATA.map((p, i) =>
    p.actual !== null ? ([xAt(i), yAt(p.actual)] as const) : null
  ).filter((c): c is readonly [number, number] => c !== null);

  const targetPoints = DATA.map((_, i) => `${xAt(i)},${yAt(DATA[i].target)}`).join(" ");
  const actualLinePoints = actualCoords.map(([x, y]) => `${x},${y}`).join(" ");

  const baseline = yAt(0);
  const areaPath = actualCoords.length
    ? [
        `M ${actualCoords[0][0]} ${baseline}`,
        ...actualCoords.map(([x, y]) => `L ${x} ${y}`),
        `L ${actualCoords[actualCoords.length - 1][0]} ${baseline}`,
        "Z",
      ].join(" ")
    : "";

  const last = actualCoords.length ? actualCoords[actualCoords.length - 1] : null;
  const todayX = last ? last[0] : xAt(0);
  const todayY = last ? last[1] : yAt(0);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="mt-4 block h-64 w-full"
    >
      <defs>
        <linearGradient id="traj-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E5A88" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#2E5A88" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0, 25, 50, 75, 100].map((v) => (
        <line
          key={v}
          x1={PAD.l}
          x2={W - PAD.r}
          y1={yAt(v)}
          y2={yAt(v)}
          stroke="#ECE5D0"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      <line
        x1={todayX}
        x2={todayX}
        y1={PAD.t}
        y2={baseline}
        stroke="#D9CFB5"
        strokeWidth={1}
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />

      {areaPath && <path d={areaPath} fill="url(#traj-fill)" />}

      <polyline
        points={targetPoints}
        fill="none"
        stroke="#C86B4F"
        strokeWidth={1.5}
        strokeDasharray="5 5"
        vectorEffect="non-scaling-stroke"
      />

      <polyline
        points={actualLinePoints}
        fill="none"
        stroke="#2E5A88"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {last && (
        <>
          <circle cx={todayX} cy={todayY} r={9} fill="#2E5A88" opacity={0.18} />
          <circle
            cx={todayX}
            cy={todayY}
            r={4.5}
            fill="#2E5A88"
            stroke="white"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
  );
}

export function TrajectoryAxis() {
  return (
    <div className="mt-1 flex justify-between px-[4%] text-[10px] text-[#9A9685]">
      <span>Mar 10</span>
      <span className="font-semibold text-[#1B3B5F]">Apr 23 · today</span>
      <span>May 26</span>
    </div>
  );
}
