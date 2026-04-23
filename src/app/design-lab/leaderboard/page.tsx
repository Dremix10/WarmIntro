import { Board } from "./_parts/Board";

export default function LeaderboardTemplate() {
  return (
    <div className="bg-[#EAE3D2] text-[#14182A]">
      <div className="mx-auto max-w-4xl px-6 pt-8 pb-16">        <Hero />
        <Board />

        <section className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[#D9CFB5] bg-[#F4EDDB] p-5">
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">✦</span>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">
                  Alma’s weekly read
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#14182A] font-[family-name:var(--font-fraunces)] italic">
                  “You’re 40 xp from Jordan. Sunday night, four solid outreaches, and you
                  pass him. This isn’t about beating anyone — it’s about staying on the
                  bus long enough to reach an offer.”
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9CFB5] bg-white p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">
              Spotlights this week
            </p>
            <div className="mt-4 space-y-3">
              <Spotlight title="Fastest climber" name="Sam Okafor" detail="↑ 7 ranks · 180 xp this week" dot="bg-[#2E5A88]" />
              <Spotlight title="Longest streak" name="Priya Shah" detail="14 days · sends every evening" dot="bg-[#E8B339]" />
              <Spotlight title="Most replies" name="Dana Kim" detail="8 replies · 42% rate" dot="bg-[#C86B4F]" />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-dashed border-[#D9CFB5] bg-transparent p-6 text-center">
          <p className="text-sm font-[family-name:var(--font-fraunces)] italic text-[#14182A]">
            Want a smaller, private board?
          </p>
          <p className="mt-1 text-xs text-[#5C6472]">
            Create a board with your friends, lab mates, or club. Keep it motivating without being public.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              className="rounded-full bg-[#1B3B5F] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#2E5A88]"
            >
              Create a board
            </button>
            <button
              type="button"
              className="rounded-full border border-[#D9CFB5] bg-white px-4 py-1.5 text-xs font-medium text-[#1B3B5F] hover:border-[#2E5A88]"
            >
              Invite a classmate · +50 xp
            </button>
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
        <span className="font-medium text-[#14182A]">Leaderboard</span>
        <a href="/design-lab" className="text-[#2E5A88] hover:underline">&larr; lab</a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <div className="mt-12">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">This week</p>
      <h1 className="mt-3 text-4xl leading-[1.1] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-5xl">
        You’re <span className="italic text-[#2E5A88]">#12</span> on Brown IB ’27.
      </h1>
      <p className="mt-3 max-w-xl text-sm text-[#4A5260]">
        48 students on the board, 37 active this week. The cohort is shipping — and so are you.
        Median is 85 xp; you’re at 120. Keep the rhythm.
      </p>
    </div>
  );
}

function Spotlight({ title, name, detail, dot }: { title: string; name: string; detail: string; dot: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">{title}</p>
        <p className="mt-0.5 text-sm font-semibold text-[#14182A]">{name}</p>
        <p className="text-xs text-[#5C6472]">{detail}</p>
      </div>
    </div>
  );
}
