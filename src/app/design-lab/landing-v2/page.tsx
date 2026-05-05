import { Reveal } from "@/components/Reveal";
import { GradientOrb } from "@/components/GradientOrb";
import { GrainOverlay } from "@/components/GrainOverlay";
import { LogoMarquee } from "@/components/LogoMarquee";
import { StickyUploadCTA } from "@/components/StickyUploadCTA";
import { AuthAwareLogin } from "@/components/AuthAwareLogin";
import { SmoothScroll } from "@/components/SmoothScroll";
import { AnimatedHeadline } from "./_parts/AnimatedHeadline";
import { FunnelMathAnimated } from "./_parts/FunnelMathAnimated";
import { AgentLoop } from "./_parts/AgentLoop";
import { NoAITells } from "./_parts/NoAITells";
import { TrustGradient } from "./_parts/TrustGradient";
import { SurfacesStack } from "./_parts/SurfacesStack";
import { FlywheelTile } from "./_parts/FlywheelTile";
import { FoundersStrip } from "./_parts/FoundersStrip";


const FAQ = [
  {
    q: "Is Alma a jobs board?",
    a: "No. Alma does not list applications. It helps you find the bankers who are most likely to take your call, write the outreach, and keep the follow-up loop moving until your pipeline turns into interviews.",
  },
  {
    q: "Why connect my Gmail?",
    a: "So outreach stays in your real inbox. Alma creates Gmail drafts, watches Alma-started threads for replies, and logs every action at /account/privacy. You can revoke access anytime.",
  },
  {
    q: "What does it cost?",
    a: "The founding cohort is free through the 2026 recruiting cycle while we work closely with Brown and Rice testers.",
  },
  {
    q: "I'm not a finance major. Does that matter?",
    a: "No. Every year students break in from econ, stats, math, CS, history, engineering, even art. What matters is the calls, the GPA, and a clear story for why banking. Alma helps with all three.",
  },
  {
    q: "Which banks do you cover?",
    a: "We cover the main IB recruiting targets students ask for: Bulge Bracket, Elite Boutique, and Middle Market firms, with firm and group picks during setup.",
  },
  {
    q: "Are you private-beta or public?",
    a: "The product is still gated, but the request list is open. Request access and we will bring students in as fast as we can support them well.",
  },
];

const LIVE_POINTS = [
  {
    k: "Gmail-first",
    v: "Drafts land in Gmail. Replies are watched from the original thread.",
  },
  {
    k: "Trust dial",
    v: "Start in Copilot, then graduate to preview-veto or autopilot when you are ready.",
  },
  {
    k: "Live pipeline",
    v: "Sent, replied, coffee, referral, first round, superday, offer.",
  },
];

