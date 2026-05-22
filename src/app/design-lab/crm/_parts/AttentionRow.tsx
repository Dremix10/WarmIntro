"use client";

type Props = {
  onFresh: () => void;
  onQuiet: () => void;
  onUpcoming: () => void;
  freshCount: number;
  quietCount: number;
};

export function AttentionRow({ onFresh, onQuiet, onUpcoming, freshCount, quietCount }: Props) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
      <Card
        onClick={onFresh}
        variant="fresh"
        title={`${freshCount} fresh repl${freshCount === 1 ? "y" : "ies"}`}
        line="Act today — Maya Chen at Morgan Stanley"
        hint="Filter fresh →"
      />
      <Card
        onClick={onQuiet}
        variant="quiet"
        title={`${quietCount} need a nudge`}
        line="Jordan, Priya, Ravi — quiet 5+ days"
        hint="Filter quiet →"
      />
      <Card
        onClick={onUpcoming}
        variant="upcoming"
        title="1 coffee this week"
        line="Amir Shah — Thursday 2pm"
        hint="Open coffee column →"
      />
    </div>
  );
}

function Card({
  onClick,
  variant,
  title,
  line,
  hint,
}: {
  onClick: () => void;
  variant: "fresh" | "quiet" | "upcoming";
  title: string;
  line: string;
  hint: string;
}) {
  const styles = {
    fresh: {
      border: "border-[#C86B4F]/40",
      bg: "bg-[#FDEFE7]",
      accent: "text-[#C86B4F]",
      dot: "bg-[#C86B4F]",
    },
    quiet: {
      border: "border-[#E8B339]/40",
      bg: "bg-[#FFF8E8]",
      accent: "text-[#B08100]",
      dot: "bg-[#E8B339]",
    },
    upcoming: {
      border: "border-[#2E5A88]/30",
      bg: "bg-[#F0F4FA]",
      accent: "text-[#1B3B5F]",
      dot: "bg-[#2E5A88]",
    },
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-start gap-3 rounded-2xl border ${styles.border} ${styles.bg} px-4 py-3.5 text-left transition-all hover:shadow-sm`}
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${styles.dot}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${styles.accent}`}>{title}</p>
        <p className="mt-0.5 truncate text-xs text-[#4A5260]">{line}</p>
      </div>
      <span className={`shrink-0 text-[10px] font-medium uppercase tracking-wider ${styles.accent} opacity-0 transition-opacity group-hover:opacity-100`}>
        {hint}
      </span>
    </button>
  );
}
