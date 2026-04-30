# Landing v2 — YC-ready redesign

**Date:** 2026-04-29
**Author:** Brainstorm session (gelo + Claude)
**Status:** Design — pending implementation plan

## Why this exists

YC application submission is 2026-04-30. The current landing (`src/app/design-lab/landing-v2/page.tsx`, re-exported by `src/app/page.tsx`) reads as a calm student-facing site but does not visibly demonstrate what's special about Alma — six agents, a trust gradient, a data flywheel, a real hackathon win, a Brown + Rice + MIT team. Most of the product's strongest signals are buried in FAQ text or absent.

This redesign keeps the calm Aegean tone (the audience is still sophomores at Brown and Rice) but raises the execution to a level a YC partner would scan and click "interview" on. The principle is **show, don't tell**: every section that *describes* the product becomes a section that *demonstrates* it.

## Constraints

- **Single landing page**, no segmented tracks. Sophomore is the primary audience; YC partner is the secondary audience served by the same page.
- **Zero fabrication.** No fake user counts, no invented banker counts, no fake reply rates. Real architecture facts (6 agents, ~2,000 LoC, real hackathon) and honest empty states are fine.
- **No founder names.** Schools and counts only.
- **Ships before YC submission.** Implementation must fit in roughly one focused day.
- **No new dependencies.** All motion built with existing primitives (Tailwind, CSS, rAF, IntersectionObserver, the existing `Reveal` / `GradientOrb` / `GrainOverlay` / `LogoMarquee` / `JourneyScene` components).
- **Mobile must work** but desktop is the priority for the YC reviewer experience.

## Audience and tone

- Primary: rising sophomore at Brown or Rice, looking at SA2028 IB recruiting, browsing on laptop or phone, mildly suspicious of AI tools, paralyzed about cold outreach.
- Secondary: YC partner skimming top-to-bottom in 60 seconds, looking for: who built this, what's built, who uses it, what's defensible.
- Tone: calm, mentor-like, professional × personal. Mentor quotes still in italic Fraunces. No exclamation points. No founder hype.
- Voice constraints from existing guardrails (`src/services/guardrails.ts`): no em-dashes in body copy where avoidable, no consultant-speak, no generic praise.

## Section order

The new landing has **12 sections** (from 9). Three new, four upgraded, five unchanged.

```
01  TopBar                       (unchanged)
02  Hero                         (upgraded — trust strip below CTAs)
03  Bank logo marquee            (unchanged)
04  Agent loop, in motion        (NEW — the big show-don't-tell moment)
05  Funnel math                  (unchanged)
06  Doesn't sound like AI        (upgraded — side-by-side draft vs sent)
07  Trust gradient               (upgraded — promoted from FAQ to a dial)
08  Three surfaces               (upgraded — text cards → stacked rows w/ screenshots)
09  Flywheel tile                (NEW — empty-state release card)
10  Founders strip               (NEW — monogram tiles + hackathon callout)
11  FAQ                          (trimmed 8→6)
12  Closing CTA + Footer         (unchanged)
```

## Per-section design

### 01. TopBar — unchanged

`alma` wordmark · How · FAQ · `AuthAwareLogin`. Sticky, backdrop-blur, hairline border bottom. No changes.

### 02. Hero — upgraded

**Copy (unchanged top):**
- Eyebrow: "Investment banking · for Brown & Rice students · 2026 cycle"
- Headline (`AnimatedHeadline`): "The warm-intro engine for Brown & Rice students."
- Body: "Alma reads your resume, finds alumni at every bank and coverage group, drafts the call requests you'd actually send, and tracks you through superday. One hour a week is enough."
- CTAs: "Upload your resume →" + "See how it works"
- "~3 min to set up · free for 2026 cycle" hint

**New addition: trust strip below CTAs** (above journey scene)

A single horizontal row, sitting on a hairline dashed top border, two beats:

1. ★ icon + "**Track winner**, Y-Claude Builder Club Hackathon at Rice · April 2026"
2. "Built by **2 Rice · 1 Brown · 1 MIT** sophomores"

Trust strip fades in *last* in the hero animation sequence (after CTAs, ~2200ms in).

