import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
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


const INSTAGRAM_URL = "https://www.instagram.com/alma_careers/";

const FAQ = [
  {
    q: "Is Alma a jobs board?",
    a: "No. Alma is the work before the application: finding people to talk to, writing the first email, following up, and keeping track of who replied. The goal is to turn a cold list into real conversations before interviews start.",
  },
  {
    q: "Why connect my Gmail?",
    a: "So the emails come from your real school address and replies land in your real inbox. Alma creates drafts, watches only Alma-started threads for replies, and logs every action at /account/privacy. You can revoke access anytime.",
  },
  {
    q: "What does founding-user access include?",
    a: "Brown and Rice founding users get Alma free for the 2026 recruiting cycle. In return, we ask for honest feedback so the product gets sharper while your recruiting pipeline is live.",
  },
  {
    q: "I'm not a finance major. Does that matter?",
    a: "No. That is exactly who Alma is for. One early tester was an architecture major with no finance background and no banking LinkedIn presence. After 30 Alma-assisted emails, she booked 3 coffee chats with bankers. Alma helps you sound curious and prepared, not like you are pretending.",
  },
  {
    q: "Which banks do you cover?",
    a: "During setup you pick the banks you care about. Alma covers the large banks students know, smaller advisory firms, and middle-market banks, then prioritizes bankers with some reason to reply: same school, similar major, shared club, or relevant career path.",
  },
  {
    q: "Will every email sound the same?",
    a: "No. Alma uses your resume, your school, your target banks, your edits, and your skip feedback. If you keep changing a phrase, Alma should learn that. If you say an email sounds too formal, the next batch should move closer to you.",
  },
  {
    q: "Are you private-beta or public?",
    a: "The landing page is public, but the product is still a closed beta. Brown and Rice students are first priority. Students from other schools can still request access and join as we open more seats.",
  },
];

const LIVE_POINTS = [
  {
    k: "Closed beta",
    v: "Brown and Rice founding users get the 2026 cycle free while seats open in waves.",
  },
  {
    k: "Beginner friendly",
    v: "Alma writes like a curious student, not someone pretending to know banking already.",
  },
  {
    k: "Gmail-first",
    v: "You approve drafts from your inbox. Replies come back to the same thread.",
  },
];

export default function LandingV2() {
  return (
    <div className="relative bg-[#EAE3D2] text-[#14182A]">
      <SmoothScroll />
      <GrainOverlay />

      <TopBar />

      <Hero />
      <OnboardingPath />
      <LogoMarquee />
      <LaunchStatus />

      <Divider />
      <AgentLoop />
      <Divider />
      <FoundingCohort />
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
        <Link href="/" aria-label="Alma home" className="block transition-opacity hover:opacity-80">
          <Image
            src="/brand/alma-wordmark-cream.webp"
            alt="Alma"
            width={220}
            height={93}
            priority
            className="h-10 w-auto mix-blend-multiply"
          />
        </Link>
        <nav className="flex items-center gap-5 text-sm text-[#5C6472]">
          <a href="#how" className="hidden hover:text-[#1B3B5F] sm:inline">How it works</a>
          <a href="#faq" className="hover:text-[#1B3B5F]">FAQ</a>
          <a
            href="/request-access"
            className="hidden rounded-full bg-[#1B3B5F] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#2E5A88] sm:inline-flex"
          >
            Join cohort
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
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-28 md:pt-28 md:pb-32">
        <p
          className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472] opacity-0"
          style={{ animation: "fade-rise 700ms cubic-bezier(.22,.75,.3,1) 0ms forwards" }}
        >
          Investment banking &middot; founding-user cohort &middot; 2026 cycle
        </p>

        <AnimatedHeadline />

        <p
          className="mt-6 max-w-2xl text-base leading-[1.55] text-[#4A5260] sm:mt-8 sm:text-lg md:text-xl"
        >
          Alma helps students break into investment banking without already speaking finance.
          It finds alumni and bankers worth contacting, drafts beginner-friendly emails in your voice,
          puts them in Gmail, and keeps the follow-up loop moving.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href="/request-access"
            className="w-full rounded-full bg-[#1B3B5F] px-7 py-3.5 text-center text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(27,59,95,.5)] transition-all hover:-translate-y-0.5 hover:bg-[#2E5A88] hover:shadow-[0_12px_32px_-8px_rgba(27,59,95,.6)] sm:w-auto"
          >
            Join the founding cohort →
          </a>
          <a
            href="#how"
            className="alma-card w-full rounded-full border border-[#1B3B5F] px-6 py-3.5 text-center text-base font-medium text-[#1B3B5F] hover:bg-[#1B3B5F]/5 sm:w-auto"
          >
            See how it works
          </a>
          <a
            href="/login"
            className="alma-card w-full rounded-full border border-[#1B3B5F]/40 bg-white px-6 py-3.5 text-center text-base font-medium text-[#1B3B5F] hover:border-[#1B3B5F] hover:bg-[#1B3B5F]/5 sm:w-auto"
          >
            Already in? Sign in →
          </a>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-[#5C6472]">
          Brown and Rice priority · founding users free for the 2026 recruiting cycle
        </p>
      </div>
    </section>
  );
}

