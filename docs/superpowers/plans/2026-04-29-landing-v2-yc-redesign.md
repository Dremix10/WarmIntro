# Landing v2 — YC-ready redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the landing-v2 page from 9 sections to 12, replacing text-heavy "tell" sections with visual "show" sections (agent loop in motion, side-by-side AI vs sent draft, trust gradient dial, real product screenshots, founders strip with hackathon proof, flywheel commitment), so a YC partner skimming top-to-bottom understands the product without reading a paragraph — without losing the calm sophomore-first tone.

**Architecture:** Drop in 6 new client components under `src/app/design-lab/landing-v2/_parts/`. Modify the page to swap the section order. No backend changes. No new dependencies. All motion built with CSS, IntersectionObserver, rAF, and the existing `Reveal` primitive. Section 4 (the agent loop) uses a `position: sticky` content block driven by scroll progress — never traps the user, falls back to a one-shot autoplay under `prefers-reduced-motion`.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript strict, Tailwind v4, Fraunces + Geist fonts. No test framework is configured — per-task verification is `npm run build` + visual check in `npm run dev` + reduced-motion fallback check.

**Spec:** `docs/superpowers/specs/2026-04-29-landing-v2-yc-redesign-design.md` (read first if you have not).

**Conventions to follow:**
- Named exports only (no `export default`).
- All components are `"use client"` if they use hooks.
- Color palette: warm stone `#EAE3D2` body, white cards, hairline border `#D9CFB5`, Aegean blue `#1B3B5F` / `#2E5A88`, terracotta `#C86B4F`, ochre `#E8B339`, ink `#14182A`, muted text `#5C6472` / `#4A5260` / `#8A8674`.
- Typography: `font-[family-name:var(--font-fraunces)]` for display + italic mentor voice; default sans-serif elsewhere.
- Existing motion patterns: `Reveal` wrapper for scroll-in fades; `fade-rise` keyframe for hero word-stagger (defined in `src/app/globals.css`).
- Always honor `prefers-reduced-motion: reduce`.

---

## Task 0: Branch + screenshots prep

**Files:**
- Working tree only (no file changes here)
- Will create: `public/landing/today.png`, `public/landing/network.png`, `public/landing/crm.png`

- [ ] **Step 1: Create feature branch**

```bash
cd /Users/gelo/documents/github/warmintro
git status
git checkout -b landing-v2-yc-redesign
```

Expected: `Switched to a new branch 'landing-v2-yc-redesign'`. If `git status` shows uncommitted changes, stop and ask the user before continuing.

- [ ] **Step 2: Create the public/landing/ directory**

```bash
mkdir -p public/landing
ls -la public/landing
```

Expected: empty directory listing.

- [ ] **Step 3: Capture three product screenshots**

This is a manual step. Sign in as a representative seeded user and screenshot:

1. `/today` — the queue with at least 2 drafts visible and the trust dial showing
2. `/network` — the archipelago view with at least 3 islands visible and one in `walls` stage
3. `/crm` — the kanban with stages populated; horizontal layout

Save as PNG, ~1600px wide, retina-2x preferred. Crop to remove browser chrome. Place at:

```
public/landing/today.png
public/landing/network.png
public/landing/crm.png
```

If any of the three pages does not have enough seeded data to look populated, ship a placeholder file of the same name + dimensions (a flat warm-stone rectangle at correct aspect ratio is fine) and flag it to the user — Task 6 will still wire the `<Image>` tag.

- [ ] **Step 4: Verify the files exist**

```bash
ls -la public/landing/
file public/landing/*.png
```

Expected: three PNG files listed, each reported as a PNG image.

- [ ] **Step 5: Commit**

```bash
git add public/landing/
git commit -m "Add product screenshots for landing surfaces section"
```

---

## Task 1: Hero trust strip

**Files:**
- Modify: `src/app/design-lab/landing-v2/page.tsx` (the `Hero` function only)

The Hero gets a single new addition: a horizontal trust strip below the existing CTAs and the "~3 min to set up" hint, sitting on a hairline dashed top border, fading in last in the hero animation cascade. No other Hero changes.

- [ ] **Step 1: Add the trust strip JSX**

In `src/app/design-lab/landing-v2/page.tsx`, locate the `Hero` function. Find the block ending with the "~3 min to set up · free for 2026 cycle" hint:

```tsx
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
```

Immediately after that closing `</div>`, before the journey scene `<div className="mt-12 overflow-hidden rounded-3xl border ..."`, insert:

```tsx
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
```

Also bump the journey-scene fade-in delay from `2000ms` to `2400ms` so the trust strip arrives first:

