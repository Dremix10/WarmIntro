import { Archipelago, StageGlyph } from "./_parts/Archipelago";

const LEGEND = [
  { stage: "sent" as const, label: "Call request sent", detail: "logs gathered" },
  { stage: "replied" as const, label: "They replied", detail: "stones laid" },
  { stage: "coffee" as const, label: "Coffee or call done", detail: "walls rising" },
  { stage: "referral" as const, label: "They referred you", detail: "roof framed" },
  { stage: "interview" as const, label: "In the interview process", detail: "a whitewashed home stands" },
];

export default function ArchipelagoTemplate() {
  return (
    <div className="bg-gradient-to-b from-[#F2ECDB] via-[#EAE3D2] to-[#E4DAC2] text-[#14182A]">
      <div className="mx-auto max-w-5xl px-6 pt-8 pb-16">
        <div className="mt-12 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">Your archipelago</p>
          <h1 className="mx-auto mt-4 max-w-2xl text-4xl leading-[1.1] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-5xl">
            <span className="italic text-[#2E5A88]">Twelve crossings</span>, so far.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-[#4A5260]">
            <span className="italic">Alma</span> means leap. Every banker on this map is a crossing
            you made. On each bank you&rsquo;re building a home, stone by stone — logs, foundation,
            walls, roof, and finally a whitewashed home standing against the sea.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-[#D9CFB5] bg-white shadow-sm">
          <Archipelago />
        </div>

        <div className="mt-6 rounded-2xl border border-[#D9CFB5] bg-white p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">
            What you build when things grow
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {LEGEND.map((item) => (
              <div key={item.stage} className="flex items-center gap-3">
                <svg viewBox="-14 -14 28 28" className="h-9 w-9 shrink-0">
                  <StageGlyph stage={item.stage} />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#14182A]">{item.label}</p>
                  <p className="text-[11px] text-[#5C6472] italic font-[family-name:var(--font-fraunces)]">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <InsightCard label="Largest island" value="Morgan Stanley" detail="4 bankers · foundations poured, walls up" />
          <InsightCard label="Longest leap" value="Centerview" detail="Priya &middot; stones freshly laid" />
          <InsightCard label="Closest to home" value="Evercore" detail="Leila &middot; in the interview process" />
        </div>

        <p className="mx-auto mt-12 max-w-md text-center text-sm font-[family-name:var(--font-fraunces)] italic text-[#5C6472]">
          “A home isn’t built in a day — neither is a network.”
          <br />
          <span className="text-[11px] not-italic">— Alma</span>
        </p>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between">
      <p className="text-2xl italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">alma</p>
      <nav className="flex items-center gap-6 text-sm text-[#5C6472]">
        <span>Pipeline</span>
        <span>Companies</span>
        <span>CRM</span>
        <span>Leaderboard</span>
        
      </nav>
    </header>
  );
}

function InsightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-[#D9CFB5] bg-white p-5">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">{label}</p>
      <p className="mt-2 text-lg font-[family-name:var(--font-fraunces)] text-[#14182A]">{value}</p>
      <p
        className="mt-0.5 text-xs text-[#5C6472]"
        dangerouslySetInnerHTML={{ __html: detail }}
      />
    </div>
  );
}