export default function LandingV2() {
  return (
    <div className="relative bg-[#EAE3D2] text-[#14182A]">
      <SmoothScroll />
      <GrainOverlay />

      <TopBar />

      <Hero />
      <LogoMarquee />
      <LaunchStatus />

      <Divider />
      <AgentLoop />
      <Divider />
      <FunnelSection />
      <Divider />
      <NoAITells />
      <Divider />
      <TrustGradient />
      <Divider />
      <SurfacesStack />
      <Divider />
      <FlywheelTile />
      <Divider />
      <FoundersStrip />
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
          <a href="#how" className="hidden hover:text-[#1B3B5F] sm:inline">How it works</a>
          <a href="#faq" className="hover:text-[#1B3B5F]">FAQ</a>
          <a
            href="/request-access"
            className="hidden rounded-full bg-[#1B3B5F] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#2E5A88] sm:inline-flex"
          >
            Request access
          </a>
          <AuthAwareLogin className="rounded-full border border-[#D9CFB5] bg-white px-4 py-1.5 text-xs font-medium text-[#1B3B5F] hover:border-[#2E5A88]" />
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <GradientOrb className="right-[-120px] top-[-140px]" size={720} opacity={0.55} />
      <GradientOrb className="left-[-140px] top-[280px]" size={520} opacity={0.32} />
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-28 md:pt-28 md:pb-32">
        <p
          className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472] opacity-0"
          style={{ animation: "fade-rise 700ms cubic-bezier(.22,.75,.3,1) 0ms forwards" }}
        >
          Investment banking &middot; request list open &middot; 2026 cycle
        </p>

        <AnimatedHeadline />

        <p
          className="mt-6 max-w-2xl text-base leading-[1.55] text-[#4A5260] opacity-0 sm:mt-8 sm:text-lg md:text-xl"
          style={{ animation: "fade-rise 800ms cubic-bezier(.22,.75,.3,1) 1500ms forwards" }}
        >
          Alma is the email-first recruiting agent for students breaking into investment banking.
          It finds the right alumni, drafts outreach in your voice, mirrors it into Gmail, tracks
          replies, and keeps your pipeline moving while you focus on calls.
        </p>

        <div
          className="mt-10 flex flex-wrap items-center gap-3 opacity-0"
          style={{ animation: "fade-rise 800ms cubic-bezier(.22,.75,.3,1) 1750ms forwards", pointerEvents: "auto" }}
        >
          <a
            href="/request-access"
            className="rounded-full bg-[#1B3B5F] px-7 py-3.5 text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(27,59,95,.5)] transition-all hover:-translate-y-0.5 hover:bg-[#2E5A88] hover:shadow-[0_12px_32px_-8px_rgba(27,59,95,.6)]"
          >
            Request access →
          </a>
          <a
            href="/demo"
            className="alma-card rounded-full border border-[#1B3B5F] px-6 py-3.5 text-base font-medium text-[#1B3B5F] hover:bg-[#1B3B5F]/5"
          >
            Try the demo
          </a>
          <a
            href="/login"
            className="alma-card rounded-full border border-[#1B3B5F]/40 bg-white px-6 py-3.5 text-base font-medium text-[#1B3B5F] hover:border-[#1B3B5F] hover:bg-[#1B3B5F]/5"
          >
            Already in? Sign in →
          </a>
        </div>
        <p className="mt-4 ml-1 text-xs text-[#5C6472]">Founding cohort · request queue open · free for 2026 cycle</p>

        <div
          className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-dashed border-[#D9CFB5] pt-4 opacity-0"
          style={{ animation: "fade-rise 800ms cubic-bezier(.22,.75,.3,1) 2200ms forwards" }}
        >
          <span className="inline-flex items-center gap-2 text-xs text-[#5C6472]">
            <span
              className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-[#FCD34D] bg-[#FEF3C7] text-[10px] font-bold text-[#92400E]"
              aria-hidden
            >
              ★
            </span>
            <span>
              <strong className="text-[#14182A]">Track winner</strong>, Y-Claude Builder Club Hackathon at Rice · April 2026
            </span>
          </span>
          <span className="text-xs text-[#5C6472]">
            Built by <strong className="text-[#14182A]">3 students at Rice and Brown</strong> who are recruiting and testing with students live
          </span>
        </div>
      </div>
    </section>
  );
}

function LaunchStatus() {
  return (
    <section className="bg-[#F4EDDB]">
      <div className="mx-auto grid max-w-5xl gap-4 px-6 py-7 md:grid-cols-3">
        {LIVE_POINTS.map((point) => (
          <div key={point.k} className="border-l border-[#D9CFB5] pl-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2E5A88]">
              {point.k}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#4A5260]">{point.v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FunnelSection() {
  return (
    <section className="relative mx-auto max-w-4xl px-6 py-28 md:py-36">
      <GradientOrb className="-left-40 top-1/2 -translate-y-1/2" size={520} opacity={0.28} />
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            The IB funnel, honestly
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-[28px] leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] sm:text-[40px] sm:leading-[1.08] md:text-[60px]">
            <span className="block">It takes ~120 networking calls to land one offer.</span>
            <span className="block italic text-[#2E5A88]">Consistency wins.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-[#4A5260] md:text-base">
            Banking recruiting is a filter, not a lottery. Referrals convert 10× better than the
            cold portal. The math is simple. You just need to keep showing up for sixteen weeks,
            not crush a single day.
          </p>
        </div>
      </Reveal>

      <Reveal delay={100} className="mt-12">
        <FunnelMathAnimated />
      </Reveal>

      <Reveal delay={200}>
        <p className="mx-auto mt-12 max-w-2xl text-center text-lg font-[family-name:var(--font-fraunces)] italic leading-snug text-[#4A5260] md:text-xl">
          &ldquo;Five minutes a morning. Sixteen weeks of consistent outreach. One serious pipeline.&rdquo;
          <br />
          <span className="text-xs not-italic text-[#5C6472]">· Alma</span>
        </p>
      </Reveal>
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
          <h2 className="mt-4 text-[30px] leading-[1.05] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] sm:text-[40px] md:text-[64px]">
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
    <section className="relative mx-auto max-w-3xl px-6 py-28 text-center md:py-36">
      <GradientOrb className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" size={680} opacity={0.34} />
      <Reveal>
        <h2 className="relative mx-auto max-w-xl text-[40px] leading-[1.05] tracking-[-0.02em] font-[family-name:var(--font-fraunces)] text-[#14182A] sm:text-[56px] sm:leading-[1.02] md:text-[88px]">
          Get your recruiting system <span className="italic text-[#2E5A88]">running</span>.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-[#4A5260] md:text-base">
          Request access now. We are opening the founding cohort in waves while recruiting season is still moving.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/request-access"
            className="rounded-full bg-[#1B3B5F] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2E5A88]"
          >
            Request access →
          </a>
          <a
            href="/demo"
            className="rounded-full border border-[#1B3B5F] px-6 py-3 text-sm font-semibold text-[#1B3B5F] transition-colors hover:bg-[#1B3B5F]/5"
          >
            Try the demo
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
          alma &middot; built at Rice &amp; Brown
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <a href="#about" className="hover:text-[#1B3B5F]">About</a>
          <a href="/privacy" className="hover:text-[#1B3B5F]">Privacy</a>
          <a href="mailto:founders@alma.careers" className="hover:text-[#1B3B5F]">Contact</a>
          <span className="text-[#8A8674]">2026 cycle</span>
        </div>
      </div>
    </footer>
  );
}