```tsx
        <div
          className="mt-12 overflow-hidden rounded-3xl border border-[#D9CFB5] bg-white shadow-sm opacity-0"
          style={{ animation: "fade-rise 900ms cubic-bezier(.22,.75,.3,1) 2400ms forwards" }}
        >
          <ScenePreviewTilted />
        </div>
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Open http://localhost:3000 (or the port shown). On the hero:
- Trust strip appears below the "~3 min to set up" hint, after the CTAs animate in
- Two beats: ★ + "Track winner, Y-Claude Builder Club Hackathon at Rice · April 2026", and "Built by 2 Rice · 1 Brown · 1 MIT sophomores"
- Hairline dashed top border above the strip
- Strip fades in last (around 2.2s after page load), journey scene appears after it (~2.4s)
- Mobile layout: items wrap to two lines without overlap

Toggle reduced motion (System Preferences → Accessibility → Display → Reduce motion on macOS, or Chrome devtools rendering pane). Reload. Verify the trust strip is visible immediately (no fade) — `fade-rise` is implemented in `src/app/globals.css` and should already respect this; if not, that's a separate issue.

- [ ] **Step 4: Commit**

```bash
git add src/app/design-lab/landing-v2/page.tsx
git commit -m "Hero: trust strip below CTAs (hackathon + team origins)"
```

---

## Task 2: AgentLoop component (Section 4)

**Files:**
- Create: `src/app/design-lab/landing-v2/_parts/AgentLoop.tsx`

This is the largest single component in the redesign. Scroll-progress-driven sequence, no scroll hijack, full reduced-motion fallback.

- [ ] **Step 1: Create the AgentLoop component**

Create `src/app/design-lab/landing-v2/_parts/AgentLoop.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

type AgentId = "researcher" | "correspondent" | "critic" | "watcher" | "curator";

type Variant = "default" | "draft" | "reject" | "approve";

type Step = {
  agent: AgentId;
  eyebrow: string;
  title: string;
  body: string;
  variant?: Variant;
};

const STEPS: Step[] = [
  {
    agent: "researcher",
    eyebrow: "Researcher · just now",
    title: "Found Maya Chen, VP TMT, Morgan Stanley",
    body: "Brown CS '15 · same-school priority on · warmth 88 · public Q4 2025 software deal · most recent post 2 days ago",
  },
  {
    agent: "correspondent",
    eyebrow: "Correspondent · drafting",
    title: "Draft v1",
    body: "Hi Maya, I hope this email finds you well. I'm a sophomore at Brown studying CS, passionate about finance and excited about the intersection of technology and capital markets. I'd love to learn more about your journey at Morgan Stanley TMT.",
    variant: "draft",
  },
  {
    agent: "critic",
    eyebrow: "Critic · reviewing v1",
    title: "Rejected — too generic",
    body: "Voice: too formal. Specificity: missing the recent deal reference. Try again.",
    variant: "reject",
  },
  {
    agent: "correspondent",
    eyebrow: "Correspondent · revised",
    title: "Draft v2",
    body: "Hi Maya, I'm a Brown CS sophomore looking at TMT and saw your team led the Q4 software deal. I'm trying to learn how a banker actually thinks about a deal like that. Free for 15 minutes next week?",
    variant: "draft",
  },
  {
    agent: "critic",
    eyebrow: "Critic · reviewing v2",
    title: "Approved",
    body: "Voice ✓ · Specificity ✓ · Arc ✓ · Ask ✓. Ready to send.",
    variant: "approve",
  },
  {
    agent: "watcher",
    eyebrow: "Watcher · 2 days later",
    title: "Reply received",
    body: "Maya: \"Tuesday 4pm work for you?\" → Stage advanced to Coffee.",
  },
  {
    agent: "curator",
    eyebrow: "Curator · background",
    title: "Updated Maya's profile + recent_deal signal",
    body: "Tomorrow's queue is sharper, for everyone using Alma.",
  },
];

