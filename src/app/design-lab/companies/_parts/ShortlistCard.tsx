type Warmth = "strong" | "medium" | "light";

type Pick = {
  rank: number;
  name: string;
  logo: string;
  why: string;
  alumni: number;
  roles: number;
  tags: string[];
  warmth: Warmth;
};

const WARMTH_STYLES: Record<Warmth, { label: string; dot: string; text: string }> = {
  strong: { label: "strong match", dot: "bg-[#2E5A88]", text: "text-[#1B3B5F]" },
  medium: { label: "good match", dot: "bg-[#C86B4F]", text: "text-[#C86B4F]" },
  light: { label: "worth a look", dot: "bg-[#D9CFB5]", text: "text-[#5C6472]" },
};

export function ShortlistCard({ c }: { c: Pick }) {
  const w = WARMTH_STYLES[c.warmth];
  const picked = c.rank <= 3;

  return (
    <div
      className={`group flex h-full flex-col rounded-2xl border bg-white p-5 transition-colors ${
        picked ? "border-[#2E5A88]/40" : "border-[#D9CFB5] hover:border-[#2E5A88]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F4EDDB] text-base font-[family-name:var(--font-fraunces)] text-[#1B3B5F]">
            {c.logo}
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">
              #{c.rank} &middot; {c.name}
            </p>
            <p className="text-lg font-[family-name:var(--font-fraunces)] leading-tight text-[#14182A]">
              {c.name}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#F8F2E2] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider ${w.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${w.dot}`} />
          {w.label}
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-[#F8F2E2] px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">Why Alma picked this</p>
        <p className="mt-1.5 text-sm leading-relaxed text-[#14182A] font-[family-name:var(--font-fraunces)]">
          {c.why}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-[#5C6472]">
        <span className="tabular-nums"><span className="font-semibold text-[#14182A]">{c.alumni}</span> alumni</span>
        <span className="h-1 w-1 rounded-full bg-[#D9CFB5]" />
        <span className="tabular-nums"><span className="font-semibold text-[#14182A]">{c.roles}</span> open roles</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {c.tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-[#D9CFB5] px-2 py-0.5 text-[10px] font-medium text-[#5C6472]"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[#ECE5D0] pt-4">
        <button type="button" className="text-xs font-medium text-[#5C6472] hover:text-[#1B3B5F]">
          View alumni →
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
            picked
              ? "border border-[#2E5A88] bg-[#F4EDDB] text-[#1B3B5F]"
              : "bg-[#1B3B5F] text-white hover:bg-[#2E5A88]"
          }`}
        >
          {picked ? "✓ Added" : "Add to shortlist"}
        </button>
      </div>
    </div>
  );
}