**Motion:** existing `fade-rise` cascade; trust strip is one new keyframe at the end. `ScenePreviewTilted` (the journey scene) animation unchanged.

**Why this proves something:** Verifiable hackathon at one of the founder schools, multi-school team — addresses "who is this team" silently before any partner asks.

### 03. Bank logo marquee — unchanged

`LogoMarquee`, 90s slow horizontal scroll, 7 BB logos. No changes.

### 04. Agent loop, in motion — NEW

**The hero of the YC pitch.** A single scroll-locked scene that runs one banker (Maya Chen, VP TMT, Morgan Stanley) through the entire pipeline as the user scrolls into the section.

**Layout:** horizontal pipeline at top, content card below.

```
[Researcher] ──── [Correspondent] ──── [Critic] ──── [Watcher] ──── [Curator]
═══════════ progress bar ═══════════════════════════════════════════════════
                       (one card, morphs through 7 states)
```

Five agent badges sit in a row at the top with thin connectors between them. (`Planner` is deterministic and orchestrates the others; mentioned in the section caption only, no badge.) A progress bar runs across the row, filling left-to-right as the loop advances. Each agent badge is greyed by default and lights up to Aegean blue (`#1B3B5F`) when its step is active, then settles into "completed" state (filled but darker).

**The 7 states the content card morphs through:**

1. **Researcher** — "Found Maya Chen, VP TMT, Morgan Stanley." Brown CS '15, same-school priority on, warmth 88, public Q4 2025 software deal, recent post 2 days ago.
2. **Correspondent v1** — Email draft #1: a generic, well-formed but obviously AI-toned cold email.
3. **Critic** — Inline reject card: "Voice: too formal. Specificity: missing recent deal reference. Try again."
4. **Correspondent v2** — Email draft #2: tighter, references the Q4 software deal, asks for 15 minutes.
5. **Critic** — Approve card: "Voice ✓ · Specificity ✓ · Arc ✓ · Ask ✓. Ready to send."
6. **Watcher** — "Reply received. Maya: 'Tuesday 4pm work for you?' → Stage advanced to Coffee."
7. **Curator** — "Updated Maya's profile + recent_deal signal. Tomorrow's queue is sharper."

**Motion (the big one):**

- Section uses scroll *progress* (not scroll *hijacking*). The page never traps the user. We map the user's natural scroll position within the section to a 0–1 progress value via IntersectionObserver + a ResizeObserver-backed scroll-y reading, and drive the loop's current state from that progress.
- Section height is set to ~1.5 viewport heights so a normal scroll passes through the loop in ~3-4 seconds. A fast scroll advances through the states quickly without jarring; the user can always continue scrolling past the section without resistance.
- Each step transition: card content cross-fades (~200ms), agent badge color animates, progress bar advances.
- Reduced-motion fallback: section uses normal block layout, the card snaps through states in 350ms increments via a one-shot timer when the section enters the viewport, and stays at the final state thereafter.

**Why this proves something:** Six agents in code is a claim. Six agents on the page, lit up in turn, each producing visible output, *is* the system. This is the section a YC partner sees and goes "they shipped a system, not a shell."

### 05. Funnel math — unchanged

Existing `FunnelMathAnimated`. 120 → 1 cascading bars. Italic Fraunces mentor quote underneath. No changes.

### 06. Doesn't sound like AI — upgraded

**Layout: two columns side-by-side.**

Header:
- Eyebrow: "No AI tells"
- Title: "What Alma writes vs what you send."
- Body: "Critic rejects generic drafts. You make it yours in two edits. The recruiter sees one email — yours."

Two cards in a 2-col grid:

**Left card — "Original AI draft"** (greyed, dashed border, warm-stone background)
- Subdued color, italic-ish weight
- The pre-edit AI body (from new `drafts_pre_edit_ai_body` column on the `drafts` table)

**Right card — "What [name] sent"** (white, Aegean accent border with subtle outer ring)
- Solid color, normal weight
- The user-edited final body

The example email pair shows: AI's "I hope this email finds you well" → student's "I'm a Brown CS sophomore looking at TMT and saw your team led the Q4 software deal."

