type Quest = {
  id: string;
  title: string;
  why: string;
  progress: number;
  target: number;
  days: number;
  reward: number;
  color: "blue" | "clay" | "ochre";
};

const QUESTS: Quest[] = [
  {
    id: "q1",
    title: "Send 5 outreaches in Dev Tools",
    why: "Your highest-conversion lane. Double down where it’s working.",
    progress: 3,
    target: 5,
    days: 4,
    reward: 50,
    color: "blue",
  },
  {
    id: "q2",
    title: "Re-open one conversation that went quiet",
    why: "Priya went silent 5 days ago. A short one-liner tends to re-open the door.",
    progress: 0,
    target: 1,
    days: 4,
    reward: 30,
    color: "clay",
  },
  {
    id: "q3",
    title: "Prep 3 questions for Thursday’s coffee",
    why: "Amir cleared 30 minutes for you. Show up ready.",
    progress: 1,
    target: 3,
    days: 1,
    reward: 25,
    color: "ochre",
  },
];

type Milestone = {
  title: string;
  note: string;
  when: string;
  xp: number;
  fresh?: boolean;
};

const MILESTONES: Milestone[] = [
  {
    title: "First stones laid",
    note: "Maya wrote back at Linear. That’s your first foundation — no house is built without one.",
    when: "yesterday",
    xp: 25,
    fresh: true,
  },
  {
    title: "Week of consistency",
    note: "Seven days in a row. The math says you’re ahead of 80% of your cohort.",
    when: "today",
    xp: 75,
    fresh: true,
  },
  {
    title: "Ten logs gathered",
    note: "Ten outreaches sent. Raw materials are piling up across your islands. Keep stacking.",
    when: "3 days ago",
    xp: 20,
  },
  {
    title: "Walls rising at Linear",
    note: "Amir booked coffee · Thursday 2pm. Walls are going up on your biggest island.",
    when: "2 days ago",
    xp: 50,
  },
  {
    title: "Came back",
    note: "Took Saturday off and came right back Sunday. That’s the rhythm that wins this.",
    when: "today",
    xp: 10,
    fresh: true,
  },
];

const LOCKED = [
  { title: "25 logs stacked", progress: "23 / 25" },
  { title: "First roof framed (referral)", progress: "locked" },
  { title: "Three foundations in a week", progress: "2 / 3" },
  { title: "First home standing (interview)", progress: "locked" },
  { title: "30-day streak", progress: "day 7" },
];

export default function QuestsTemplate() {
  const completed = MILESTONES.length;
  const active = QUESTS.length;

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[#EAE3D2] text-[#14182A]">
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-16">
        <Header />

        <div className="mt-12">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">This week</p>
          <h1 className="mt-3 text-4xl leading-[1.1] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-5xl">
            <span className="italic text-[#2E5A88]">{active} quests</span> &amp; {completed} milestones.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-[#4A5260]">
            Small, specific, yours. Nothing here compares you to anyone else — these are the things
            that move your funnel forward this week.
          </p>
        </div>

        <section className="mt-10">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#5C6472]">
            Active quests &middot; Alma picked for you
          </p>
          <div className="mt-3 space-y-3">
            {QUESTS.map((q) => (
              <QuestCard key={q.id} q={q} />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#5C6472]">
            Milestones &middot; what you’ve unlocked
          </p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#D9CFB5] bg-white">
            {MILESTONES.map((m, i) => (
              <MilestoneRow key={i} m={m} first={i === 0} />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#5C6472]">
            On the horizon
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {LOCKED.map((l, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-dashed border-[#D9CFB5] bg-transparent px-4 py-3"
              >
                <p className="text-sm text-[#14182A]">{l.title}</p>
                <p className="text-[11px] tabular-nums text-[#5C6472]">{l.progress}</p>
              </div>
            ))}
          </div>
        </section>
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
        <a href="/design-lab" className="text-[#2E5A88] hover:underline">&larr; lab</a>
      </nav>
    </header>
  );
}

function QuestCard({ q }: { q: Quest }) {
  const pct = Math.min((q.progress / q.target) * 100, 100);
  const done = q.progress >= q.target;
  const palette = {
    blue: { bar: "from-[#1B3B5F] to-[#3F6FA3]", badge: "bg-[#F0F4FA] text-[#1B3B5F]" },
    clay: { bar: "from-[#A85535] to-[#C86B4F]", badge: "bg-[#FDEFE7] text-[#C86B4F]" },
    ochre: { bar: "from-[#B08100] to-[#E8B339]", badge: "bg-[#FFF8E8] text-[#B08100]" },
  }[q.color];

  return (
    <div
      className={`rounded-2xl border bg-white p-5 transition-colors ${
        done ? "border-[#4D6A4A]/40" : "border-[#D9CFB5]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p
            className="text-base font-semibold text-[#14182A]"
            dangerouslySetInnerHTML={{ __html: q.title }}
          />
          <p
            className="mt-1 text-xs text-[#5C6472] font-[family-name:var(--font-fraunces)] italic"
            dangerouslySetInnerHTML={{ __html: q.why }}
          />
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${palette.badge}`}>
          +{q.reward} xp
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="h-[5px] overflow-hidden rounded-full bg-[#F4EDDB]">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${palette.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-[#14182A]">
          <span className="font-semibold">{q.progress}</span>
          <span className="text-[#5C6472]"> / {q.target}</span>
        </p>
        <p className="shrink-0 text-[11px] text-[#5C6472] tabular-nums">{q.days}d left</p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#ECE5D0] pt-3">
        <button
          type="button"
          className="text-xs font-medium text-[#5C6472] hover:text-[#C86B4F]"
        >
          Skip
        </button>
        <button
          type="button"
          className="rounded-full bg-[#1B3B5F] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#2E5A88]"
        >
          {done ? "Claim reward →" : "Continue →"}
        </button>
      </div>
    </div>
  );
}

function MilestoneRow({ m, first }: { m: Milestone; first: boolean }) {
  return (
    <div
      className={`flex items-start gap-4 px-5 py-4 ${first ? "" : "border-t border-[#ECE5D0]"} ${
        m.fresh ? "bg-[#FDEFE7]/30" : ""
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-fraunces)] text-xs font-semibold tabular-nums ${
          m.fresh ? "bg-[#C86B4F] text-white" : "bg-[#F4EDDB] text-[#1B3B5F]"
        }`}
      >
        +{m.xp}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#14182A]">{m.title}</p>
          {m.fresh && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[#C86B4F]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C86B4F]" />
              just unlocked
            </span>
          )}
        </div>
        <p
          className="mt-1 text-sm leading-relaxed text-[#4A5260] font-[family-name:var(--font-fraunces)] italic"
          dangerouslySetInnerHTML={{ __html: `“${m.note}” — Alma` }}
        />
      </div>
      <p className="shrink-0 text-xs text-[#5C6472]">{m.when}</p>
    </div>
  );
}
