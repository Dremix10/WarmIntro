import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { GrainOverlay } from "@/components/GrainOverlay";
import { LogoMarquee } from "@/components/LogoMarquee";
import { StickyUploadCTA } from "@/components/StickyUploadCTA";
import { SmoothScroll } from "@/components/SmoothScroll";
import { AnimatedHeadline } from "./_parts/AnimatedHeadline";
import { AgentLoop } from "./_parts/AgentLoop";
import { NoAITells } from "./_parts/NoAITells";
import { TrustGradient } from "./_parts/TrustGradient";
import { FlywheelTile } from "./_parts/FlywheelTile";


const INSTAGRAM_URL = "https://www.instagram.com/alma_careers/";

const FAQ = [
  {
    q: "What exactly does Alma do?",
    a: "Alma helps with the networking work before applications: finding people to talk to, drafting the first email, following up, and keeping track of who replied. The goal is to turn a cold list into real conversations.",
  },
  {
    q: "Why connect my Gmail?",
    a: "So drafts live in your real school inbox and replies land where you already work. Today Alma creates Gmail drafts and watches Alma-started threads for replies. Optional tone review from recent sent-email examples will be permissioned, visible, and revocable.",
  },
  {
    q: "Does Alma send emails without me?",
    a: "Not at the start. Alma creates Gmail drafts first. You can edit, approve, skip, or ask for a rewrite before anything leaves your inbox. More automation is optional later.",
  },
  {
    q: "What does a launch seat include?",
    a: "The first 50 Brown/Rice students get Alma free for the 2026 recruiting cycle. We are opening seats carefully because Alma uses your real inbox and real recruiting pipeline. Students from other schools can still request access and join the waitlist.",
  },
  {
    q: "I'm not a finance major. Does that matter?",
    a: "No. That is exactly who Alma is for. One early tester was an architecture major with no finance background and no banking LinkedIn presence. After 30 Alma-assisted emails, she booked 3 coffee chats with bankers. Alma helps you sound curious and prepared, not like you are pretending.",
  },
  {
    q: "Which banks do you cover?",
    a: "During setup you pick the banks you care about. Alma starts with major investment banking targets and prioritizes people with some reason to reply: same school, similar major, shared club, or a relevant career path.",
  },
  {
    q: "Will every email sound the same?",
    a: "No. Alma uses your resume, school, target banks, edits, and skip feedback. If you change a phrase, say a draft sounds off, or give tone preferences, the next batch should move closer to you.",
  },
  {
    q: "Can I request access if I am not at Brown or Rice?",
    a: "Yes. Brown and Rice students are first priority this week, but students from other schools can request access and join the waitlist as we open more seats.",
  },
];