const AGENTS: { id: AgentId; label: string }[] = [
  { id: "researcher", label: "Researcher" },
  { id: "correspondent", label: "Correspondent" },
  { id: "critic", label: "Critic" },
  { id: "watcher", label: "Watcher" },
  { id: "curator", label: "Curator" },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function AgentLoop() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  // Reduced-motion fallback: one-shot autoplay through the steps when section enters viewport.
  useEffect(() => {
    if (!reducedMotion) return;
    const sec = sectionRef.current;
    if (!sec) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          STEPS.forEach((_, i) => {
            window.setTimeout(() => setActiveIndex(i), i * 350);
          });
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(sec);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // Scroll-progress driven (default).
  useEffect(() => {
    if (reducedMotion) return;
    let rafId = 0;
    const update = () => {
      rafId = 0;
      const sec = sectionRef.current;
      if (!sec) return;
      const rect = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      // Pinned-scroll range: from when section top hits viewport top
      // to when section bottom is one viewport above viewport top.
      const pinTop = -rect.top; // 0 when section just hit top
      const pinRange = rect.height - vh; // total scroll distance available within the pinned section
      const raw = pinRange > 0 ? pinTop / pinRange : 0;
      const progress = Math.max(0, Math.min(1, raw));
      const idx = Math.min(
        STEPS.length - 1,
        Math.max(0, Math.floor(progress * STEPS.length))
      );
      setActiveIndex(idx);
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [reducedMotion]);

  const step = STEPS[activeIndex];
  const completed = new Set<AgentId>();
  for (let i = 0; i < activeIndex; i++) completed.add(STEPS[i].agent);

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ minHeight: "200vh" }}
      aria-label="The agent loop, one banker through the pipeline"
    >
      <div className="sticky top-20 mx-auto max-w-5xl px-6 py-12">
        <div className="mb-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            One banker, six agents
          </p>
          <h2 className="mt-3 text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
            The loop, in motion.
          </h2>
        </div>

        {/* Agent badges row */}
        <div className="mt-10 flex flex-wrap items-center gap-2">
          {AGENTS.map((a, i) => {
            const isActive = a.id === step.agent;
            const isDone = completed.has(a.id);
            return (
              <span key={a.id} className="contents">
                <span
                  className={
                    "rounded-md px-3 py-2 text-xs font-semibold transition-colors duration-300 " +
                    (isActive
                      ? "bg-[#1B3B5F] text-white"
                      : isDone
                      ? "bg-[#1B3B5F]/15 text-[#1B3B5F] border border-[#1B3B5F]/25"
                      : "border border-[#D9CFB5] bg-white text-[#5C6472]")
                  }
                >
                  {a.label}
                </span>
                {i < AGENTS.length - 1 && (
                  <span className="hidden h-px flex-1 bg-[#D9CFB5] sm:block" aria-hidden />
                )}
              </span>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-[3px] overflow-hidden rounded-sm bg-[#D9CFB5]">
          <div
            className="h-full bg-[#1B3B5F] transition-[width] duration-300"
            style={{ width: `${((activeIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content card */}
        <div className="mt-6 min-h-[220px] rounded-2xl border border-[#D9CFB5] bg-white p-6 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#2E5A88]">
            {step.eyebrow}
          </div>
          <div className="mt-2 text-xl text-[#14182A] font-[family-name:var(--font-fraunces)]">
            {step.title}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#4A5260]">{step.body}</p>
          {step.variant === "reject" && (
            <div className="mt-4 inline-flex items-center gap-2 rounded bg-[#FEE2E2] px-2 py-1 text-xs font-semibold text-[#991B1B]">
              ✗ Reject · revise required
            </div>
          )}
          {step.variant === "approve" && (
            <div className="mt-4 inline-flex items-center gap-2 rounded bg-[#D1FAE5] px-2 py-1 text-xs font-semibold text-[#065F46]">
              ✓ Approved · ready to send
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-[#8A8674]">
          Planner orchestrates this loop deterministically every fifteen minutes. Curator runs in the background, keeping the banker graph fresh.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: build succeeds, no TypeScript errors.

- [ ] **Step 3: Test in isolation**

Wire it temporarily for visual verification by editing `src/app/design-lab/landing-v2/page.tsx`. Find the call to `<HowSection />` and add `<AgentLoop />` and a `Divider` immediately above it:

```tsx
import { AgentLoop } from "./_parts/AgentLoop";
// ... existing imports

// inside the page:
      <Divider />
      <AgentLoop />
      <Divider />
      <HowSection />
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Scroll into the section. Verify:
- Header stays visible at the top of the section as you scroll through (sticky)
- Five agent badges in a row (Researcher → Correspondent → Critic → Watcher → Curator) — first lit in Aegean blue, rest greyed
- As you scroll down through the section, the active badge advances and previously-active badges show in a darker/filled state (completed)
- Progress bar fills left to right
- Content card cross-fades through 7 states: Researcher / Correspondent v1 / Critic reject / Correspondent v2 / Critic approve / Watcher reply / Curator update
- "Reject" state shows the red pill, "Approve" state shows the green pill
- Section is roughly 2 viewport heights tall — natural scroll passes through the loop in ~3-4 seconds
- Page never hijacks scroll — you can always continue scrolling past

Toggle reduced motion in system settings and reload. Verify:
- Section is normal block layout, content card auto-advances through all 7 states once when scrolled into view (350ms per step)
- No scroll-driven behavior

Mobile (resize to 375px wide): badges wrap to multiple rows, no horizontal scroll, card readable.

- [ ] **Step 5: Remove the temporary wiring**

Revert the temporary `<AgentLoop />` insertion in `page.tsx` (we will wire it permanently in Task 8). Leave the `import { AgentLoop }` line in if you want — it will be removed by linter or we'll re-add it cleanly.

```bash
git diff src/app/design-lab/landing-v2/page.tsx
```

If you see only the import + the temporary placement and no other Hero changes, revert with:

```bash
git checkout -- src/app/design-lab/landing-v2/page.tsx
```

Hero changes from Task 1 are already committed, so checkout is safe.

- [ ] **Step 6: Commit**

```bash
git add src/app/design-lab/landing-v2/_parts/AgentLoop.tsx
git commit -m "AgentLoop: scroll-progress sequence through one banker's full pipeline"
```

---

## Task 3: NoAITells component (Section 6)

**Files:**
- Create: `src/app/design-lab/landing-v2/_parts/NoAITells.tsx`

Side-by-side draft-vs-sent layout. No scroll-locked behavior, just two-step fade-in via existing `Reveal`.

- [ ] **Step 1: Create the component**

Create `src/app/design-lab/landing-v2/_parts/NoAITells.tsx`:

```tsx
import { Reveal } from "@/components/Reveal";

const AI_DRAFT = `Hi Maya,

I hope this email finds you well. I'm a sophomore at Brown studying CS, passionate about finance and excited about the intersection of technology and capital markets. I'd love to learn more about your journey at Morgan Stanley TMT and would deeply appreciate 15 minutes of your time for a virtual coffee.

Best,
Sarah`;

const SENT = `Hi Maya,

I'm a Brown CS sophomore looking at TMT and saw your team led the Q4 software deal — the structure was wild. I'm trying to learn how a banker actually thinks about a deal like that. Free for 15 minutes next week?

Sarah`;

export function NoAITells() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            No AI tells
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
            What Alma writes vs what you send.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[#4A5260] md:text-base">
            Critic rejects generic drafts. You make it yours in two edits. The recruiter sees one email — yours.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-2xl border border-dashed border-[#C9BFA5] bg-[#F9F5EB] p-5 text-[#8A8674]">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em]">Original AI draft</p>
            <pre className="mt-3 whitespace-pre-wrap font-[family-name:var(--font-fraunces)] text-sm leading-relaxed">
              {AI_DRAFT}
            </pre>
          </div>
        </Reveal>
        <Reveal delay={200}>
          <div className="h-full rounded-2xl border border-[#2E5A88] bg-white p-5 text-[#14182A] shadow-[0_0_0_4px_rgba(46,90,136,.08)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#2E5A88]">What Sarah sent</p>
            <pre className="mt-3 whitespace-pre-wrap font-[family-name:var(--font-fraunces)] text-sm leading-relaxed">
              {SENT}
            </pre>
          </div>
        </Reveal>
      </div>

      <Reveal delay={300}>
        <p className="mx-auto mt-8 max-w-md text-center text-xs text-[#5C6472]">
          The original draft is what Alma's Correspondent produced. The version on the right is what the student sent — same person, same email, two minutes of editing. Backed by the <code className="text-[#1B3B5F]">drafts_pre_edit_ai_body</code> column.
        </p>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: succeeds.

- [ ] **Step 3: Test in browser**

Temporarily add to `page.tsx`:

```tsx
import { NoAITells } from "./_parts/NoAITells";
// ...
      <Divider />
      <NoAITells />
```

Run `npm run dev`, scroll to the section. Verify:
- Two cards side by side on desktop
- Left: greyed dashed border, italic-y warm-stone background, full draft text
- Right: white with Aegean border + outer ring, sent version (much shorter, more specific)
- Left fades in first, right ~200ms after (existing Reveal pattern)
- Mobile: cards stack vertically, both readable

Revert the temp wiring:

```bash
git checkout -- src/app/design-lab/landing-v2/page.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/app/design-lab/landing-v2/_parts/NoAITells.tsx
git commit -m "NoAITells: side-by-side AI draft vs student-sent email"
```

---

## Task 4: TrustGradient component (Section 7)

**Files:**
- Create: `src/app/design-lab/landing-v2/_parts/TrustGradient.tsx`

A 3-position dial that auto-plays through positions on scroll-in, settles on Copilot, and lets the user click to swap modes after.

- [ ] **Step 1: Create the component**

Create `src/app/design-lab/landing-v2/_parts/TrustGradient.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "copilot" | "preview" | "auto";

const MODES: { id: Mode; label: string; subtitle: string; description: string }[] = [
  {
    id: "copilot",
    label: "Copilot",
    subtitle: "drafts only · you copy & send",
    description:
      "Alma drafts every email and shows it to you. You copy, edit, send from Gmail. Nothing leaves your inbox without you. Most students start here for the first two weeks.",
  },
  {
    id: "preview",
    label: "Preview-veto",
    subtitle: "15-min window · skip if you want",
    description:
      "Each draft sits in a 15-minute window. Tap 'skip' to kill it. Otherwise it sends from Gmail at the time you set.",
  },
  {
    id: "auto",
    label: "Autopilot",
    subtitle: "sends + Sunday digest",
    description:
      "Alma sends. You read a Sunday digest. One tap returns to Preview-veto.",
  },
];

export function TrustGradient() {
  const sectionRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<Mode>("copilot");
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);

  useEffect(() => {
    const sec = sectionRef.current;
    if (!sec || hasAutoPlayed) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setHasAutoPlayed(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAutoPlayed) {
          setHasAutoPlayed(true);
          // Sequence: copilot → preview → auto → settle on copilot
          window.setTimeout(() => setMode("preview"), 350);
          window.setTimeout(() => setMode("auto"), 700);
          window.setTimeout(() => setMode("copilot"), 1100);
          observer.disconnect();
        }
      },
      { threshold: 0.45 }
    );
    observer.observe(sec);
    return () => observer.disconnect();
  }, [hasAutoPlayed]);

  const activeIdx = MODES.findIndex((m) => m.id === mode);
  const current = MODES[activeIdx];

  return (
    <section ref={sectionRef} className="mx-auto max-w-3xl px-6 py-20" aria-label="Trust gradient">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
          You stay in control
        </p>
        <h2 className="mt-3 text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
          Three trust levels. You pick. You change anytime.
        </h2>
      </div>

      <div
        className="relative mx-auto mt-10 flex items-center rounded-full border border-[#D9CFB5] bg-white p-2"
        role="radiogroup"
        aria-label="Trust gradient mode"
      >
        <span
          className="absolute top-2 bottom-2 rounded-full bg-[#1B3B5F] transition-[left] duration-500 ease-out"
          aria-hidden
          style={{
            left: `calc(${(activeIdx / 3) * 100}% + 0.5rem)`,
            width: "calc(33.3333% - 0.6667rem)",
          }}
        />
        {MODES.map((m) => {
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(m.id)}
              className={
                "relative z-10 flex-1 rounded-full px-4 py-3 text-center text-sm font-semibold transition-colors duration-300 " +
                (active ? "text-white" : "text-[#5C6472] hover:text-[#1B3B5F]")
              }
            >
              <div>{m.label}</div>
              <div className={"mt-1 text-[10px] font-normal " + (active ? "text-white/80" : "text-[#8A8674]")}>
                {m.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-[#D9CFB5] bg-white p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#2E5A88]">
          Right now: {current.label}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#4A5260]">{current.description}</p>
      </div>

      <p className="mt-4 text-center text-xs text-[#8A8674]">
        Auto-graduates as you approve drafts. Always one tap to step back.
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Test in browser**

Temporarily wire into `page.tsx`:

```tsx
import { TrustGradient } from "./_parts/TrustGradient";
// ...
      <Divider />
      <TrustGradient />
```

Verify:
- Three-segment pill with active segment highlighted (Aegean blue fill, white text)
- On scroll into view, the highlight slides Copilot → Preview-veto → Autopilot → settles on Copilot (~1.1s total)
- Click any segment to swap; highlight slides smoothly
- Explainer card below updates to the chosen mode's description
- Reduced-motion: settles on Copilot immediately, no auto-sequence; click still works
- Mobile: pill remains horizontal, segments stay readable; subtitles may wrap

Revert temp wiring.

- [ ] **Step 4: Commit**

```bash
git add src/app/design-lab/landing-v2/_parts/TrustGradient.tsx
git commit -m "TrustGradient: three-position dial, auto-plays on scroll-in"
```

---

## Task 5: SurfacesStack component (Section 8)

**Files:**
- Create: `src/app/design-lab/landing-v2/_parts/SurfacesStack.tsx`

Three stacked rows alternating image-left / image-right with subtle parallax on the screenshot column.

- [ ] **Step 1: Create the component**

Create `src/app/design-lab/landing-v2/_parts/SurfacesStack.tsx`:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/Reveal";

type Surface = {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  src: string;
  alt: string;
  imageRight: boolean;
};

const SURFACES: Surface[] = [
  {
    href: "/today",
    eyebrow: "Your queue",
    title: "Today's outreach, lined up.",
    body: "Drafts ready for review. Trust dial: Copilot, Preview-veto, Autopilot. You decide.",
    src: "/landing/today.png",
    alt: "Today's outreach queue with drafts and trust dial",
    imageRight: true,
  },
  {
    href: "/network",
    eyebrow: "Archipelago",
    title: "Your network, as a place.",
    body: "Every bank is an island. Every intro builds more of a home on it.",
    src: "/landing/network.png",
    alt: "Network archipelago with bank islands at different construction stages",
    imageRight: false,
  },
  {
    href: "/crm",
    eyebrow: "Pipeline",
    title: "Every banker, every stage.",
    body: "Draft → sent → replied → coffee → referral → first round → superday → offer.",
    src: "/landing/crm.png",
    alt: "CRM kanban with bankers across pipeline stages",
    imageRight: true,
  },
];

function ParallaxImage({ src, alt }: { src: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let rafId = 0;
    const update = () => {
      rafId = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // -1 when card is below fold, 0 when centered, +1 when above fold.
      const ratio = (rect.top + rect.height / 2 - vh / 2) / vh;
      const clamped = Math.max(-1, Math.min(1, ratio));
      setOffset(clamped * 20); // 20px max travel
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-[#ECE7DE] bg-[#F4EDDB]"
    >
      <div
        className="absolute inset-0"
        style={{ transform: `translate3d(0, ${offset}px, 0)`, willChange: "transform" }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}

export function SurfacesStack() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <Reveal>
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            Your week in Alma
          </p>
          <h2 className="mt-3 text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
            Three surfaces. Zero spreadsheet.
          </h2>
        </div>
      </Reveal>

      <div className="mt-10 flex flex-col gap-5">
        {SURFACES.map((s, i) => (
          <Reveal key={s.href} delay={i * 80}>
            <Link
              href={s.href}
              className="group block rounded-2xl border border-[#D9CFB5] bg-white p-5 transition-colors hover:border-[#2E5A88] md:p-6"
            >
              <div className={"grid grid-cols-1 gap-5 md:grid-cols-2 md:items-center md:gap-8 " + (s.imageRight ? "" : "md:[&>*:first-child]:order-2")}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5C6472]">
                    {s.eyebrow}
                  </p>
                  <h3 className="mt-2 text-2xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A]">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A5260]">{s.body}</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#1B3B5F] group-hover:underline">
                    Take a look <span aria-hidden>→</span>
                  </p>
                </div>
                <ParallaxImage src={s.src} alt={s.alt} />
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Test in browser**

Temp-wire into `page.tsx`:

```tsx
import { SurfacesStack } from "./_parts/SurfacesStack";
// ...
      <Divider />
      <SurfacesStack />
```

Verify:
- Three rows: row 1 image-right, row 2 image-left, row 3 image-right
- Each screenshot loads from `/landing/today.png`, `/landing/network.png`, `/landing/crm.png`
- As you scroll past, screenshots translate vertically a few pixels (parallax) — subtle, not jarring
- Hover: card border deepens to Aegean blue
- Click: navigates to the linked surface
- Mobile: rows collapse to single column, image first, text below
- Reduced motion: parallax disabled, screenshots static

Revert temp wiring.

- [ ] **Step 4: Commit**

```bash
git add src/app/design-lab/landing-v2/_parts/SurfacesStack.tsx
git commit -m "SurfacesStack: three product surfaces with parallax screenshots"
```

---

## Task 6: FlywheelTile component (Section 9)

**Files:**
- Create: `src/app/design-lab/landing-v2/_parts/FlywheelTile.tsx`

Honest empty-state release card. Soft pulse on the empty slots.

- [ ] **Step 1: Create the component**

Create `src/app/design-lab/landing-v2/_parts/FlywheelTile.tsx`:

```tsx
import { Reveal } from "@/components/Reveal";

export function FlywheelTile() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <Reveal>
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
            The flywheel
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
            Every Sunday, Alma learns something.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[#4A5260] md:text-base">
            Each send writes a signal. Each Sunday at 11pm UTC, a batch updates the banker scoring weights and the Critic's rubric. Then Alma is sharper for everyone.
          </p>
        </div>
      </Reveal>

      <Reveal delay={150}>
        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-[#D9CFB5] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#2E5A88]">
                Release · pending
              </p>
              <p className="mt-1 text-lg font-[family-name:var(--font-fraunces)] text-[#14182A]">
                First release publishes Sun May 3, 11pm UTC
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-[#FCD34D] bg-[#FEF3C7] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#92400E]">
              Upcoming
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="alma-flywheel-slot rounded-lg border border-dashed border-[#C9BFA5] bg-[#F9F5EB] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A8674]">
                Banker scoring weights
              </p>
              <p className="mt-2 text-xs text-[#5C6472]">
                Updated based on which warmth signals correlate with replies. (Empty until first release.)
              </p>
            </div>
            <div className="alma-flywheel-slot rounded-lg border border-dashed border-[#C9BFA5] bg-[#F9F5EB] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8A8674]">
                Critic calibration
              </p>
              <p className="mt-2 text-xs text-[#5C6472]">
                Rubric updates from drafts that scored high but got no reply. (Empty until first release.)
              </p>
            </div>
          </div>
          <p className="mt-4 border-t border-[#ECE7DE] pt-4 text-xs text-[#5C6472]">
            Public release notes will name what changed and why — like a software release, but for the network's intuition.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 2: Add the soft-pulse keyframe**

Add to the bottom of `src/app/globals.css`:

```css
@keyframes alma-soft-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139, 134, 116, 0); }
  50%      { box-shadow: 0 0 0 6px rgba(139, 134, 116, 0.06); }
}

.alma-flywheel-slot {
  animation: alma-soft-pulse 3.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .alma-flywheel-slot { animation: none; }
}
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

- [ ] **Step 4: Test in browser**

Temp-wire into `page.tsx` and verify:
- Header text + body
- White card with "Release · pending" eyebrow + "First release publishes Sun May 3, 11pm UTC" title + ochre "UPCOMING" pill
- Two empty-state slots (dashed border, warm-stone background) softly pulse
- Footer text about public release notes
- Reduced motion: pulse stops

Revert temp wiring.

- [ ] **Step 5: Commit**

```bash
git add src/app/design-lab/landing-v2/_parts/FlywheelTile.tsx src/app/globals.css
git commit -m "FlywheelTile: empty-state release card with soft-pulse slots"
```

---

## Task 7: FoundersStrip component (Section 10)

**Files:**
- Create: `src/app/design-lab/landing-v2/_parts/FoundersStrip.tsx`

Four monogram tiles + hackathon callout.

- [ ] **Step 1: Create the component**

Create `src/app/design-lab/landing-v2/_parts/FoundersStrip.tsx`:

```tsx
import { Reveal } from "@/components/Reveal";

const TILES = [
  { mono: "R", school: "Rice", color: "#1B3B5F" },
  { mono: "R", school: "Rice", color: "#1B3B5F" },
  { mono: "B", school: "Brown", color: "#7B1F2C" },
  { mono: "M", school: "MIT", color: "#8A8674" },
];

export function FoundersStrip() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 text-center">
      <Reveal>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#5C6472]">
          Who built this
        </p>
        <h2 className="mx-auto mt-3 max-w-xl text-3xl leading-tight font-[family-name:var(--font-fraunces)] text-[#14182A] md:text-4xl">
          <em className="text-[#2E5A88]">We&rsquo;re sophomores too.</em>
          <br />
          We built Alma for our cycle.
        </h2>
      </Reveal>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        {TILES.map((t, i) => (
          <Reveal key={i} delay={i * 80}>
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-[family-name:var(--font-fraunces)] text-white"
                style={{ backgroundColor: t.color }}
                aria-label={`Founder from ${t.school}`}
              >
                {t.mono}
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#5C6472]">
                {t.school}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={4 * 80 + 80}>
        <div className="mx-auto mt-10 flex max-w-xl items-center gap-4 rounded-2xl border border-[#D9CFB5] bg-white p-5 text-left">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#FCD34D] bg-[#FEF3C7] text-base font-bold text-[#92400E]"
            aria-hidden
          >
            ★
          </span>
          <div>
            <p className="text-sm font-semibold text-[#14182A]">
              Track winner — Y-Claude Builder Club Hackathon at Rice
            </p>
            <p className="mt-1 text-xs text-[#5C6472]">
              April 2026 · 6,047 lines of TypeScript shipped in 4 hours, zero merge conflicts
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Test in browser**

Temp-wire and verify:
- Header eyebrow + Fraunces title with italic "We're sophomores too."
- Four monogram tiles in a row: R (Aegean blue), R (Aegean blue), B (Brown red), M (muted neutral). Each with "Rice"/"Brown"/"MIT" caption below
- Tiles fade in left-to-right with stagger
- Hackathon callout below: ★ badge, "Track winner — Y-Claude Builder Club Hackathon at Rice", April 2026 + LoC sub
- Mobile: tiles wrap (still horizontal where possible)

Revert temp wiring.

- [ ] **Step 4: Commit**

```bash
git add src/app/design-lab/landing-v2/_parts/FoundersStrip.tsx
git commit -m "FoundersStrip: 4 monogram tiles + hackathon callout"
```

---

## Task 8: Wire all sections into page.tsx + trim FAQ

**Files:**
- Modify: `src/app/design-lab/landing-v2/page.tsx`

Final page edit. New section order, FAQ trimmed to 6, `HowSection` and `GlimpseSection` removed (as they're replaced by AgentLoop and SurfacesStack respectively).

- [ ] **Step 1: Update imports**

At the top of `src/app/design-lab/landing-v2/page.tsx`, add the new imports beneath the existing ones:

```tsx
import { AgentLoop } from "./_parts/AgentLoop";
import { NoAITells } from "./_parts/NoAITells";
import { TrustGradient } from "./_parts/TrustGradient";
import { SurfacesStack } from "./_parts/SurfacesStack";
import { FlywheelTile } from "./_parts/FlywheelTile";
import { FoundersStrip } from "./_parts/FoundersStrip";
```

- [ ] **Step 2: Replace the page body section list**

Find the `LandingV2` function. Replace its return value with:

```tsx
export default function LandingV2() {
  return (
    <div className="relative bg-[#EAE3D2] text-[#14182A]">
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
```

- [ ] **Step 3: Delete the obsolete `STEPS` constant + `HowSection` function + `PREVIEWS` constant + `GlimpseSection` function**

Find and delete:
- The `STEPS` const (used only by `HowSection`)
- The `HowSection` function
- The `PREVIEWS` const (used only by `GlimpseSection`)
- The `GlimpseSection` function

These are entirely replaced by `AgentLoop` and `SurfacesStack`.

- [ ] **Step 4: Trim the FAQ array**

Find the `FAQ` const and remove these two entries:

```tsx
  {
    q: "Does Alma send emails for me?",
    a: "...",
  },
  {
    q: "Will recruiters see I used AI?",
    a: "...",
  },
```

The FAQ should now have 6 entries in this order: jobs board, why Gmail, what does it cost, finance major, which banks, private beta.

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: build succeeds, no unused-import or unused-variable errors. If TypeScript flags an unused `Link` import that was previously only used by `GlimpseSection`, remove the unused import (Link may or may not still be used; check the diff).

```bash
npm run lint
```

Fix any lint complaints inline.

- [ ] **Step 6: Verify in browser end-to-end**

```bash
npm run dev
```

Scroll through the entire landing top to bottom. Verify section order:

1. TopBar
2. Hero (with trust strip)
3. Logo marquee
4. Agent loop (with sticky scroll-progress sequence)
5. Funnel math
6. No AI tells (side-by-side)
7. Trust gradient (dial)
8. Three surfaces (stacked rows with screenshots)
9. Flywheel tile
10. Founders strip
11. FAQ (6 items only)
12. Closing CTA + Footer

Then scroll *up* the whole page — verify nothing is broken on reverse scroll (the scroll listeners should work in both directions for AgentLoop and SurfacesStack).

Toggle reduced motion. Verify:
- AgentLoop auto-advances through steps once on viewport entry, no scroll-driving
- TrustGradient settles on Copilot, no auto-sequence
- SurfacesStack screenshots are static (no parallax)
- FlywheelTile slots do not pulse

- [ ] **Step 7: Commit**

```bash
git add src/app/design-lab/landing-v2/page.tsx
git commit -m "Landing v2: wire 12-section order, trim FAQ to 6"
```

---

## Task 9: Polish + Lighthouse spot-check

**Files:**
- (any small fixes that surface during verification)

- [ ] **Step 1: Run a production build and serve it**

```bash
npm run build
npm run start
```

Open `http://localhost:3000` (or whichever port). The production build serves optimized images and the real CSS bundle.

- [ ] **Step 2: Lighthouse spot-check (Chrome devtools)**

Open Chrome DevTools → Lighthouse tab. Run a desktop performance audit on `/`. Target:
- Performance: ≥ 90
- Accessibility: ≥ 95
- Best Practices: ≥ 95
- SEO: ≥ 95

If Performance falls below 90, the most likely culprits are:
- Screenshots in `public/landing/` are too large. Run `file public/landing/*.png` to check sizes; resize down if any single PNG is >300KB.
- `AgentLoop` re-renders too frequently. Check React DevTools Profiler. If the section re-renders on every scroll event, ensure `setActiveIndex` is only called when `idx` actually changes — wrap with `setActiveIndex((prev) => (prev === idx ? prev : idx))` if needed.

- [ ] **Step 3: Mobile sanity check**

Resize the browser to 375px wide (iPhone SE width). Scroll through the entire landing. Verify:
- All section copy readable
- AgentLoop's agent badges wrap to multiple rows; horizontal connector lines hidden
- TrustGradient pill remains horizontal; subtitles can wrap
- SurfacesStack rows stack vertically (image first, text below)
- FoundersStrip tiles wrap if needed
- No horizontal overflow

- [ ] **Step 4: Cross-browser quick check**

Open the page in Safari (if on macOS) and Firefox. Verify:
- `position: sticky` on AgentLoop works (Safari sometimes glitches with `min-height` parents)
- Scroll-progress driving feels the same
- Image rendering is correct

If any browser shows broken behavior, file as a follow-up — do not block the merge.

- [ ] **Step 5: Commit any polish fixes**

```bash
git status
# If you made any small fixes:
git add -p
git commit -m "Landing v2: polish from end-to-end verification"
```

---

## Task 10: Push branch + open PR

**Files:**
- (no file changes, branch operations only)

- [ ] **Step 1: Confirm clean working tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean` on branch `landing-v2-yc-redesign`.

- [ ] **Step 2: Push branch**

```bash
git push -u origin landing-v2-yc-redesign
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "Landing v2: YC-ready redesign (12 sections, 3 new, 4 upgraded)" --body "$(cat <<'EOF'
## Summary
- 12-section order: 3 new (AgentLoop, FlywheelTile, FoundersStrip), 4 upgraded (Hero trust strip, NoAITells, TrustGradient, SurfacesStack), 5 unchanged
- Show-don't-tell — text-heavy "How" + "Glimpse" sections replaced by visual scroll-progress + screenshot sections
- Honest framing — no fabricated user counts, empty-state Flywheel slot
- One scroll-progress sequence (AgentLoop), all other motion is calm reveals; full `prefers-reduced-motion` fallbacks

Spec: `docs/superpowers/specs/2026-04-29-landing-v2-yc-redesign-design.md`
Plan: `docs/superpowers/plans/2026-04-29-landing-v2-yc-redesign.md`

## Test plan
- [ ] Build passes (`npm run build`)
- [ ] Lighthouse desktop performance ≥ 90
- [ ] Reduced-motion fallback verified for AgentLoop, TrustGradient, SurfacesStack, FlywheelTile
- [ ] Mobile (375px) — no horizontal overflow, all sections readable
- [ ] Three product screenshots render at `public/landing/*.png`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Capture the returned PR URL and share with the user.

- [ ] **Step 4: Done**

The user can self-merge after their own review, or hand the PR to the cofounders. The plan does not auto-merge.

---

## Self-review checklist (run before handing this plan off)

- Hero trust strip (spec §02) → Task 1 ✓
- AgentLoop (spec §04) → Task 2 ✓
- NoAITells (spec §06) → Task 3 ✓
- TrustGradient (spec §07) → Task 4 ✓
- SurfacesStack (spec §08) → Task 5 ✓
- FlywheelTile (spec §09) → Task 6 ✓
- FoundersStrip (spec §10) → Task 7 ✓
- FAQ trim (spec §11) → Task 8 step 4 ✓
- Closing CTA + Footer (spec §12) — unchanged, no task needed ✓
- Footer "built at Brown & Rice" copy — deferred decision, not in scope here ✓
- Three product screenshots (spec asset inventory) → Task 0 step 3 ✓
- Reduced-motion fallback (spec motion budget) → verified per task ✓
- Lighthouse target (spec success criteria) → Task 9 ✓