function OnboardingPath() {
  const steps = [
    {
      k: "01",
      title: "Upload your resume",
      body: "Alma learns your school, major, clubs, story, and what you have already done.",
    },
    {
      k: "02",
      title: "Pick your target banks",
      body: "Choose the firms you care about. You can start broad and narrow it later.",
    },
    {
      k: "03",
      title: "Get matched to real people",
      body: "Alma looks for alumni, similar majors, shared clubs, and bankers whose path you can actually ask about.",
    },
    {
      k: "04",
      title: "Approve the first emails",
      body: "Drafts land in Gmail. You edit or approve, and Alma learns from what you change.",
    },
  ];

  return (
    <section className="relative z-10 mx-auto -mt-16 max-w-6xl px-6 pb-16">
      <div className="grid gap-3 md:grid-cols-4">
        {steps.map((step) => (
          <div key={step.k} className="rounded-2xl border border-[#D9CFB5] bg-white p-4 shadow-[0_12px_28px_-18px_rgba(27,59,95,.35)]">
            <p className="font-mono text-[11px] font-semibold text-[#C86B4F]">{step.k}</p>
            <h3 className="mt-2 text-lg leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A]">
              {step.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[#4A5260]">{step.body}</p>
          </div>
        ))}
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
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            The IB funnel, honestly
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-[28px] leading-[1.1] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] sm:text-[40px] sm:leading-[1.08] md:text-[60px]">
            <span className="block">The students who win keep showing up.</span>
            <span className="block italic text-[#2E5A88]">Consistency wins.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-[#4A5260] md:text-base">
            The pipeline is not referral to first round to offer on day one. It starts much earlier:
            find names, send thoughtful emails, get replies, book coffee chats, earn referrals,
            and turn those relationships into interviews.
          </p>
        </div>
      </Reveal>

      <Reveal delay={100} className="mt-12">
        <FunnelMathAnimated />
      </Reveal>

      <Reveal delay={200}>
        <p className="mx-auto mt-12 max-w-2xl text-center text-lg font-[family-name:var(--font-fraunces)] italic leading-snug text-[#4A5260] md:text-xl">
          &ldquo;Five minutes a morning. Sixteen weeks of consistent outreach. One serious shot.&rdquo;
          <br />
          <span className="text-xs not-italic text-[#5C6472]">· Alma</span>
        </p>
      </Reveal>
    </section>
  );
}

function FoundingCohort() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <Reveal>
        <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-stretch">
          <div className="rounded-3xl bg-[#1B3B5F] p-7 text-white md:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
              Founding-user cohort
            </p>
            <h2 className="mt-4 max-w-xl text-[36px] leading-[1.05] font-[family-name:var(--font-fraunces)] md:text-[56px]">
              Brown and Rice students get the 2026 cycle free.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/80 md:text-base">
              We are bringing students in carefully because this touches your real inbox and your
              real recruiting year. Founding users get the full product free, direct feedback loops
              with us, and priority on improvements while recruiting is live.
            </p>
            <a
              href="/request-access"
              className="mt-7 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#1B3B5F] transition-colors hover:bg-[#F4EDDB]"
            >
              Request a founding seat →
            </a>
          </div>
          <div className="rounded-3xl border border-[#D9CFB5] bg-white p-7 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#C86B4F]">
              Early proof
            </p>
            <p className="mt-4 text-5xl leading-none font-[family-name:var(--font-fraunces)] text-[#14182A]">
              30 → 3
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#4A5260]">
              An architecture major with no finance background used Alma for 30 cold emails and
              booked 3 coffee chats with bankers. The point was not sounding like a finance expert. It
              was sounding prepared enough for someone to help.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              {["You", "Next", "Next"].map((label, i) => (
                <div key={`${label}-${i}`} className="rounded-2xl border border-dashed border-[#D9CFB5] bg-[#F9F5EB] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8A8674]">
                    Seat
                  </p>
                  <p className="mt-1 text-sm font-[family-name:var(--font-fraunces)] text-[#1B3B5F]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
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
      <Reveal>
        <h2 className="relative mx-auto max-w-xl text-[40px] leading-[1.05] tracking-[-0.02em] font-[family-name:var(--font-fraunces)] text-[#14182A] sm:text-[56px] sm:leading-[1.02] md:text-[88px]">
          Get your recruiting system <span className="italic text-[#2E5A88]">running</span>.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-[#4A5260] md:text-base">
          Request a founding seat. We are opening Brown and Rice first, then expanding as fast as we can support students well.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/request-access"
            className="rounded-full bg-[#1B3B5F] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2E5A88]"
          >
            Request a founding seat →
          </a>
          <a
            href="#how"
            className="rounded-full border border-[#1B3B5F] px-6 py-3 text-sm font-semibold text-[#1B3B5F] transition-colors hover:bg-[#1B3B5F]/5"
          >
            See how it works
          </a>
          <a
            href="mailto:founders@alma.careers"
            className="rounded-full border border-[#D9CFB5] bg-white px-5 py-3 text-sm font-medium text-[#1B3B5F] hover:border-[#2E5A88]"
          >
            Contact us
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
        <Image
          src="/brand/alma-wordmark-cream.webp"
          alt="Alma"
          width={220}
          height={93}
          className="h-8 w-auto mix-blend-multiply"
        />
        <div className="flex flex-wrap items-center gap-5">
          <a href="/privacy" className="hover:text-[#1B3B5F]">Privacy</a>
          <a href={INSTAGRAM_URL} className="hover:text-[#1B3B5F]">Instagram</a>
          <a href="mailto:founders@alma.careers" className="hover:text-[#1B3B5F]">Contact</a>
          <span className="text-[#8A8674]">2026 cycle</span>
        </div>
      </div>
    </footer>
  );
}