**Motion:** Two-step `Reveal` — left card fades in at 0ms, right card at 200ms. No other motion. The contrast is the whole point.

**Why this proves something:** Single most credibility-restoring section. Direct counter to "isn't this just ChatGPT." Backed by a real database column shipping in migration 007.

### 07. Trust gradient — upgraded (promoted from FAQ)

**Layout: a three-position dial that mirrors the in-app control.**

A horizontal pill (white, hairline border, `rounded-full`) with 3 segments:
- **Copilot** (active by default, Aegean blue fill)
- **Preview-veto** (inactive, muted text)
- **Autopilot** (inactive, muted text)

The active position has a sliding pill underneath (Aegean blue, `rounded-full`) that animates between positions.

Beneath the dial: a single explainer card that shows the description of the *currently selected* mode.

- **Copilot:** "Alma drafts every email and shows it to you. You copy, edit, send from Gmail. Nothing leaves your inbox without you. Most students start here for the first two weeks."
- **Preview-veto:** "Each draft sits in a 15-minute window. Tap 'skip' to kill it. Otherwise it sends from Gmail at the time you set."
- **Autopilot:** "Alma sends. You read a Sunday digest. One tap returns to Preview-veto."

Footer line: "Auto-graduates as you approve drafts. Always one tap to step back."

**Motion:** The dial auto-plays once on scroll-in — slides from Copilot → Preview-veto → Autopilot → settles on Copilot. ~1 second total. After that, hovering a segment shows that mode's explainer card (touch: tap to swap on mobile).

**Why this proves something:** The control surface *is* the answer to "but what if Alma sends something bad?" Showing the same dial that lives inside the product means the user already understands the affordance when they arrive.

### 08. Three surfaces — upgraded

**Layout: three stacked rows**, alternating image-left and image-right, each ~half the page wide. Each row is a `Card` with hairline border, generous padding, and a tilted screenshot.

Header:
- Eyebrow: "Your week in Alma"
- Title: "Three surfaces. Zero spreadsheet."

**Row 1 — `/today` (left text, right image)**
- Eyebrow: "Your queue"
- Title: "Today's outreach, lined up."
- Body: "Drafts ready for review. Trust dial: Copilot, Preview-veto, Autopilot. You decide."
- Link: "→ /today"

**Row 2 — `/network` (right text, left image)**
- Eyebrow: "Archipelago"
- Title: "Your network, as a place."
- Body: "Every bank is an island. Every intro builds more of a home on it."
- Link: "→ /network"

**Row 3 — `/crm` (left text, right image)**
- Eyebrow: "Pipeline"
- Title: "Every banker, every stage."
- Body: "Draft → sent → replied → coffee → referral → first round → superday → offer."
- Link: "→ /crm"

**Asset requirement:** three real screenshots, taken from the app at `/today`, `/network`, `/crm` while signed in as a seeded user. Saved to `public/landing/today.png`, `public/landing/network.png`, `public/landing/crm.png`.

**Motion:** subtle parallax — as the user scrolls, the screenshot translates ~20px slower than the text column, giving a depth effect. Existing `Reveal` wrapper handles initial fade-in.

**Mobile:** rows collapse to single column, screenshots first then text, no parallax.

**Why this proves something:** The product currently lists three surfaces by name and says "take a look." This change shows them. Combined with the agent-loop section, this is the half of the page where "the product is real" stops being a claim.

### 09. Flywheel tile — NEW (empty-state release card)

**Layout:**

Header:
- Eyebrow: "The flywheel"
- Title: "Every Sunday, Alma learns something."
- Body: "Each send writes a signal. Each Sunday at 11pm UTC, a batch updates the banker scoring weights and the Critic's rubric. Then Alma is sharper for everyone."

Single centered card (`max-width: 520px`, white, hairline border):

- Top row: left "Release · pending" eyebrow + "First release publishes Sun May 3, 11pm UTC" title; right "UPCOMING" pill (ochre)
- Two empty-state slots in a 2-column grid:
  - "Banker scoring weights — updated based on which warmth signals correlate with replies. (Empty until first release.)"
  - "Critic calibration — rubric updates from drafts that scored high but got no reply. (Empty until first release.)"
