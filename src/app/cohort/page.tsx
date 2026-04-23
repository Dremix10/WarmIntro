const AGGREGATE = [
  { value: 342, label: "outreaches", delta: "+94 vs last week" },
  { value: 98, label: "replies", delta: "29% cohort rate" },
  { value: 18, label: "coffees booked", delta: "up from 11" },
  { value: 4, label: "referrals", delta: "first of the season" },
];

const GOALS = [
  { label: "1,000 outreaches by May 15", current: 680, target: 1000 },
  { label: "50 coffees booked by graduation", current: 32, target: 50 },
  { label: "10 referrals earned", current: 6, target: 10 },
];

const SIGNALS = [
  { text: "Someone from Brown CS ’27 just booked their first coffee at Stripe.", when: "2 hours ago" },
  { text: "A classmate hit a 21-day streak — the longest in the cohort this semester.", when: "today" },
  { text: "Three referrals came in from Ramp alumni this week.", when: "yesterday" },
  { text: "Someone sent their 50th outreach. That’s halfway to the funnel math.", when: "2 days ago" },
  { text: "Four classmates came back after a weekend break. The rhythm holds.", when: "today" },
];

const WEEK = [22, 41, 58, 47, 63, 68, 43];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX = Math.max(...WEEK);

export default function CohortTemplate() {
  const total = WEEK.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-[#EAE3D2] text-[#14182A]">
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-16">
        <div className="mt-12 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">This week · together</p>
          <h1 className="mx-auto mt-4 max-w-2xl text-4xl leading-[1.1] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-5xl">
            Brown CS ’27 is <span className="italic text-[#2E5A88]">shipping.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm text-[#4A5260]">
            No rankings here. Just the numbers we made together, and the small wins you might otherwise miss.
          </p>
        </div>

        <section className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {AGGREGATE.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#D9CFB5] bg-white px-5 py-4">
              <p className="text-4xl font-[family-name:var(--font-fraunces)] tabular-nums leading-none text-[#14182A]">
                {s.value}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-[#5C6472]">{s.label}</p>
              <p className="mt-1 text-[11px] text-[#C86B4F]">{s.delta}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-[#D9CFB5] bg-white p-6">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">Cohort heartbeat · 7 days</p>
            <p className="text-[10px] tabular-nums text-[#5C6472]">{total} active-person days</p>
          </div>
          <div className="mt-4 flex items-end justify-between gap-2">
            {WEEK.map((count, i) => {
              const h = (count / MAX) * 130;
              const isPeak = count === MAX;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-[140px] w-full items-end justify-center">
                    <div
                      className={`w-full max-w-[42px] rounded-t-md ${isPeak ? "bg-gradient-to-t from-[#C86B4F] to-[#E89872]" : "bg-gradient-to-t from-[#1B3B5F] to-[#3F6FA3]"} transition-all`}
                      style={{ height: `${h}px` }}
                    />
                  </div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#5C6472]">{DAYS[i]}</p>
                  <p className="text-[11px] tabular-nums text-[#14182A]">{count}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-5 border-t border-[#ECE5D0] pt-4 text-xs text-[#5C6472]">
            Saturday was the cohort’s busiest day — most of your classmates used the weekend to catch up.
          </p>
        </section>

        <section className="mt-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#5C6472]">Collective goals · spring ’26</p>
          <div className="mt-3 space-y-3">
            {GOALS.map((g) => {
              const pct = Math.min((g.current / g.target) * 100, 100);
              return (
                <div key={g.label} className="rounded-2xl border border-[#D9CFB5] bg-white p-5">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-[#14182A]">{g.label}</p>
                    <p className="text-xs tabular-nums text-[#14182A]">
                      <span className="font-semibold">{g.current}</span>
                      <span className="text-[#5C6472]"> / {g.target}</span>
                    </p>
                  </div>
                  <div className="mt-3 h-[6px] overflow-hidden rounded-full bg-[#F4EDDB]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1B3B5F] to-[#3F6FA3]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#D9CFB5] bg-[#F4EDDB] p-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">
            Anonymous signals · what happened in the cohort
          </p>
          <div className="mt-4 space-y-4">
            {SIGNALS.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2E5A88]" />
                <div className="flex-1">
                  <p
                    className="text-sm leading-relaxed text-[#14182A]"
                    dangerouslySetInnerHTML={{ __html: s.text }}
                  />
                  <p className="mt-0.5 text-[11px] text-[#5C6472]">{s.when}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="mx-auto mt-12 max-w-md text-center text-sm font-[family-name:var(--font-fraunces)] italic text-[#5C6472]">
          “You’re not the only one awake on a Sunday. Most of your cohort is in this with you.”
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
