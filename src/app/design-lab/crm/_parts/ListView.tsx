import type { Connection, Stage } from "./ConnectionCard";

const STAGE_STYLES: Record<Stage, { label: string; bg: string; text: string }> = {
  sent: { label: "Sent", bg: "bg-[#F4EDDB]", text: "text-[#5C6472]" },
  replied: { label: "Replied", bg: "bg-[#FDEFE7]", text: "text-[#C86B4F]" },
  coffee: { label: "Coffee", bg: "bg-[#F0F4FA]", text: "text-[#1B3B5F]" },
  referral: { label: "Referral", bg: "bg-[#EAF0E7]", text: "text-[#4D6A4A]" },
  interview: { label: "Interview", bg: "bg-[#FFF8E8]", text: "text-[#B08100]" },
  offer: { label: "Offer", bg: "bg-[#1B3B5F]", text: "text-white" },
};

export function ListView({ connections }: { connections: Connection[] }) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#D9CFB5] bg-white">
      <div className="grid grid-cols-[1fr_140px_120px_110px_70px_1fr_auto] items-center gap-4 border-b border-[#ECE5D0] bg-[#F8F2E2] px-5 py-3 text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">
        <span>Name</span>
        <span>Company</span>
        <span>Role</span>
        <span>Stage</span>
        <span className="text-right">Warmth</span>
        <span>Last activity</span>
        <span />
      </div>
      <div className="divide-y divide-[#ECE5D0]">
        {connections.map((c) => {
          const s = STAGE_STYLES[c.stage];
          const ago = c.daysAgo === 0 ? "today" : c.daysAgo === 1 ? "yesterday" : `${c.daysAgo}d ago`;
          return (
            <div
              key={c.id}
              className={`grid cursor-pointer grid-cols-[1fr_140px_120px_110px_70px_1fr_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-[#FBF7EC] ${
                c.fresh ? "bg-[#FDEFE7]/30" : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4EDDB] text-xs font-[family-name:var(--font-fraunces)] text-[#1B3B5F]">
                  {c.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#14182A]">{c.name}</p>
                  <p className="truncate text-[11px] text-[#5C6472]">
                    {c.university} ’{c.classOf ? String(c.classOf).slice(-2) : "—"}
                  </p>
                </div>
              </div>
              <p className="truncate text-sm text-[#14182A]">{c.company}</p>
              <p className="truncate text-xs text-[#5C6472]">{c.role}</p>
              <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${s.bg} ${s.text}`}>
                {s.label}
              </span>
              <p className="text-right font-[family-name:var(--font-fraunces)] text-base tabular-nums text-[#1B3B5F]">
                {c.warmth}
              </p>
              <div className="min-w-0">
                <p className="truncate text-xs text-[#14182A]">{c.lastAction}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] tabular-nums text-[#5C6472]">{ago}</p>
                  {c.fresh && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[#C86B4F]">
                      <span className="h-1 w-1 rounded-full bg-[#C86B4F]" />fresh
                    </span>
                  )}
                  {c.needsFollowUp && !c.fresh && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[#C86B4F]">
                      <span className="h-1 w-1 rounded-full bg-[#C86B4F]" />nudge
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="rounded-full border border-[#D9CFB5] px-3 py-1 text-[11px] font-medium text-[#1B3B5F] transition-colors hover:border-[#2E5A88] hover:bg-[#F4EDDB]"
              >
                Open
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