- Footer line: "Public release notes will name what changed and why — like a software release, but for the network's intuition."

**Honest framing.** The card says "pending" and labels the empty slots as such. We do not invent data.

**Maintenance:** after the first batch runs, a follow-up implementation (post-YC) replaces the card with the real release contents. The structure stays.

**Motion:** empty-state slots pulse very softly (`box-shadow` opacity oscillates between 0 and 0.04) at a slow rate (~3s cycle). Eyebrow + title fade in via `Reveal`.

**Why this proves something:** YC partners care about defensibility. The flywheel is the moat. Showing the artifact slot — even empty — makes the moat concrete, not aspirational. The Sunday date is a verifiable commitment.

### 10. Founders strip — NEW

**Layout:**

Header:
- Eyebrow: "Who built this"
- Title (Fraunces): "*We're sophomores too.* We built Alma for our cycle."

Four monogram tiles in a horizontal row, centered:
- Tile 1: 64×64 circle, Aegean blue (`#1B3B5F`) fill, white "R" in Fraunces. Caption: "Rice"
- Tile 2: same, "R", caption: "Rice"
- Tile 3: 64×64 circle, Brown red (`#7B1F2C`) fill, white "B". Caption: "Brown"
- Tile 4: 64×64 circle, neutral muted (`#8A8674`) fill, white "M". Caption: "MIT"

Hackathon callout below (white card, hairline border, `max-width: 520px`):
- Star badge (ochre on cream) on left
- "Track winner — Y-Claude Builder Club Hackathon at Rice"
- Sub: "April 2026 · 6,047 lines of TypeScript shipped in 4 hours, zero merge conflicts"

No founder names. No links to LinkedIn / GitHub from the founders strip itself (those can live in `/about` later).

**Motion:** tiles stagger-fade in left-to-right (each 80ms after previous), hackathon callout fades in last.

**Why this proves something:** Multi-school sophomore team building for own pain. Hackathon track win at one of the founder schools — recent, verifiable, and the most YC-flavored hackathon brand possible. Build-velocity stat (6k LoC in 4hrs, zero conflicts) without leaning on the tool name.

### 11. FAQ — trimmed

Drop:
- "Will recruiters see I used AI?" — answered visually by Section 6
- "Does Alma send emails for me?" — answered visually by Section 7

Keep (6 items, in this order):
1. Is Alma a jobs board?
2. Why connect my Gmail?
3. What does it cost?
4. I'm not a finance major. Does that matter?
5. Which banks do you cover?
6. Are you private-beta or public?

Layout, accordion behavior, and copy of remaining items: unchanged from current.

### 12. Closing CTA + Footer — unchanged

"Ready to *leap*?" + 3-min/1-hour/1-offer microcopy + Upload + Talk to a founder buttons. Footer with `alma · built at Brown & Rice` (note: keep this even though we have MIT now — the *product* is built at the schools its student users come from; MIT is contributor presence, not user-facing positioning. Confirm with team.) + About / Privacy / Contact / "2026 cycle".

## Motion budget

| Section | Motion |
|---|---|
| 01 TopBar | None |
| 02 Hero | Existing word-stagger headline + journey scene; new trust-strip fade-in last |
| 03 Marquee | Existing 90s horizontal scroll |
| 04 Agent loop | **Scroll-locked sequence**, ~1.5vh of scroll, 7 morph states, agent badges light up in turn, progress bar advances. Reduced-motion fallback: 350ms-step auto-play |
| 05 Funnel | Existing bar cascade |
| 06 No AI tells | Two-step `Reveal` (left, then right) |
| 07 Trust gradient | Auto-play through 3 dial positions on scroll-in (~1s), settles on Copilot. Hover/tap to swap |
| 08 Surfaces | Subtle parallax (~20px) on each screenshot column |
| 09 Flywheel | `Reveal` on header + soft pulse on empty slots |
| 10 Founders | Stagger-fade tiles + late hackathon callout |
| 11 FAQ | Existing `Reveal` |
| 12 Closing | Existing `Reveal` |

The agent-loop section is intentionally the only scroll-locked sequence. Everything else is calm reveals or existing patterns. Motion respects `prefers-reduced-motion: reduce` everywhere — fallbacks are stated above where non-trivial.

