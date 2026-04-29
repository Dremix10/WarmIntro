import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { GradientOrb } from "@/components/GradientOrb";
import { GrainOverlay } from "@/components/GrainOverlay";
import { LogoMarquee } from "@/components/LogoMarquee";
import { StickyUploadCTA } from "@/components/StickyUploadCTA";
import { AuthAwareLogin } from "@/components/AuthAwareLogin";
import { AnimatedHeadline } from "./_parts/AnimatedHeadline";
import { FunnelMathAnimated } from "./_parts/FunnelMathAnimated";
import { ScenePreviewTilted } from "./_parts/ScenePreviewTilted";

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
    body: "Network archipelago, CRM kanban, weekly Sunday recap. Stages mapped to the real IB funnel — call → coffee → referral → first round → superday → offer.",
  },
];

const PREVIEWS = [
  {
    href: "/today",
    eyebrow: "Your queue",
    title: "Today's outreach, lined up.",
    body: "Drafts ready for review. Trust dial: copilot, preview-veto, autopilot. You decide.",
  },
  {
    href: "/network",
    eyebrow: "Archipelago",
    title: "Your network, as a place.",
    body: "Every bank is an island. Every intro builds a little more of a home standing on it.",
  },
  {
    href: "/crm",
    eyebrow: "Pipeline kanban",
    title: "Every banker, every stage.",
    body: "Draft → sent → replied → coffee → referral → first round → superday → offer. Updates as Alma works.",
  },
];

const FAQ = [
  {
    q: "Is Alma a jobs board?",
    a: "No. Alma doesn't list applications. It helps you reach the bankers who actually decide who gets a first round. The offer is almost never won on the application form.",
  },
  {
    q: "Does Alma send emails for me?",
    a: "Yes — your way. You start in Copilot mode where Alma drafts and you copy or auto-send from your own Gmail. Two more modes (Preview-veto and Autopilot) unlock as you build trust. You stay in control.",
  },
  {
    q: "Why connect my Gmail?",
    a: "So messages send from your real address. Bankers reply to you, not to a third-party system. We use the narrowest scope possible (compose drafts and watch only Alma-sent threads for replies). Every action is logged at /account/privacy and you can revoke anytime.",
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
    a: "All of them. Bulge Bracket (GS, MS, JPM, BAML, Citi, Barclays, DB, UBS), Elite Boutiques (Evercore, Centerview, Lazard, Moelis, PJT, Guggenheim, Perella, Greenhill, Qatalyst), Middle Market (Jefferies, Houlihan Lokey, Raymond James, William Blair, Baird, Piper Sandler). Pick a tier, pick a group, go.",
  },
  {
    q: "Will recruiters see I used AI?",
    a: "No. Drafts are written to sound like a real curious sophomore. The system explicitly bans the AI tells (em-dashes, generic praise, consultant-speak). A second model reviews every draft and rewrites it if it sounds robotic. You make it yours with one or two edits before it goes out.",
  },
  {
    q: "Are you private-beta or public?",
    a: "Private beta right now — invite-only for Brown and Rice. If you don't have an invite, drop your email at /coming-soon and we'll let you in as we open up.",
  },
];

import { RecoveryHashRedirect } from "@/components/RecoveryHashRedirect";

export default function LandingV2() {
  return (
    <div className="relative bg-[#EAE3D2] text-[#14182A]">
      <GrainOverlay />

      <RecoveryHashRedirect />
      <TopBar />

      <Hero />
      <LogoMarquee />

      <Divider />
      <FunnelSection />
      <Divider />
      <HowSection />
      <Divider />
      <GlimpseSection />
      <Divider />
      <FAQSection />
      <ClosingCTA />
      <Footer />

      <StickyUploadCTA afterPx={700} />
    </div>
  );
}

function TopBar() {
  return (
    <header className="relative z-20 border-b border-[#D9CFB5] bg-[#EAE3D2]/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <p className="text-2xl italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">alma</p>
        <nav className="flex items-center gap-5 text-sm text-[#5C6472]">
          <a href="#how" className="hover:text-[#1B3B5F]">How it works</a>
          <a href="#faq" className="hover:text-[#1B3B5F]">FAQ</a>
          <AuthAwareLogin className="rounded-full border border-[#D9CFB5] bg-white px-4 py-1.5 text-xs font-medium text-[#1B3B5F] hover:border-[#2E5A88]" />
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <GradientOrb className="right-[-80px] top-[-100px]" />
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-16 pb-20 md:pt-24 md:pb-24">
        <p
          className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472] opacity-0"
          style={{ animation: "fade-rise 700ms cubic-bezier(.22,.75,.3,1) 0ms forwards" }}
        >
          Investment banking &middot; for Brown &amp; Rice students &middot; 2026 cycle
        </p>

        <AnimatedHeadline />

        <p
          className="mt-6 max-w-xl text-base leading-relaxed text-[#4A5260] opacity-0 md:text-lg"
          style={{ animation: "fade-rise 800ms cubic-bezier(.22,.75,.3,1) 1500ms forwards" }}
        >
          Alma reads your resume, finds alumni at every bank and coverage group, drafts the call
          requests you&rsquo;d actually send, and tracks you through superday. One hour a week is
          enough.
        </p>

        <div
          className="mt-8 flex flex-wrap items-center gap-3 opacity-0"
          style={{ animation: "fade-rise 800ms cubic-bezier(.22,.75,.3,1) 1750ms forwards", pointerEvents: "auto" }}
        >
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
          <p className="ml-1 text-xs text-[#5C6472]">~3 min to set up · free for 2026 cycle</p>
        </div>

        <div
          className="mt-12 overflow-hidden rounded-3xl border border-[#D9CFB5] bg-white shadow-sm opacity-0"
          style={{ animation: "fade-rise 900ms cubic-bezier(.22,.75,.3,1) 2000ms forwards" }}
        >
          <ScenePreviewTilted />
        </div>
      </div>
    </section>
  );
}