export default function LandingV2() {
  return (
    <div className="relative bg-[#EAE3D2] text-[#14182A]">
      <SmoothScroll />
      <GrainOverlay />

      <TopBar />

      <LogoMarquee />
      <Hero />
      <OnboardingPath />

      <Divider />
      <AgentLoop />
      <Divider />
      <NoAITells />
      <Divider />
      <FlywheelTile />
      <Divider />
      <TrustGradient />
      <Divider />
      <LaunchSeats />
      <Divider />
      <FunnelSection />
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
            src="/logo-alma.svg"
            alt="Alma"
            width={180}
            height={60}
            priority
            className="h-10 w-auto"
          />
        </Link>
        <nav className="flex items-center gap-5 text-sm text-[#5C6472]">
          <a href="#how" className="hidden hover:text-[#1B3B5F] sm:inline">How it works</a>
          <a href="#faq" className="hover:text-[#1B3B5F]">FAQ</a>
          <a
            href="/request-access"
            className="rounded-full bg-[#1B3B5F] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#2E5A88]"
          >
            Request a seat
          </a>
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
          Investment banking &middot; 50 launch seats &middot; 2026 cycle
        </p>

        <AnimatedHeadline />

        <p
          className="mt-6 max-w-2xl text-base leading-[1.55] text-[#4A5260] sm:mt-8 sm:text-lg md:text-xl"
        >
          Alma finds alumni and bankers from our private recruiting database, prioritizes people with
          a reason to reply, writes the email in your voice, and puts it in Gmail for review.
          Start with a one-minute check. Speed up when you trust it.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href="/request-access"
            className="w-full rounded-full bg-[#1B3B5F] px-7 py-3.5 text-center text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(27,59,95,.5)] transition-all hover:-translate-y-0.5 hover:bg-[#2E5A88] hover:shadow-[0_12px_32px_-8px_rgba(27,59,95,.6)] sm:w-auto"
          >
            Request a seat →
          </a>
          <a
            href="#how"
            className="alma-card w-full rounded-full border border-[#1B3B5F] px-6 py-3.5 text-center text-base font-medium text-[#1B3B5F] hover:bg-[#1B3B5F]/5 sm:w-auto"
          >
            See how it works
          </a>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-[#5C6472]">
          50 Brown/Rice launch seats · free for the 2026 cycle · first come, first served
        </p>
      </div>
    </section>
  );
}

function OnboardingPath() {
  const steps = [
    {
      k: "01",
      title: "Upload your resume + connect Gmail",
      body: "Alma learns your background and drafts in your real inbox. With permission, tone review can use recent sent-email examples too.",
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

function FunnelSection() {
  return (
    <section className="relative mx-auto max-w-3xl px-6 py-20 md:py-24">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            The IB funnel, honestly
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-[32px] leading-[1.08] tracking-[-0.015em] font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-[56px]">
            <span className="block">The students who win keep showing up.</span>
            <span className="block italic text-[#2E5A88]">Consistency wins.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-[#4A5260] md:text-base">
            IB recruiting starts before referrals and interviews: find the right people, send
            thoughtful emails, get replies, book coffee chats, then earn the next step. Alma
            turns that grind into a repeatable system.
          </p>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2 text-xs font-semibold text-[#1B3B5F]">
          {["Find names", "Send well", "Book chats", "Earn interviews"].map((item) => (
            <span key={item} className="rounded-full border border-[#D9CFB5] bg-white px-3 py-2">
              {item}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function LaunchSeats() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <Reveal>
        <div className="rounded-3xl bg-[#1B3B5F] p-7 text-white md:p-10">
          <div className="grid gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                Early proof
              </p>
              <p className="mt-5 text-[72px] leading-none font-[family-name:var(--font-fraunces)] md:text-[104px]">
                30 → 3
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/78 md:text-base">
                An architecture major with no finance background used Alma for 30 cold emails and
                booked 3 coffee chats with bankers.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">
                50 launch seats
              </p>
              <h2 className="mt-4 max-w-xl text-[34px] leading-[1.05] font-[family-name:var(--font-fraunces)] md:text-[56px]">
                Brown/Rice first. Free for the 2026 cycle.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/80 md:text-base">
                We are opening access carefully because Alma touches your real inbox and real
                recruiting year. Early users get the full product free this cycle and a direct line
                to us while we tune it around real results.
              </p>
              <a
                href="/request-access"
                className="mt-7 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#1B3B5F] transition-colors hover:bg-[#F4EDDB]"
              >
                Request one of 50 seats →
              </a>
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
          Request one of 50 launch seats. We are opening Brown and Rice first, then expanding as fast as we can support students well.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/request-access"
            className="rounded-full bg-[#1B3B5F] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2E5A88]"
          >
            Request a seat →
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
          src="/logo-alma.svg"
          alt="Alma"
          width={180}
          height={60}
          className="h-8 w-auto"
        />
        <div className="flex flex-wrap items-center gap-5">
          <a href="/privacy" className="hover:text-[#1B3B5F]">Privacy</a>
          <a href={INSTAGRAM_URL} className="hover:text-[#1B3B5F]">Instagram</a>
          <a href="mailto:founders@alma.careers" className="hover:text-[#1B3B5F]">Contact</a>
          <a href="/login" className="hover:text-[#1B3B5F]">Sign in</a>
          <span className="text-[#8A8674]">2026 cycle</span>
        </div>
      </div>
    </footer>
  );
}
