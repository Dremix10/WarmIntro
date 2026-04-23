const STATS = [
  { value: 23, label: "sent", delta: "+8 vs last week" },
  { value: 5, label: "replies", delta: "22% rate" },
  { value: 1, label: "coffee", delta: "Thursday 2pm" },
  { value: 7, label: "day streak", delta: "personal best" },
];

const SECTIONS = [
  {
    heading: "Linear is heating up",
    body: "Maya replied yesterday — your warmest lead of the week. Alex replied the day before. Amir agreed to coffee Thursday. Three warm threads at the same company is rare; it means your pitch is landing. Lean in here.",
  },
  {
    heading: "Stripe needs a nudge",
    body: "You sent three outreaches to Stripe early in the week and nobody has moved. This is normal — fintech tends to respond slower than dev tools. Before you start over, try a short follow-up on Jamie's LinkedIn. One sentence, one specific question.",
  },
  {
    heading: "Figma stalled",
    body: "Only two of twelve alumni contacted, last activity was Tuesday. No shame; Figma was never your top shortlist pick. If you’re short on time next week, deprioritize Figma and move the energy to Ramp, where you already have a referral in flight.",
  },
];

const INSIGHT = {
  title: "One thing Alma noticed",
  body: "Your Tuesday 7-9pm sends get a 33% reply rate. Every other window is closer to 15%. Keep protecting that block.",
};

const QUEST = {
  title: "For next week",
  body: "Three quests, all doable.",
  items: [
    "Send 5 outreaches in Dev Tools — your highest-conversion lane",
    "Re-open one conversation that went quiet (Priya is the best candidate)",
    "Prep 3 questions for your Thursday coffee with Amir",
  ],
};

export default function RecapTemplate() {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[#EAE3D2] text-[#14182A]">
      <div className="mx-auto max-w-2xl px-6 pt-8 pb-16">
        <Header />

        <div className="mt-16 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            Sunday evening &middot; April 23
          </p>
          <h1 className="mt-4 text-4xl leading-[1.1] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-5xl">
            Your week, <span className="italic text-[#2E5A88]">in one page</span>.
          </h1>
        </div>

        <div className="mx-auto mt-10 max-w-xl">
          <p className="text-base leading-relaxed text-[#14182A] font-[family-name:var(--font-fraunces)]">
            Hi Kinsey.
            <br />
            <br />
            Here’s what I saw in your pipeline this week. I’ll keep it short. Read it on the
            couch, not at your desk.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#D9CFB5] bg-white px-5 py-4">
              <p className="text-4xl font-[family-name:var(--font-fraunces)] tabular-nums leading-none text-[#14182A]">
                {s.value}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-[#5C6472]">
                {s.label}
              </p>
              <p className="mt-1 text-[11px] text-[#C86B4F]">{s.delta}</p>
            </div>
          ))}
        </div>

        <section className="mt-12 space-y-8">
          {SECTIONS.map((s, i) => (
            <div key={i}>
              <h2 className="text-xl font-[family-name:var(--font-fraunces)] text-[#14182A]">
                {s.heading}
              </h2>
              <p
                className="mt-2 text-[15px] leading-relaxed text-[#4A5260]"
                dangerouslySetInnerHTML={{ __html: s.body }}
              />
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-[#D9CFB5] bg-[#F4EDDB] p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">
            {INSIGHT.title}
          </p>
          <p className="mt-3 text-lg leading-relaxed text-[#14182A] font-[family-name:var(--font-fraunces)] italic">
            “{INSIGHT.body}”
          </p>
        </section>

        <section className="mt-10 rounded-2xl border border-[#D9CFB5] bg-white p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">
            {QUEST.title}
          </p>
          <p className="mt-2 text-sm text-[#4A5260]">{QUEST.body}</p>
          <ul className="mt-4 space-y-3">
            {QUEST.items.map((q, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#D9CFB5] text-[10px] font-[family-name:var(--font-fraunces)] tabular-nums text-[#1B3B5F]">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-[#14182A]">{q}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between border-t border-[#ECE5D0] pt-4">
            <button
              type="button"
              className="text-xs font-medium text-[#5C6472] hover:text-[#1B3B5F]"
            >
              Skip this week
            </button>
            <button
              type="button"
              className="rounded-full bg-[#1B3B5F] px-5 py-2 text-xs font-semibold text-white hover:bg-[#2E5A88]"
            >
              Accept quests →
            </button>
          </div>
        </section>

        <p className="mt-16 text-center text-sm font-[family-name:var(--font-fraunces)] italic text-[#5C6472]">
          See you Monday.
          <br />— Alma
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
        <a href="/design-lab" className="text-[#2E5A88] hover:underline">&larr; lab</a>
      </nav>
    </header>
  );
}
