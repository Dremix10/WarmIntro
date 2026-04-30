import { Reveal } from "@/components/Reveal";
import { GradientOrb } from "@/components/GradientOrb";
import { GrainOverlay } from "@/components/GrainOverlay";
import { LogoMarquee } from "@/components/LogoMarquee";
import { StickyUploadCTA } from "@/components/StickyUploadCTA";
import { AuthAwareLogin } from "@/components/AuthAwareLogin";
import { SmoothScroll } from "@/components/SmoothScroll";
import { AnimatedHeadline } from "./_parts/AnimatedHeadline";
import { FunnelMathAnimated } from "./_parts/FunnelMathAnimated";
import { ScenePreviewTilted } from "./_parts/ScenePreviewTilted";
import { AgentLoop } from "./_parts/AgentLoop";
import { NoAITells } from "./_parts/NoAITells";
import { TrustGradient } from "./_parts/TrustGradient";
import { SurfacesStack } from "./_parts/SurfacesStack";
import { FlywheelTile } from "./_parts/FlywheelTile";
import { FoundersStrip } from "./_parts/FoundersStrip";


const FAQ = [
  {
    q: "Is Alma a jobs board?",
    a: "No. Alma doesn't list applications. It helps you reach the bankers who actually decide who gets a first round. The offer is almost never won on the application form.",
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
    q: "Are you private-beta or public?",
    a: "Private beta right now, invite-only for Brown and Rice. If you don't have an invite, drop your email at /coming-soon and we'll let you in as we open up.",
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
      <GradientOrb className="right-[-120px] top-[-140px]" size={720} opacity={0.55} />
      <GradientOrb className="left-[-140px] top-[280px]" size={520} opacity={0.32} />
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-28 md:pt-28 md:pb-32">
        <p
          className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472] opacity-0"
          style={{ animation: "fade-rise 700ms cubic-bezier(.22,.75,.3,1) 0ms forwards" }}
        >
          Investment banking &middot; for Brown &amp; Rice students &middot; 2026 cycle
        </p>

        <AnimatedHeadline />

        <p
          className="mt-8 max-w-2xl text-lg leading-[1.55] text-[#4A5260] opacity-0 md:text-xl"
          style={{ animation: "fade-rise 800ms cubic-bezier(.22,.75,.3,1) 1500ms forwards" }}
        >
          Alma is your AI networking team. It finds the alumni who&rsquo;ll take your call, drafts the
          emails you&rsquo;d actually send, and tracks every reply through superday. You spend your
          week on the calls, not the inbox.
        </p>

        <div
          className="mt-10 flex flex-wrap items-center gap-3 opacity-0"
          style={{ animation: "fade-rise 800ms cubic-bezier(.22,.75,.3,1) 1750ms forwards", pointerEvents: "auto" }}
        >
          <a
            href="/demo"
            className="rounded-full bg-[#1B3B5F] px-7 py-3.5 text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(27,59,95,.5)] transition-all hover:-translate-y-0.5 hover:bg-[#2E5A88] hover:shadow-[0_12px_32px_-8px_rgba(27,59,95,.6)]"
          >
            Try the demo →
          </a>
          <a
            href="/request-access"
            className="alma-card rounded-full border border-[#1B3B5F] px-6 py-3.5 text-base font-medium text-[#1B3B5F] hover:bg-[#1B3B5F]/5"
          >
            Request access
          </a>
          <a
            href="/login"
            className="alma-card rounded-full border border-[#1B3B5F]/40 bg-white px-6 py-3.5 text-base font-medium text-[#1B3B5F] hover:border-[#1B3B5F] hover:bg-[#1B3B5F]/5"
          >
            Already in? Sign in →
          </a>
        </div>
        <p className="mt-4 ml-1 text-xs text-[#5C6472]">Closed beta · 100 founding users · free for 2026 cycle</p>

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
            Built by <strong className="text-[#14182A]">2 Rice · 1 Brown · 1 MIT</strong> sophomores
          </span>
        </div>

        <div
          className="mt-12 overflow-hidden rounded-3xl border border-[#D9CFB5] bg-white shadow-sm opacity-0"
          style={{ animation: "fade-rise 900ms cubic-bezier(.22,.75,.3,1) 2400ms forwards" }}
        >
          <ScenePreviewTilted />
        </div>
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
          <h2 className="mx-auto mt-4 max-w-2xl text-[40px] leading-[1.05] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[64px]">
            It takes ~120 networking calls to land one offer.{" "}
            <span className="italic text-[#2E5A88]">Consistency wins.</span>
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
          &ldquo;Five minutes a morning. Sixteen weeks of consistency. One offer.&rdquo;
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
          <h2 className="mt-4 text-[40px] leading-[1.05] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[64px]">
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
        <h2 className="relative mx-auto max-w-xl text-[56px] leading-[1.02] tracking-[-0.02em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[88px]">
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
            Try the demo →
          </a>
          <a
            href="/request-access"
            className="rounded-full border border-[#1B3B5F] px-6 py-3 text-sm font-semibold text-[#1B3B5F] transition-colors hover:bg-[#1B3B5F]/5"
          >
            Request access
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
          <a href="#about" className="hover:text-[#1B3B5F]">About</a>
          <a href="/privacy" className="hover:text-[#1B3B5F]">Privacy</a>
          <a href="mailto:founders@alma.careers" className="hover:text-[#1B3B5F]">Contact</a>
          <span className="text-[#8A8674]">2026 cycle</span>
        </div>
      </div>
    </footer>
  );
}
