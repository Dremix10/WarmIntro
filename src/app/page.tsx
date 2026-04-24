import Link from "next/link";
import { ScenePreview } from "./_landing/ScenePreview";
import { FunnelMath } from "./_landing/FunnelMath";

const STEPS = [
  {
    n: "01",
    title: "Know the calendar cold",
    body: "IB recruiting runs on a fixed clock — calls in the fall, apps Sept/Oct, superdays by January. Alma shows you where you are and what's next, so you never miss the window.",
  },
  {
    n: "02",
    title: "Find the bankers who'll take your call",
    body: "For every bank and group, Alma surfaces alumni with shared majors, clubs, or classes — and a warmth score so you never write to a stranger. Prioritized by who replies.",
  },
  {
    n: "03",
    title: "Draft what you'd actually send",
    body: "Short, specific, student-voiced. No AI tells. No em-dashes. Three tones to pick from. You edit a line, hit copy, send from your own inbox.",
  },
  {
    n: "04",
    title: "Track every call through superday",
    body: "Pipeline dashboard, CRM kanban, weekly Sunday recap. Stages mapped to the real IB funnel — call → coffee → referral → first round → superday → offer.",
  },
];

const PREVIEWS = [
  {
    href: "/pipeline",
    eyebrow: "Pipeline",
    title: "Your journey, in one page.",
    body: "Distance to your offer, today’s three tasks, where the pipeline is heating up.",
  },
  {
    href: "/network",
    eyebrow: "Archipelago",
    title: "Your network, as a place.",
    body: "Every company is an island. Every intro builds a little more of a home standing on it.",
  },
  {
    href: "/recap",
    eyebrow: "Sunday letter",
    title: "A read, not a dashboard.",
    body: "Each Sunday, one page in Alma’s voice. What moved, what to do next, what to notice.",
  },
];

const FAQ = [
  {
    q: "Is Alma a jobs board?",
    a: "No. Alma doesn't list applications — it helps you reach the bankers who decide who gets a first round. The offer is almost never won on the application form.",
  },
  {
    q: "Does Alma send emails for me?",
    a: "Not yet. Alma drafts; you edit one line and send from your inbox. Send-from-Alma with reply tracking is on the roadmap.",
  },
  {
    q: "What does it cost?",
    a: "Free through the 2026 recruiting cycle for Brown and Rice students.",
  },
  {
    q: "I'm not a finance major. Does that matter?",
    a: "No. Every year students break in from econ, stats, math, CS, history, engineering, even art. What matters is the calls, the GPA, and a clear story for why banking. Alma helps with all three.",
  },
  {
    q: "Which banks do you cover?",
    a: "All of them — Bulge Bracket (GS, MS, JPM, BAML, Citi, Barclays, DB, UBS), Elite Boutiques (Evercore, Centerview, Lazard, Moelis, PJT, Guggenheim, Perella, Greenhill, Qatalyst), Middle Market (Jefferies, Houlihan Lokey, Raymond James, William Blair, Baird, Piper Sandler). Pick a tier, pick a group, go.",
  },
  {
    q: "Will recruiters see I used AI?",
    a: "No. Alma's drafts are written to sound like a student, not a bot. You make them yours with small edits. The system prompt explicitly bans em-dashes and AI tells.",
  },
];

export default function LandingTemplate() {
  return (
    <div className="bg-[#EAE3D2] text-[#14182A]">
      <TopBar />
      <Hero />
      <Divider />
      <FunnelSection />
      <Divider />
      <HowSection />
      <Divider />
      <GlimpseSection />
      <Divider />
      <ForWho />
      <Divider />
      <FAQSection />
      <ClosingCTA />
      <Footer />
    </div>
  );
}

function TopBar() {
  return (
    <header className="border-b border-[#D9CFB5] bg-[#EAE3D2]/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <p className="text-2xl italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">alma</p>
        <nav className="flex items-center gap-5 text-sm text-[#5C6472]">
          <a href="#how" className="hover:text-[#1B3B5F]">How it works</a>
          <a href="#faq" className="hover:text-[#1B3B5F]">FAQ</a>
          <a href="/login" className="rounded-full border border-[#D9CFB5] bg-white px-4 py-1.5 text-xs font-medium text-[#1B3B5F] hover:border-[#2E5A88]">
            Log in
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-24 md:pb-28">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
        Investment banking &middot; for Brown &amp; Rice students &middot; 2026 cycle
      </p>
      <h1 className="mt-5 max-w-3xl text-5xl leading-[1.02] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[68px]">
        The warm-intro engine for students breaking into <span className="italic text-[#2E5A88]">investment banking</span>.
      </h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-[#4A5260] md:text-lg">
        Alma reads your resume, finds alumni at every bank and coverage group, drafts the call
        requests you'd actually send, and tracks you through superday. One hour a week is enough.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <a
          href="/demo"
          className="rounded-full bg-[#1B3B5F] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2E5A88]"
        >
          Upload your resume →
        </a>
        <a
          href="#how"
          className="rounded-full border border-[#D9CFB5] bg-white px-5 py-3 text-sm font-medium text-[#1B3B5F] hover:border-[#2E5A88]"
        >
          See how it works
        </a>
        <p className="ml-1 text-xs text-[#5C6472]">~3 min to set up · free for spring ’26</p>
      </div>

      <div className="mt-12 overflow-hidden rounded-3xl border border-[#D9CFB5] bg-white shadow-sm">
        <ScenePreview />
      </div>
    </section>
  );
}

function FunnelSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">The IB funnel, honestly</p>
        <h2 className="mx-auto mt-4 max-w-2xl text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
          It takes ~120 networking calls to land one offer. <span className="italic text-[#2E5A88]">Consistency wins.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm text-[#4A5260] md:text-base">
          Banking recruiting is a filter, not a lottery. Referrals convert 10× better than the cold
          portal. The math is simple — you just need to keep showing up for sixteen weeks, not crush
          a single day.
        </p>
      </div>

      <div className="mt-12">
        <FunnelMath />
      </div>

      <p className="mx-auto mt-10 max-w-md text-center text-sm font-[family-name:var(--font-fraunces)] italic text-[#5C6472]">
        “The point isn’t to hustle harder. It’s to be consistent. An hour, three
        reaches, three times a week.”
        <br />
        <span className="text-[11px] not-italic">— Alma</span>
      </p>
    </section>
  );
}

