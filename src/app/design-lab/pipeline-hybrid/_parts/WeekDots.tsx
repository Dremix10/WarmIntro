type Day = { day: string; count: number; today?: boolean };
const WEEK: Day[] = [
  { day: "M", count: 4 },
  { day: "T", count: 3 },
  { day: "W", count: 2, today: true },
  { day: "T", count: 0 },
  { day: "F", count: 0 },
  { day: "S", count: 0 },
  { day: "S", count: 0 },
];

export function WeekDots() {
  return (
    <div className="mt-5 flex items-end justify-between gap-3">
      {WEEK.map((d, i) => {
        const height = Math.min(d.count * 14, 56);
        return (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="flex h-16 items-end">
              {d.count > 0 ? (
                <div
                  className={`w-8 rounded-t-md ${d.today ? "bg-[#E8B339]" : "bg-[#2E5A88]"}`}
                  style={{ height: `${height}px` }}
                />
              ) : (
                <div className="h-[2px] w-8 rounded bg-[#ECE5D0]" />
              )}
            </div>
            <p
              className={`text-[10px] font-medium uppercase tracking-wider ${
                d.today ? "text-[#B08100]" : "text-[#5C6472]"
              }`}
            >
              {d.day}
            </p>
            <p className="text-[11px] tabular-nums text-[#14182A]">{d.count || "·"}</p>
          </div>
        );
      })}
    </div>
  );
}
