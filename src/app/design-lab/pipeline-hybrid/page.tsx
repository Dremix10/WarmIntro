import { JourneyBar } from "./_parts/JourneyBar";
import { Trajectory, TrajectoryAxis } from "./_parts/Trajectory";
import { WeekDots } from "./_parts/WeekDots";
import { ArchipelagoTeaser } from "./_parts/ArchipelagoTeaser";

const TODAY = [
  { id: 1, title: "Send 3 outreach to Stripe", meta: "2 alumni surfaced this morning", cta: "Start" },
  { id: 2, title: "Follow up with Maya (Linear)", meta: "Replied 2h ago — strike while warm", cta: "Draft reply" },
  { id: 3, title: "Prep for Thursday coffee with Amir", meta: "Linear, 2pm · review notes", cta: "Open" },
];

const COMPANIES = [
  { name: "Stripe", sent: 4, total: 8, replies: 2, next: "Reply to Maya", kind: "live" as const },
  { name: "Linear", sent: 5, total: 6, replies: 3, next: "Coffee Thu 2pm", kind: "live" as const },
  { name: "Notion", sent: 3, total: 9, replies: 1, next: "Follow up", kind: "idle" as const },
  { name: "Figma", sent: 2, total: 12, replies: 0, next: "Send 3 more", kind: "attention" as const },
  { name: "Rippling", sent: 0, total: 10, replies: 0, next: "Pick first alum", kind: "attention" as const },
];

const ACTIVITY = [
  { xp: 25, text: "Maya (Linear) replied to your note", when: "2h ago" },
  { xp: 10, text: "Sent outreach to Figma", when: "6h ago" },
  { xp: 50, text: "Coffee booked with Amir (Linear)", when: "yesterday" },
  { xp: 10, text: "Sent outreach to Linear", when: "yesterday" },
];