function HowSection() {
  return (
    <section id="how" className="mx-auto max-w-5xl px-6 py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">How Alma helps</p>
        <h2 className="mt-4 text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
          Four beats, every week.
        </h2>
        <p className="mt-3 text-sm text-[#4A5260] md:text-base">
          Not a jobs board. Not a resume reviewer. A mentor and an operating system for the actual work
          of warm networking.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        {STEPS.map((step) => (
          <div key={step.n} className="rounded-2xl border border-[#D9CFB5] bg-white p-6">
            <p className="text-3xl font-[family-name:var(--font-fraunces)] tabular-nums leading-none text-[#2E5A88]">
              {step.n}
            </p>
            <h3 className="mt-4 text-lg font-[family-name:var(--font-fraunces)] text-[#14182A]">
              {step.title}
            </h3>
            <p
              className="mt-2 text-sm leading-relaxed text-[#4A5260]"
              dangerouslySetInnerHTML={{ __html: step.body }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function GlimpseSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">Your week in Alma</p>
        <h2 className="mt-4 text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
          Three surfaces. Zero spreadsheet.
        </h2>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {PREVIEWS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group flex flex-col rounded-2xl border border-[#D9CFB5] bg-white p-6 transition-colors hover:border-[#2E5A88]"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">{p.eyebrow}</p>
            <h3 className="mt-3 text-lg font-[family-name:var(--font-fraunces)] text-[#14182A]">{p.title}</h3>
            <p className="mt-2 flex-1 text-sm text-[#4A5260]">{p.body}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#1B3B5F] group-hover:underline">
              Take a look <span aria-hidden>→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ForWho() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">Built for you</p>
      <h2 className="mx-auto mt-4 max-w-2xl text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
        For students who refuse to lose recruiting <span className="italic text-[#2E5A88]">to bad organization</span>.
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-sm text-[#4A5260] md:text-base">
        Alma is built by a Brown student and a Rice student who know what it’s like to lose
        weeks to job boards. We started where it actually works — our own two campuses — and we’re
        growing from there.
      </p>

      <div className="mx-auto mt-10 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
        <CohortTile label="Brown" detail="spring alpha · 12 students" />
        <CohortTile label="Rice" detail="spring alpha · 8 students" />
        <CohortTile label="Next" detail="waitlist your campus" accent />
      </div>
    </section>
  );
}

function CohortTile({ label, detail, accent }: { label: string; detail: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 text-left ${
        accent ? "border-[#C86B4F]/40 bg-[#FDEFE7]" : "border-[#D9CFB5] bg-white"
      }`}
    >
      <p className={`font-[family-name:var(--font-fraunces)] text-xl ${accent ? "text-[#C86B4F]" : "text-[#14182A]"}`}>
        {label}
      </p>
      <p className={`mt-1 text-xs ${accent ? "text-[#C86B4F]" : "text-[#5C6472]"}`}>{detail}</p>
    </div>
  );
}

function FAQSection() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">Honest answers</p>
        <h2 className="mt-4 text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
          Questions worth asking.
        </h2>
      </div>

      <div className="mt-10 divide-y divide-[#D9CFB5] rounded-2xl border border-[#D9CFB5] bg-white">
        {FAQ.map((item, i) => (
          <details key={i} className="group">
            <summary className="flex cursor-pointer items-start justify-between gap-4 px-6 py-5 text-left">
              <p className="flex-1 text-base font-[family-name:var(--font-fraunces)] text-[#14182A]">
                {item.q}
              </p>
              <span className="shrink-0 text-lg text-[#5C6472] transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="px-6 pb-5 text-sm leading-relaxed text-[#4A5260]">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h2 className="mx-auto max-w-xl text-4xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-5xl">
        Ready to <span className="italic text-[#2E5A88]">leap</span>?
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm text-[#4A5260] md:text-base">
        Three minutes to set up. One hour a week to maintain. One offer to change the year.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          href="/demo"
          className="rounded-full bg-[#1B3B5F] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2E5A88]"
        >
          Upload your resume →
        </a>
        <a
          href="mailto:founders@alma.careers"
          className="rounded-full border border-[#D9CFB5] bg-white px-5 py-3 text-sm font-medium text-[#1B3B5F] hover:border-[#2E5A88]"
        >
          Talk to a founder
        </a>
      </div>
    </section>
  );
}

function Divider() {
  return (
    <div className="mx-auto max-w-5xl px-6">
      <div className="h-px bg-[#D9CFB5]" />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#D9CFB5] bg-[#F4EDDB]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-xs text-[#5C6472]">
        <p className="italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">alma &middot; built at Brown &amp; Rice</p>
        <div className="flex flex-wrap items-center gap-5">
          <a href="#how" className="hover:text-[#1B3B5F]">About</a>
          <a href="/privacy" className="hover:text-[#1B3B5F]">Privacy</a>
          <a href="mailto:founders@alma.careers" className="hover:text-[#1B3B5F]">Contact</a>
          <span className="text-[#8A8674]">spring ’26 alpha</span>
        </div>
      </div>
    </footer>
  );
}
