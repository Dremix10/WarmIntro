import { Workspace } from "./_parts/Workspace";
import { CONNECTIONS } from "./_parts/data";

export default function CrmTemplate() {
  const total = CONNECTIONS.length;
  const companies = new Set(CONNECTIONS.map((c) => c.company)).size;
  const fresh = CONNECTIONS.filter((c) => c.fresh).length;
  const quiet = CONNECTIONS.filter((c) => c.needsFollowUp).length;

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[#EAE3D2] text-[#14182A]">
      <div className="mx-auto max-w-[1280px] px-6 pt-8 pb-16">
        <Header />

        <div className="mt-12 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">Your network</p>
            <h1 className="mt-3 text-4xl leading-[1.1] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-5xl">
              {total} people, across <span className="italic text-[#2E5A88]">{companies} companies</span>.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-[#4A5260]">
              {fresh} fresh reply {fresh === 1 ? "this week" : "replies this week"}. {quiet} have gone quiet.
              Filter, sort, and switch views to keep anyone from slipping through.
            </p>
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-[#D9CFB5] bg-[#F4EDDB] p-5">
          <div className="flex items-start gap-3">
            <span className="text-lg leading-none">✦</span>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">Alma’s weekly read</p>
              <p className="mt-2 text-sm leading-relaxed text-[#14182A] font-[family-name:var(--font-fraunces)] italic">
                “Maya replied yesterday, that’s your hottest lead — don’t let it cool. Priya
                and Ravi have been quiet for a week. A one-liner follow-up with a specific question tends
                to re-open the door.”
              </p>
            </div>
          </div>
        </section>

        <Workspace />
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
        <span className="font-medium text-[#14182A]">CRM</span>
        <span>Leaderboard</span>
        <a href="/design-lab" className="text-[#2E5A88] hover:underline">&larr; lab</a>
      </nav>
    </header>
  );
}
