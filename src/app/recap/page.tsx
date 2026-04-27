const STATS = [
  { value: 23, label: "calls sent", delta: "+8 vs last week" },
  { value: 5, label: "replies", delta: "22% rate" },
  { value: 1, label: "coffee booked", delta: "Thursday 2pm" },
  { value: 7, label: "day streak", delta: "personal best" },
];

const SECTIONS = [
  {
    heading: "Morgan Stanley is heating up",
    body: "Maya (TMT VP) replied yesterday &mdash; your warmest lead of the week. Alex (M&amp;A Associate) replied the day before. Amir (TMT VP) agreed to coffee Thursday. Three warm threads at one bank is rare; it means your pitch is landing. Lean in. Mention Maya when you talk to Amir &mdash; she&rsquo;ll likely be mentioned in reverse too.",
  },
  {
    heading: "Goldman needs a nudge",
    body: "You sent three call requests to Goldman early in the week and nobody has moved. That&rsquo;s normal &mdash; GS runs the most structured recruiting of any BB and juniors are slammed right now. Before you start over, try a short follow-up on Jamie&rsquo;s LinkedIn. One sentence, one specific question about a recent deal.",
  },
  {
    heading: "PJT stalled",
    body: "Only one banker contacted at PJT so far. No shame; PJT was never your top shortlist pick and their boutique size means less surface area. If time is tight next week, deprioritize PJT and move the energy to Evercore, where Dana already submitted a referral.",
  },
];

const INSIGHT = {
  title: "One thing Alma noticed",
  body: "Your Tuesday 7-9pm sends get a 33% reply rate. Every other window is closer to 15%. Bankers are at their desks but out of the worst of the staffing rush. Keep protecting that block.",
};

const QUEST = {
  title: "For next week",
  body: "Three quests, all doable.",
  items: [
    "Send 8 networking calls in TMT — your highest-conversion group",
    "Re-open one conversation that went quiet (Priya at Centerview is the best candidate)",
    "Prep 3 specific questions for your Thursday coffee with Amir (MS TMT)",
  ],
};

export default function RecapTemplate() {
  return (
    <div className="bg-[#EAE3D2] text-[#14182A]">
      <div className="mx-auto max-w-2xl px-6 pt-8 pb-16">
        <div className="mt-4 mb-6 rounded-xl border-2 border-[#C86B4F]/30 bg-[#C86B4F]/5 px-4 py-3 text-center text-sm">
          <p className="font-medium text-[#14182A]">Preview — sample Sunday letter.</p>
          <p className="text-xs text-[#14182A]/60 mt-0.5">
            The numbers and names below are illustrative. Your real recap arrives Sunday once you have a week of activity.
            See <a href="/today" className="underline text-[#2E5A88]">your queue</a> for live drafts.
          </p>
        </div>

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
            Here&rsquo;s what I saw in your pipeline this week. I&rsquo;ll keep it short. Read it on
            the couch, not at your desk.
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
            &ldquo;{INSIGHT.body}&rdquo;
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
            <span className="text-xs font-medium text-[#5C6472] italic">
              Quest accept/skip wires up post-launch
            </span>
            <a
              href="/today"
              className="rounded-full bg-[#1B3B5F] px-5 py-2 text-xs font-semibold text-white hover:bg-[#2E5A88]"
            >
              See my real queue &rarr;
            </a>
          </div>
        </section>

        <p className="mt-16 text-center text-sm font-[family-name:var(--font-fraunces)] italic text-[#5C6472]">
          See you Monday.
          <br />&mdash; Alma
        </p>
      </div>
    </div>
  );
}
