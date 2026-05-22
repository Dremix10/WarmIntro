type Alum = {
  name: string;
  role: string;
  classOf: number;
  warmth: number;
  status: "selected" | "sent" | "replied" | "idle";
};

const ALUMNI: Alum[] = [
  { name: "Maya Chen", role: "Senior PM", classOf: 2019, warmth: 88, status: "selected" },
  { name: "Alex Park", role: "Staff Engineer", classOf: 2017, warmth: 76, status: "replied" },
  { name: "Priya Venkat", role: "Product Designer", classOf: 2020, warmth: 72, status: "idle" },
  { name: "Jordan Klein", role: "Engineering Manager", classOf: 2016, warmth: 65, status: "sent" },
  { name: "Sam Okafor", role: "Frontend Engineer", classOf: 2021, warmth: 63, status: "idle" },
  { name: "Riya Sharma", role: "Data Scientist", classOf: 2022, warmth: 58, status: "sent" },
  { name: "Marcus Lee", role: "Backend Engineer", classOf: 2018, warmth: 54, status: "idle" },
  { name: "Eli Rosen", role: "Design Eng", classOf: 2023, warmth: 48, status: "idle" },
];

const STATUS: Record<Alum["status"], { label: string; dot: string; text: string }> = {
  selected: { label: "composing", dot: "bg-[#2E5A88]", text: "text-[#1B3B5F]" },
  sent: { label: "sent", dot: "bg-[#D9CFB5]", text: "text-[#5C6472]" },
  replied: { label: "replied!", dot: "bg-[#C86B4F]", text: "text-[#C86B4F]" },
  idle: { label: "", dot: "bg-transparent", text: "text-[#5C6472]" },
};

export function AlumniRail() {
  return (
    <aside className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-[#D9CFB5] bg-white">
        <div className="flex items-baseline justify-between border-b border-[#ECE5D0] bg-[#F8F2E2] px-5 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#5C6472]">
            Other alumni · {ALUMNI.length}
          </p>
          <p className="text-[10px] text-[#5C6472]">by warmth</p>
        </div>
        <div className="divide-y divide-[#ECE5D0]">
          {ALUMNI.map((a) => (
            <Row key={a.name} a={a} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#D9CFB5] bg-[#F4EDDB] p-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#5C6472]">Alma suggests</p>
        <p className="mt-2 text-sm leading-relaxed text-[#14182A] font-[family-name:var(--font-fraunces)] italic">
          “Send to Maya first — she has the strongest match. If she doesn’t reply in 5 days, Alex (replied) is your best follow-up.”
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-[#D9CFB5] bg-transparent p-5 text-center">
        <p className="text-xs text-[#5C6472]">Out of alumni?</p>
        <button
          type="button"
          className="mt-2 text-xs font-medium text-[#2E5A88] hover:underline"
        >
          Find cold outreach leads →
        </button>
      </div>
    </aside>
  );
}

function Row({ a }: { a: Alum }) {
  const s = STATUS[a.status];
  const isSelected = a.status === "selected";
  return (
    <div
      className={`flex cursor-pointer items-center gap-3 px-5 py-3 transition-colors ${
        isSelected ? "bg-[#F8F2E2]" : "hover:bg-[#FBF7EC]"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-[family-name:var(--font-fraunces)] ${
          isSelected
            ? "bg-gradient-to-br from-[#2E5A88] to-[#1B3B5F] text-white"
            : "bg-[#F4EDDB] text-[#1B3B5F]"
        }`}
      >
        {a.name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-[#14182A]">{a.name}</p>
          {a.status !== "idle" && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider ${s.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-[#5C6472]">
          {a.role} · ’{String(a.classOf).slice(-2)}
        </p>
      </div>
      <p className="shrink-0 text-sm font-[family-name:var(--font-fraunces)] tabular-nums text-[#1B3B5F]">
        {a.warmth}
      </p>
    </div>
  );
}