export default function PipelineHybrid() {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[#EAE3D2] text-[#14182A]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Header />
        <Hero />

        <section className="mt-10">
          <JourneyBar />
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <TodayPanel />
          <Sidecar />
        </section>

        <ArchipelagoTeaser />


        <section className="mt-8 rounded-2xl border border-[#D9CFB5] bg-white p-6">
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5C6472]">Trajectory &middot; 12 wk</p>
            <p className="text-xs text-[#5C6472]">
              <span className="mr-4"><span className="inline-block h-[2px] w-4 align-middle bg-[#2E5A88]" /> actual</span>
              <span><span className="inline-block h-[2px] w-4 align-middle border-b border-dashed border-[#C86B4F]" /> on-pace</span>
            </p>
          </div>
          <Trajectory />
          <TrajectoryAxis />
          <p className="mt-4 border-t border-[#ECE5D0] pt-4 text-sm text-[#5C6472]">
            You’re tracking <span className="font-semibold text-[#C86B4F]">11 behind pace</span> — a steady 5/day closes the gap by May 12.
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-[#D9CFB5] bg-white">
          <div className="flex items-baseline justify-between px-6 pt-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5C6472]">Companies</p>
            <p className="text-xs text-[#5C6472]">{COMPANIES.length} active · sorted by momentum</p>
          </div>
          <div className="mt-3 divide-y divide-[#ECE5D0]">
            {COMPANIES.map((c) => (
              <CompanyRow key={c.name} c={c} />
            ))}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#D9CFB5] bg-white p-6">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5C6472]">This week</p>
              <p className="text-xs font-medium text-[#B08100]">7 day streak 🔥</p>
            </div>
            <WeekDots />
            <p className="mt-4 border-t border-[#ECE5D0] pt-4 text-xs text-[#5C6472]">
              9 sends this week · goal 25 by Sunday · 16 to go
            </p>
          </div>

          <div className="rounded-2xl border border-[#D9CFB5] bg-white p-6">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5C6472]">Recent activity</p>
            <div className="mt-4 space-y-3">
              {ACTIVITY.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4EDDB] text-xs font-semibold tabular-nums text-[#1B3B5F]">
                    +{a.xp}
                  </span>
                  <p className="flex-1 text-sm text-[#14182A]">{a.text}</p>
                  <p className="text-xs text-[#5C6472]">{a.when}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-10 border-t border-[#D9CFB5] pt-5 flex items-center justify-between text-xs text-[#5C6472]">
          <p>1,240 xp · <span className="font-medium text-[#14182A]">Connector</span> · 260 xp to <span className="italic">Mentor</span></p>
          <p>3 badges earned · <span className="text-[#2E5A88]">view all →</span></p>
        </footer>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between">
      <p className="text-2xl italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">alma</p>
      <nav className="flex items-center gap-6 text-sm text-[#5C6472]">
        <span className="font-medium text-[#14182A]">Pipeline</span>
        <span>Companies</span>
        <span>CRM</span>
        <span>Leaderboard</span>
        <a href="/design-lab" className="text-[#2E5A88] hover:underline">&larr; lab</a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <div className="mt-12 flex items-end justify-between gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">Wednesday, April 23</p>
        <h1 className="mt-4 text-4xl leading-[1.1] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-5xl">
          Good morning, <span className="italic text-[#2E5A88]">Kinsey</span>.<br />
          You’re <span className="italic text-[#C86B4F]">23%</span> of the way to your offer.
        </h1>
      </div>
      <div className="hidden shrink-0 rounded-2xl border border-[#E8B339]/40 bg-[#FFF8E8] px-5 py-3 text-center sm:block">
        <p className="text-3xl font-[family-name:var(--font-fraunces)] tabular-nums leading-none text-[#B08100]">7</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[#B08100]">day streak</p>
      </div>
    </div>
  );
}

function TodayPanel() {
  return (
    <div className="rounded-2xl border border-[#D9CFB5] bg-white p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5C6472]">Today</p>
        <p className="text-xs text-[#5C6472]">3 tasks · ~25 min</p>
      </div>
      <div className="mt-4 divide-y divide-[#ECE5D0]">
        {TODAY.map((t) => (
          <div key={t.id} className="group flex items-center gap-4 py-4 first:pt-0 last:pb-0">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D9CFB5] group-hover:border-[#2E5A88]">
              <div className="h-2 w-2 rounded-full bg-[#2E5A88]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#14182A]">{t.title}</p>
              <p className="mt-0.5 text-xs text-[#5C6472]">{t.meta}</p>
            </div>
            <button
              type="button"
              className="rounded-full bg-[#1B3B5F] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#2E5A88]"
            >
              {t.cta} →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sidecar() {
  return (
    <div className="rounded-2xl border border-[#D9CFB5] bg-[#F4EDDB] p-6">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5C6472]">Alma says</p>
      <p className="mt-3 text-sm leading-relaxed text-[#14182A] font-[family-name:var(--font-fraunces)] italic">
        “Linear’s warming up — three replies and a coffee this week. Spend your energy there before chasing Figma.”
      </p>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#D9CFB5] pt-4">
        <MiniStat label="sent" value="23" />
        <MiniStat label="replies" value="5" />
        <MiniStat label="coffee" value="1" />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-[family-name:var(--font-fraunces)] tabular-nums leading-none text-[#14182A]">{value}</p>
      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">{label}</p>
    </div>
  );
}

type Company = (typeof COMPANIES)[number];

function CompanyRow({ c }: { c: Company }) {
  const pct = c.total > 0 ? (c.sent / c.total) * 100 : 0;
  const dot =
    c.kind === "live" ? "bg-[#2E5A88]" : c.kind === "attention" ? "bg-[#C86B4F]" : "bg-[#D9CFB5]";
  return (
    <div className="grid cursor-pointer grid-cols-[12px_140px_1fr_80px_1fr] items-center gap-4 px-6 py-3.5 transition-colors hover:bg-[#FBF7EC]">
      <div className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <p className="truncate text-sm font-semibold text-[#14182A]">{c.name}</p>
      <div className="flex items-center gap-3">
        <div className="h-[4px] w-full max-w-[160px] overflow-hidden rounded-full bg-[#F4EDDB]">
          <div className="h-full rounded-full bg-[#2E5A88]" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs tabular-nums text-[#5C6472] shrink-0">{c.sent}/{c.total}</span>
      </div>
      <p className="text-xs">
        {c.replies > 0 ? (
          <span className="font-medium text-[#C86B4F]">{c.replies} replies</span>
        ) : (
          <span className="text-[#5C6472]">&mdash;</span>
        )}
      </p>
      <p className="truncate text-xs text-[#14182A]">
        <span className="text-[#5C6472]">next:</span> {c.next} <span className="text-[#5C6472]">→</span>
      </p>
    </div>
  );
}
