const KPIS = [
  { label: "sent", value: 23, trend: "+8 this week" },
  { label: "replies", value: 5, trend: "22% rate" },
  { label: "coffee booked", value: 1, trend: "first chat Thu" },
  { label: "day streak", value: 7, trend: "personal best" },
];

type Point = { week: string; actual: number | null; target: number };
const TRAJECTORY: Point[] = [
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

const FUNNEL = [
  { name: "Outreach", current: 23, target: 100 },
  { name: "Replies", current: 5, target: 30 },
  { name: "Coffee", current: 1, target: 15 },
  { name: "Referral", current: 0, target: 6 },
  { name: "Offer", current: 0, target: 1 },
];

const COMPANIES = [
  { name: "Stripe", sent: 4, total: 8, replies: 2, next: "Reply to Maya" },
  { name: "Linear", sent: 5, total: 6, replies: 3, next: "Coffee Thu 2pm" },
  { name: "Notion", sent: 3, total: 9, replies: 1, next: "Follow up" },
  { name: "Figma", sent: 2, total: 12, replies: 0, next: "Draft outreach" },
  { name: "Rippling", sent: 0, total: 10, replies: 0, next: "Pick first alum" },
];

const ACTIVITY = [
  { xp: 25, text: "Reply from Maya (Linear)", when: "2h ago" },
  { xp: 10, text: "Sent to Figma", when: "6h ago" },
  { xp: 10, text: "Sent to Linear", when: "1d ago" },
];

const BADGES = ["First 10", "Week Warrior", "First Reply"];

export default function PipelineB() {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[#FAF7F1] text-[#14182A]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex items-center justify-between">
          <p className="text-2xl italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">alma</p>
          <nav className="flex items-center gap-6 text-sm text-[#6B7280]">
            <span className="font-medium text-[#14182A]">Pipeline</span>
            <span>Companies</span>
            <span>CRM</span>
            <a href="/design-lab" className="text-[#2E5A88] hover:underline">&larr; lab</a>
          </nav>
        </header>

        <div className="mt-10 flex items-baseline justify-between">
          <h1 className="text-3xl font-[family-name:var(--font-fraunces)] text-[#14182A]">Your pipeline</h1>
          <p className="text-sm text-[#6B7280]">Week 3 of 12 &middot; Spring ’26</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {KPIS.map((k) => (
            <div key={k.label} className="rounded-2xl border border-[#ECE7DE] bg-white px-5 py-4">
              <p className="text-5xl font-[family-name:var(--font-fraunces)] tabular-nums leading-none text-[#14182A]">
                {k.value}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-[#6B7280]">{k.label}</p>
              <p className="mt-1 text-[11px] text-[#C86B4F]">{k.trend}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-[#ECE7DE] bg-white p-6">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#6B7280]">Trajectory &middot; 12 wk</p>
              <p className="text-xs text-[#6B7280]">
                <span className="mr-3"><span className="inline-block h-[2px] w-4 bg-[#2E5A88] align-middle" /> actual</span>
                <span><span className="inline-block h-[2px] w-4 bg-[#C86B4F] align-middle border-b border-dashed" /> on-pace</span>
              </p>
            </div>
            <Trajectory />
          </div>

          <div className="rounded-2xl border border-[#ECE7DE] bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#6B7280]">Funnel</p>
            <div className="mt-4 space-y-3">
              {FUNNEL.map((f) => {
                const pct = Math.min((f.current / f.target) * 100, 100);
                return (
                  <div key={f.name}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-[#14182A]">{f.name}</span>
                      <span className="tabular-nums text-[#6B7280]">{f.current}/{f.target}</span>
                    </div>
                    <div className="mt-1 h-[6px] overflow-hidden rounded-full bg-[#F3EFE7]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#1B3B5F] to-[#3F6FA3]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[#ECE7DE] bg-white">
          <div className="flex items-baseline justify-between px-6 pt-5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#6B7280]">Companies</p>
            <p className="text-xs text-[#6B7280]">{COMPANIES.length} active</p>
          </div>
          <div className="mt-3 divide-y divide-[#ECE7DE]">
            {COMPANIES.map((c) => {
              const pct = c.total > 0 ? (c.sent / c.total) * 100 : 0;
              return (
                <div key={c.name} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-4 px-6 py-3.5 hover:bg-[#FBF9F4] cursor-pointer transition-colors">
                  <p className="text-sm font-semibold text-[#14182A]">{c.name}</p>
                  <div className="flex items-center gap-3">
                    <div className="h-[4px] flex-1 max-w-[120px] overflow-hidden rounded-full bg-[#F3EFE7]">
                      <div className="h-full rounded-full bg-[#2E5A88]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-[#6B7280]">{c.sent}/{c.total}</span>
                  </div>
                  <p className="text-xs text-[#6B7280]">
                    {c.replies > 0 ? <span className="text-[#C86B4F]">{c.replies} replies</span> : <span>&mdash;</span>}
                  </p>
                  <p className="text-xs text-[#14182A]">
                    <span className="text-[#6B7280]">next:</span> {c.next} →
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[#ECE7DE] bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#6B7280]">Recent activity</p>
            <div className="mt-4 space-y-3">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3EFE7] text-xs font-semibold tabular-nums text-[#1B3B5F]">
                    +{a.xp}
                  </span>
                  <p className="flex-1 text-sm text-[#14182A]">{a.text}</p>
                  <p className="text-xs text-[#6B7280]">{a.when}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#ECE7DE] bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#6B7280]">Badges &middot; 3 of 12</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {BADGES.map((b) => (
                <span key={b} className="inline-flex items-center gap-2 rounded-full border border-[#E8B339]/40 bg-[#FFF8E8] px-3 py-1.5 text-xs font-medium text-[#B08100]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E8B339]" />
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Trajectory() {
  const w = 720;
  const h = 220;
  const pad = { l: 36, r: 16, t: 12, b: 30 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const maxY = 100;
  const x = (i: number) => pad.l + (i / (TRAJECTORY.length - 1)) * innerW;
  const y = (v: number) => pad.t + innerH - (v / maxY) * innerH;

  const actualPts = TRAJECTORY
    .map((p, i) => (p.actual !== null ? `${x(i)},${y(p.actual)}` : null))
    .filter((s): s is string => s !== null)
    .join(" ");
  const targetPts = TRAJECTORY.map((p, i) => `${x(i)},${y(p.target)}`).join(" ");

  let lastActualIdx = -1;
  TRAJECTORY.forEach((p, i) => {
    if (p.actual !== null) lastActualIdx = i;
  });
  const lastPt = lastActualIdx >= 0 ? { x: x(lastActualIdx), y: y(TRAJECTORY[lastActualIdx].actual as number) } : null;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-56 w-full">
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="#ECE7DE" strokeWidth={1} />
          <text x={pad.l - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#9AA0A8">{v}</text>
        </g>
      ))}
      <polyline points={targetPts} fill="none" stroke="#C86B4F" strokeWidth={1.5} strokeDasharray="4 4" />
      <polyline points={actualPts} fill="none" stroke="#2E5A88" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {lastPt && (
        <>
          <circle cx={lastPt.x} cy={lastPt.y} r={8} fill="#2E5A88" opacity={0.15} />
          <circle cx={lastPt.x} cy={lastPt.y} r={4} fill="#2E5A88" stroke="white" strokeWidth={2} />
        </>
      )}
      <text x={pad.l} y={h - 8} fontSize="10" fill="#9AA0A8">Mar 10</text>
      <text x={lastPt ? lastPt.x : pad.l + innerW / 2} y={h - 8} fontSize="10" fill="#1B3B5F" textAnchor="middle" fontWeight="600">
        Apr 23
      </text>
      <text x={w - pad.r} y={h - 8} fontSize="10" fill="#9AA0A8" textAnchor="end">May 26</text>
    </svg>
  );
}