## Asset inventory

**Need to capture / produce before implementation:**

1. **Three product screenshots** for Section 8 — `/today`, `/network`, `/crm`, taken while signed in as a representative seeded user. Save as `public/landing/today.png`, `network.png`, `crm.png`. ~1600px wide, retina-2x preferred.
2. **No founder photos required** for this version (monogram tiles only).

**Existing assets that stay:**

- 7 BB logos in `public/logos/`
- `JourneyScene` SVG component
- Aegean palette tokens
- Fraunces + Geist Sans variable fonts

## Implementation files

**Create:**

- `src/app/design-lab/landing-v2/_parts/AgentLoop.tsx` — the new Section 4 scroll-locked component
- `src/app/design-lab/landing-v2/_parts/NoAITells.tsx` — Section 6
- `src/app/design-lab/landing-v2/_parts/TrustGradient.tsx` — Section 7
- `src/app/design-lab/landing-v2/_parts/SurfacesStack.tsx` — Section 8
- `src/app/design-lab/landing-v2/_parts/FlywheelTile.tsx` — Section 9
- `src/app/design-lab/landing-v2/_parts/FoundersStrip.tsx` — Section 10
- `public/landing/today.png`, `network.png`, `crm.png`

**Modify:**

- `src/app/design-lab/landing-v2/page.tsx` — new section order, `Hero` adds trust strip, `HowSection` removed, `GlimpseSection` replaced by import of `SurfacesStack`, `FAQ` trimmed
- (Possibly) `src/app/globals.css` — one or two new `@keyframes` for the trust-strip late fade and the flywheel slot pulse, if existing `fade-rise` doesn't cover them

**Untouched:**

- `src/app/page.tsx` (still re-exports landing-v2)
- `JourneyScene`, `Reveal`, `GradientOrb`, `GrainOverlay`, `LogoMarquee`, `StickyUploadCTA`, `AuthAwareLogin`, `AnimatedHeadline`, `FunnelMathAnimated`, `ScenePreviewTilted`

## Out of scope (NOT in this redesign)

- Per-page redesigns of `/today`, `/network`, `/crm`. We only consume their screenshots.
- Founder names, founder photos, `/about` page.
- Real flywheel data (the empty-state card stays empty until the first batch runs Sunday).
- Any backend changes. Deliverability, agent behavior, schema migrations are all upstream of this.
- New routes (`/why-alma`, `/team`, etc.).
- A `/leaderboard` or `/cohort` UI wire-up.
- Internationalization, dark mode, accessibility audit beyond reduced-motion fallback.

## Open decisions deferred

1. **Footer copy.** Currently says "built at Brown & Rice." Now we have MIT too. Options: (a) keep as-is — Brown + Rice are the *user* schools, MIT is contributor; (b) change to "built at Brown, Rice & MIT"; (c) drop schools from footer entirely. Defer to user.
2. **Animated agent name in Section 4.** Should the agent label say "Researcher" generically or "Researcher · ranking 432 bankers..." with rotating substrings? The animated substrings are richer but require we keep the strings short and accurate. Default to generic; revisit during implementation.
3. **Maya Chen example.** Section 4 + Section 6 use a fictional banker (Maya Chen, Brown CS '15, VP TMT at Morgan Stanley) as an illustrative example, consistent with the design-lab pages. This is product-narrative voice, not a claim about a real banker. If we want to stay completely literal, we can swap to "an alum at Morgan Stanley" with no name; the loss is concreteness. Default to keeping Maya as the example persona.

## Success criteria

- Page renders end-to-end without console errors on Next.js 16 + React 19.
- Lighthouse desktop performance ≥ 90 (maintain current).
- All motion respects `prefers-reduced-motion`.
- A YC partner skimming top-to-bottom in 60 seconds sees: real founders + schools + hackathon (Section 10), the agent loop in motion (Section 4), draft-vs-sent contrast (Section 6), live-feeling surfaces (Section 8), the flywheel commitment (Section 9). All without reading a paragraph.
- A sophomore opening on phone scrolls through and arrives at the closing CTA still feeling that this is calm and theirs.