function FunnelSection() {
  return (
    <section className="relative mx-auto max-w-4xl px-6 py-20">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            The IB funnel, honestly
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
            It takes ~120 networking calls to land one offer.{" "}
            <span className="italic text-[#2E5A88]">Consistency wins.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-[#4A5260] md:text-base">
            Banking recruiting is a filter, not a lottery. Referrals convert 10× better than the
            cold portal. The math is simple — you just need to keep showing up for sixteen weeks,
            not crush a single day.
          </p>
        </div>
      </Reveal>

      <Reveal delay={100} className="mt-12">
        <FunnelMathAnimated />
      </Reveal>

      <Reveal delay={200}>
        <p className="mx-auto mt-10 max-w-md text-center text-sm font-[family-name:var(--font-fraunces)] italic text-[#5C6472]">
          &ldquo;The point isn&rsquo;t to hustle harder. It&rsquo;s to be consistent. An hour, three
          reaches, three times a week.&rdquo;
          <br />
          <span className="text-[11px] not-italic">— Alma</span>
        </p>
      </Reveal>
    </section>
  );
}

function HowSection() {
  return (
    <section id="how" className="mx-auto max-w-5xl px-6 py-20">
      <Reveal>
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            How Alma helps
          </p>
          <h2 className="mt-4 text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
            Four beats, every week.
          </h2>
          <p className="mt-3 text-sm text-[#4A5260] md:text-base">
            Not a jobs board. Not a resume reviewer. A mentor and an operating system for the actual
            work of warm networking.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        {STEPS.map((step, i) => (
          <Reveal key={step.n} delay={i * 80}>
            <div className="h-full rounded-2xl border border-[#D9CFB5] bg-white p-6 transition-colors hover:border-[#2E5A88]">
              <p className="text-3xl font-[family-name:var(--font-fraunces)] tabular-nums leading-none text-[#2E5A88]">
                {step.n}
              </p>
              <h3 className="mt-4 text-lg font-[family-name:var(--font-fraunces)] text-[#14182A]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4A5260]">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function GlimpseSection() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <Reveal>
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            Your week in Alma
          </p>
          <h2 className="mt-4 text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
            Three surfaces. Zero spreadsheet.
          </h2>
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        {PREVIEWS.map((p, i) => (
          <Reveal key={p.href} delay={i * 80}>
            <Link
              href={p.href}
              className="group flex h-full flex-col rounded-2xl border border-[#D9CFB5] bg-white p-6 transition-colors hover:border-[#2E5A88]"
            >
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#5C6472]">
                {p.eyebrow}
              </p>
              <h3 className="mt-3 text-lg font-[family-name:var(--font-fraunces)] text-[#14182A]">
                {p.title}
              </h3>
              <p className="mt-2 flex-1 text-sm text-[#4A5260]">{p.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#1B3B5F] group-hover:underline">
                Take a look <span aria-hidden>→</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            Honest answers
          </p>
          <h2 className="mt-4 text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
            Questions worth asking.
          </h2>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="mt-10 divide-y divide-[#D9CFB5] rounded-2xl border border-[#D9CFB5] bg-white">
          {FAQ.map((item, i) => (
            <details key={i} className="group">
              <summary className="flex cursor-pointer items-start justify-between gap-4 px-6 py-5 text-left">
                <p className="flex-1 text-base font-[family-name:var(--font-fraunces)] text-[#14182A]">
                  {item.q}
                </p>
                <span className="shrink-0 text-lg text-[#5C6472] transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-6 pb-5 text-sm leading-relaxed text-[#4A5260]">{item.a}</p>
            </details>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 text-center">
      <Reveal>
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
      </Reveal>
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
        <p className="italic text-[#1B3B5F] font-[family-name:var(--font-fraunces)]">
          alma &middot; built at Brown &amp; Rice
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <a href="#how" className="hover:text-[#1B3B5F]">About</a>
          <a href="/privacy" className="hover:text-[#1B3B5F]">Privacy</a>
          <a href="mailto:founders@alma.careers" className="hover:text-[#1B3B5F]">Contact</a>
          <span className="text-[#8A8674]">2026 cycle</span>
        </div>
      </div>
    </footer>
  );
}
