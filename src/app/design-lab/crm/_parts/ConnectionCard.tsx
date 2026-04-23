export type Stage = "sent" | "replied" | "coffee" | "referral" | "interview" | "offer";
export type University = "Brown" | "Rice" | "Other";

export type Connection = {
  id: string;
  name: string;
  company: string;
  role: string;
  classOf: number;
  warmth: number;
  stage: Stage;
  university: University;
  lastAction: string;
  daysAgo: number;
  needsFollowUp?: boolean;
  fresh?: boolean;
};

export function ConnectionCard({ c }: { c: Connection }) {
  const ago = c.daysAgo === 0 ? "today" : c.daysAgo === 1 ? "yesterday" : `${c.daysAgo}d ago`;
  return (
    <div
      className={`group cursor-pointer rounded-xl border bg-white p-3 transition-colors hover:border-[#2E5A88] ${
        c.fresh ? "border-[#C86B4F]/40 ring-1 ring-[#C86B4F]/20" : "border-[#ECE5D0]"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F4EDDB] text-xs font-[family-name:var(--font-fraunces)] text-[#1B3B5F]">
          {c.name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold leading-tight text-[#14182A]">{c.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-[#5C6472]">
            {c.role} · {c.company}
          </p>
        </div>
        <p className="shrink-0 font-[family-name:var(--font-fraunces)] text-xs tabular-nums text-[#1B3B5F]">
          {c.warmth}
        </p>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-[#F4EDDB] pt-2">
        <p className="truncate text-[11px] text-[#5C6472]">{c.lastAction}</p>
        <p className="shrink-0 text-[10px] tabular-nums text-[#5C6472]">{ago}</p>
      </div>

      {(c.needsFollowUp || c.fresh) && (
        <div className="mt-2">
          {c.fresh ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[#C86B4F]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C86B4F]" />
              fresh reply · act today
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[#C86B4F]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C86B4F]" />
              needs follow-up
            </span>
          )}
        </div>
      )}
    </div>
  );
}
