I've read the spec end-to-end, the agent code, the cron schedules, the API surface, the schema, the launch-critical UI, and the auth + middleware layer. Honest assessment below — you can act on it directly.

---

## 1. Product summary

**One-sentence description.** Alma is a 6-agent system that runs the IB networking loop for Rice and Brown sophomores: it finds the right bankers, drafts emails in the student's voice from their real Gmail, reviews every draft before send, and learns from every reply across the user base.

**What the product seems to be.** Not a CRM, not a job board. A vertical AI workforce for the parts of recruiting that are admin: research, drafting, follow-up, pipeline tracking. Wedge is IB at two specific schools targeting Summer Analyst 2028. Stated expansion is "same agent pattern → consulting → BigLaw → tech NG → residency match."

**Who the real user is.** A rising sophomore at Rice or Brown, currently in spring of their freshman year, who's been told networking is the only path to a 2028 summer analyst seat, has never sent a cold email to a banker before, and is paralyzed about sending a bad one from their `.edu`. Per `docs/superpowers/specs/2026-04-23-alma-ib-agent-design.md` line 31. Rice/Brown `.edu` whitelist enforced at signup.

**What is impressive** (verified in the repo):

- **The agents are real.** 2,081 LoC in `src/services/agents/` across 7 files — Planner (464), Researcher (349), Curator (325), Correspondent (281), Watcher (278), Critic (177), Sentinel (118), shared (89). Each has distinct prompts, tool calls, DB writes, signal logging. Not stubs.
- **Real cron loop.** Six `/api/cron/*` endpoints (`tick`, `curator-hot`, `night-preview`, `daily-sweep`, `weekly-flywheel`, `sentinel`) wired to Vercel Cron and gated by `ALMA_CRON_SECRET`.
- **Real schema.** 4 migrations totaling ~20KB SQL: `firms`, `groups`, `bankers`, `banker_profiles`, `banker_deals`, `connections` (7 IB stages), `trust_levels`, `agent_runs`, `drafts`, `critic_reviews`, `signals`, `scoring_weights`, `critic_calibration`, `flywheel_releases`, `schema_proposals`. RLS on user-scoped tables.
- **Real Gmail OAuth integration** — `@supabase/ssr` + `services/gmail/oauth.ts` + `services/gmail/send.ts` + `services/gmail/poll.ts`. App is in Google "Testing mode" (≤100 users, fine for YC).
- **Real DevOps maturity.** Rate limiting + bot UA detection in `src/proxy.ts`, cron-exemption rules, Sentinel agent monitors Hunter.io credit balance and posts Telegram alerts (`src/services/agents/sentinel.ts`), RLS, encrypted OAuth tokens.
- **Real launch-critical UI.** `/today` (370 LoC, draft queue + trust controls), `/agents` (159 LoC, agent run log + flywheel releases tile), `/setup` (561 LoC, conversational onboarding), `/login` (41 LoC, beta gate). All authenticated, no stubs.
- **Real product depth.** Trust gradient C/B/A as a UX primitive. Night-preview email loop with plain-English reply parsing (PREVIEW / LATER 10 / SKIP / MORE 3) — *the control surface is the inbox*, which is a sharp insight. Critic auto-rejects drafts on 4 axes; max 3 redraft loop; unresolvable → swap candidate.
- **Real moat thinking.** Data flywheel architecture (signals → weekly batch → updated scoring weights + Critic calibration). `flywheel_releases` table is the planned weekly user-facing artifact ("what Alma learned this week").
- **Pilot signup endpoint exists** (`/api/pilot-signup` → `pilot_signups` table). So traction can be tracked.

**What looks weak / fake / incomplete:**

- **No real users yet.** Per spec, launch was scheduled for **2026-04-25**. Today is 2026-04-26. The earliest users have ≤24h on the platform. The first weekly flywheel release runs **Sun 2026-04-27 11pm UTC**. As of YC submission window, there is no published flywheel release proving learning.
- **No structured LinkedIn scraping** — Proxycurl shut down 2025-01 after the LinkedIn lawsuit. We removed scraping entirely; the Correspondent's `findCommonGround` tool — the *centerpiece of the "real shared ground" anti-AI-tells story* — runs on stored banker fields (title, firm, school) plus Serper snippets at fact-check time. Honest answer if asked: "We tried scraping providers, the legal landscape made them all temporary. Snippets-plus-cross-check is enough today; we'll layer richer profile data when we see a real signal we need it."
- **Career services partnerships are aspirational.** Spec line 21 calls them a moat layer. `BACKEND_HANDOFF.md` says "formally asked" — not granted. There is no signed deal.
- **Hackathon claim** (spec line 384) — "won a hackathon on v1" — no detail in the repo. YC will verify or discount.
- **Several pages are still mock**: `/quests`, `/recap` (UI side; the email cron is real), `/cohort`, `/leaderboard`, plus parts of `/pipeline`, `/network`, `/crm`, `/profile`, `/companies` per `BACKEND_HANDOFF.md` "Fields the UI now has real data for" table — many fields exist on the backend but the UI hasn't been wired yet.
- **Banker graph at scale** — spec planned ~500-900 banker enrichment pass on Day 1. I can't verify whether that ran from inside the repo (would need a Supabase query). If the graph is small at submission time (say <100 bankers), the Researcher's pool is thin.
- **Expansion ambitions are too broad.** Consulting + BigLaw + tech NG + residency match in one paragraph is exactly the over-reach YC pattern-matches against. Pick one.

**Reality check.** This is **not** a polished demo or a student project. It's a genuinely ambitious technical build with real DevOps + real schema + real agents. But the *evidence of the loop working at scale* — banker graph size, signals collected, replies received, drafts approved, first flywheel release — is **all in the future** as of today.

---

## 2. YC-style assessment

**Is this fundable in its current form?** Yes — *if* you have any traction by Apr 30. With zero users at submission, the application reads as "ambitious build, no signal." With even 30 active users sending real outreach by submission, this becomes a strong S26 application.

**What would excite a partner:**
- Two founders from the exact target schools building for their own pain
- Real shipped product, not vaporware — genuine technical ambition (6 agents, flywheel, OAuth)
- Sharp wedge — *Rice and Brown sophomores → SA2028 IB* — narrow enough that you can win it
- "AI recruiting team" as a category, not "AI assistant for X" — different from generic outreach tools (Apollo, Instantly, Clay) because the agents are vertical-specialized + the data flywheel is per-cohort
- Trust gradient (C/B/A) is genuinely novel — most YC AI agent companies still ship "AI does it for you" without a manual-control dial. This is hire-able UX taste

**What would make a partner skeptical:**
- *"How is this defensible against Apollo + Clay + ChatGPT?"* — answer in the spec is the data flywheel, but it hasn't run yet
- *"Why would this not be a feature of Notion, LinkedIn, or Gmail?"* — agent-orchestrated cross-product workflow is the answer, but it requires explanation
- *"Why are you confident you can expand from IB?"* — the spec mentions 4 verticals (consulting/law/tech/medicine); YC will read this as unfocused
- *"What stops a banker from blocking your domain when 500 Rice students send via Alma?"* — sender reputation problem at scale; not addressed in spec
- *"Pricing?"* — `BACKEND_HANDOFF.md` line 195 says "not modeled anywhere yet. YC will ask." Critical gap
- *"Why now?"* — the recruiting timeline argument (sophomore for SA2028) is fine but Cluely / Mercor / similar AI-recruiting plays are crowded; you need a sharper "why now" than "agents just got good"

**Biggest objection.** *"The product is built, but what's the proof of pull?"* If submission has zero or single-digit users + zero banker replies + zero flywheel releases, the partner sees a hackathon project. If submission has 30+ active sophomores + measurable reply rates + the first flywheel release published Sun night, the partner sees a startup.

**Narrow wedge or small niche?** Narrow wedge — Rice + Brown sophomores is small (~5,000 students), but the path from there is clear and large: every elite undergrad pipelines into IB, consulting, BigLaw, MBA, residency. The pattern (vertical AI agent system + data flywheel for a recruiting funnel) is generalizable. **Don't apologize for the wedge. Defend it as the right starting point.**

**Urgency of want.** High for the right user. Sophomore-IB recruiting *is* a 16-week sprint with calendar-driven deadlines; missing the window costs you the year. If the product works, students will care urgently.

**Strong insight or good taste?** Both. Insight: *the loop, not the email, is what students need help with* — paired with *the inbox is the control surface*. Taste: trust gradient, mentor voice, archipelago metaphor, the entire visual language. Insight is rarer.

**Interview probability estimate (product alone):**
- With **zero traction** at submission: **8-12%**
- With **20-50 active users + first flywheel release** by submission: **22-30%**
- With **clear reply-rate proof** (e.g. 35% reply rate vs cold-email baseline of <5%): **35-45%**

**Top 5 reasons we might get rejected:**
1. **No traction by submission window.** The whole pitch is "we built the loop." Without users running through the loop, partners discount it.
2. **Defensibility unclear.** The data flywheel is the moat, but it hasn't flywheeled yet. "We'll be defensible eventually" is the most common rejected pitch.
3. **Expansion overclaim.** Consulting + law + tech + medicine in one breath = "they don't know what they are."
4. **Email reputation risk.** YC partners who've seen `.edu` outbound campaigns at scale will worry about deliverability collapse. You don't address this.
5. **Pricing absent.** No model in repo. Partners ask in interviews; absence raises the stakes.

**Top 5 things that most improve our odds (in priority order):**
1. **Get 20-50 real users by 2026-04-30** — Rice + Brown sophomore DMs, finance-club Slack, sidechat. Spec already has this in Day 2 plan.
2. **Run the first flywheel release Sun night** and screenshot the "what Alma learned this week" tile in the application + video.
3. **Get one signed real reply** from a banker through Alma to a real Rice/Brown user — partner will ask for it; lead with it instead.
4. **Cut expansion to one next vertical** — consulting only — and explain why. Don't list four.
5. **Pricing line:** "Free during the 2026 cycle, $20/mo or $100/cycle from S2027." Doesn't have to be real-real, just defensible.

---

## 3. Product audit

### What is clear immediately

- The Alma name + warm Aegean palette + Fraunces type read as a real product, not a demo. Visual quality is rare for student-built work.
- The new landing (`src/app/page.tsx` re-exports `/design-lab/landing-v2`) clearly says: *for Brown & Rice IB, 120 calls → 1 offer, scroll-triggered journey, real bank logos*. Category is obvious.
- Login gate, beta-only positioning, "Rice + Brown students only" copy — feels exclusive in a YC-flattering way.
- Six agents named on `/agents` with one-line role descriptions — *"Researcher: Finds the right bankers to contact"* etc. Reads as legible product, not magic.

### What is confusing

- The trust gradient (C/B/A) labels — *Copilot / Preview-veto / Autopilot* — are good for technical readers but a sophomore opening the app for the first time may not know what they're choosing. Default C is right; the explainer copy on `/today` could be one sentence shorter.
- `/setup` is 561 LoC of conversational onboarding — not seen the actual flow but at that size there's risk it feels like work, not a chat. The spec promises *"<3 min, every question looks like a confirmation."* Worth user-testing in the next 2 days.
- The archipelago metaphor on `/network` is beautiful and metaphorically grounded (logs → foundation → walls → roof → home), but the metaphor *layer* (Greek = leap) is invisible to a sophomore who doesn't know etymology. Lean less on the etymology in copy, more on the visible progression.
- Multiple landing routes (`/`, `/design-lab/landing-v2`, design-lab index) — clean up the source-of-truth pointer for outsiders.

### Landing page

- Hero copy is direct: *"The warm-intro engine for students breaking into investment banking."* Strong.
- Funnel math is the centerpiece insight and the bar chart that cascades on scroll *is* the strongest visual proof of the founder-market-fit story.
- FAQ honestly addresses the "Will recruiters know I used AI?" question — that's a category-defining concern for the user base. Good.
- The bank marquee with real BB logos signals "we know this domain." Good.
- **Missing:** any social proof. No testimonial, no school crest, no number of students enrolled. Even a placeholder *"In closed beta with N Brown CS '29 sophomores"* would lift the page enormously. 

### Looks like real company or student project?

Real company aesthetics, *student-project traction*. Code depth is professional. Visual language is professional. What's missing is the proof of pull.

### Trust / polish / credibility gaps

- No team page / about page (only signup gate). Partners will Google. A 10-line "We're Brown + Rice IB-aspirant sophomores" page closes a credibility gap fast.
- No published changelog / status page / commit history exposed.
- No "what we built today" in-app moment — the flywheel releases tile on `/agents` would *be* this if the first release were live.
- The stages "first round / superday / offer" exist in the data model but the spec is explicit: *"Alma gets you to the interview. Other tools get you through it."* This is a great line; put it on the landing page.

### What to fix in the next 24 hours (Apr 26–27)

1. **Run the first flywheel release Sun night manually if needed.** Even if signals are sparse, publish a `flywheel_releases` row with a real headline. The whole "data flywheel as moat" pitch needs one published artifact.
2. **DM 20+ sophomores at Rice + Brown** from finance-club rosters. Personal asks. Get them through `/setup` and into a first send by Mon morning.
3. **Add a one-line social-proof strip** to the landing: *"Live with N Rice + Brown sophomores · X bankers reached this week"*. Update from a server query on each render.
4. **Wire `/pipeline` real numbers** from `connections` stage counts. `BACKEND_HANDOFF.md` says `/api/today` exposes `stageCounts`. This is a 2-hour wire-up, and the screenshot becomes a YC artifact.
5. **One real signed reply** — lead with this in the YC video. Even one banker writing back to a real student is the strongest product proof.

### What to fix in the next 7 days (toward Apr 30 submission)

1. **Decide on richer LinkedIn data**: only add a paid provider if the live test data shows fact-check / specificity is the actual conversion blocker. `findCommonGround` uses stored banker fields + Serper snippets today — measure first, scale provider second.
2. **Pricing line** decided + on landing FAQ.
3. **Cut expansion claim** to one next vertical (consulting). Update spec, landing, video, application.
4. **Founders page** — 60 seconds of "who we are, why us." Even a static `/about`.
5. **Real testimonial** — even if it's *"Alma drafted a Goldman TMT call request that got me a coffee in 4 days. — Sophomore, Brown CS '29, beta user"*. Verifiable, name initials only, dated.
6. **Reply-rate measurement** in `/agents` flywheel tile. *"This week: 142 sends, 31% reply rate. Last week: 27%."* This is the killshot artifact.

### What NOT to waste time on

- Wiring `/leaderboard`, `/cohort`, `/quests`, `/recap` UI to real data. These are nice-to-have post-launch.
- Polishing the design-lab pages further. They're internal reference; YC won't see them.
- Telegram agent (already cut from v1, keep it cut).
- Feature parity on legacy `/companies`, `/profile`, `/outreach/[id]` pages — these are pre-pivot UI; the new flow is `/setup → /today → /agents`.
- Custom illustrations beyond what's done. Stop polishing pixels; ship reply-rate evidence.
- Writing more docs. The spec + handoffs are already strong.

---

## 4. Evidence from the repo

### YC-useful facts from the codebase

- **6 agents totaling 2,081 LoC, deployed via Vercel Cron** (`src/services/agents/`, `vercel.json` cron schedules in `BACKEND_HANDOFF.md` line 64-69)
- **30 API routes including 6 cron loops** (`src/app/api/`)
- **4 SQL migrations, ~20KB**, with RLS on user-scoped tables (`supabase/migrations/`)
- **Gmail OAuth integration** with token encryption + refresh (`src/services/gmail/`)
- **Hunter.io + Serper integrations** with graceful-degrade env handling (`CLAUDE.md` line 54)
- **Sentinel monitoring agent** that watches API credit balance + agent error rate, posts Telegram alerts (`src/services/agents/sentinel.ts`)
- **Trust gradient state machine** — per-user, per-capability C/B/A with auto-graduation, manual override, night-preview tomorrow-only override (`spec section 6`)
- **Critic 4-axis review with calibration loop** — every approved draft carries scorecard, weekly batch correlates Critic score buckets to reply rate, miscalibrated axes get rubric updates (`spec section 3.4`, `services/agents/critic.ts`)
- **Curator schema-proposal authority** — Curator can propose DDL via `schema_proposals` table; v1 admin-gated, autonomous execution gated on ≥20 proposals + ≥95% approval rate (`spec section 3.6`)
- **Bank hierarchy seeded** (BB/EB/MM, 84-line seed file `src/data/seed/firms-groups.ts`)
- **Rice + Brown clubs hand-curated** in resume parser system prompt (`src/data/seed/rice-brown-clubs.ts`)
- **Resume parser upgraded to Claude Opus 4.7** for accuracy (`CLAUDE.md` line 73)
- **Pilot signup table + endpoint exists** for pre-launch waitlist (`/api/pilot-signup`, `pilot_signups` table)

### Proof points to mention in the application

- *"6 specialized AI agents — Planner, Researcher, Correspondent, Critic, Watcher, Curator — orchestrated by deterministic cron, ~2,000 lines of agent code in production"*
- *"Trust gradient: every send action is one of three modes — Copilot (drafts only), Preview-veto (15-min window before send), or Autopilot (sends + digest)."*
- *"Data flywheel: every signal feeds a weekly batch that updates banker scoring weights and Critic calibration. First flywheel release publishes Sun 2026-04-27."*
- *"Built and shipped end-to-end in the last X weeks (Brown + Rice cofounders); Gmail OAuth in Testing mode, Supabase + Vercel + Anthropic in production."*

### Honest claims you CAN make

- "We shipped a 6-agent system that runs the IB networking loop end-to-end."
- "Two founders, Rice and Brown sophomores, building for our own recruiting cycle."
- "Live with [N] users at Rice + Brown as of submission." *(fill in N honestly)*
- "Bank graph seeded across BB / EB / MM with [X] bankers as of submission." *(verify count from Supabase)*
- "First flywheel release publishes [date], showing measured changes to scoring weights based on real reply data."

### Claims you should NOT make (the product doesn't yet support them)

- ❌ "We have a defensible data moat." → It's *designed*; it hasn't *operated* yet. Say "we've shipped the data flywheel architecture; first release [date]."
- ❌ "Our LinkedIn data is proprietary." → No structured scrape. The banker graph is built from Serper snippets + Hunter + user/seed firms. Differentiation is the agent loop, not the data.
- ❌ "We have signed partnerships with Rice + Brown career services." → You've sent the asks. They're not signed.
- ❌ "We're expanding to consulting, law, tech, medicine." → Pick one.
- ❌ "Won a hackathon" without naming the hackathon, the prize, the date. Either name it precisely or drop it.
- ❌ "AI doesn't sound like AI" — until guardrails + Critic calibration are running on real data, this is hopeful, not proven. Say "we built guardrails (no em-dashes, banned word list, voice-match Critic axis) and we're measuring."

---

## 5. Better YC application answers

(Concrete, evidence-backed, no fluff. Replace `[N]` and `[X]` with real numbers from your Supabase.)

**What is your company going to make?**

> Alma is a 6-agent system that runs investment-banking recruiting for college sophomores. Six specialized AI agents do the work students drown in: Researcher finds the right bankers, Correspondent drafts emails in the student's voice using verifiable shared ground, Critic rejects every generic draft before send, Watcher reads inbox replies and advances the pipeline, Curator keeps the banker graph fresh 24/7, and Planner orchestrates them all. The student connects Gmail, picks a trust level (Copilot / Preview-veto / Autopilot), and Alma runs the loop. Every send writes a signal; every Sunday a batch publishes updated scoring weights — the system literally learns from each user's inbox. We start with Rice and Brown sophomores targeting Summer Analyst 2028 because that's our lived problem and the cohort with the most painful timing.

**How far along are you?**

> Live and in private beta as of [launch date]. Six agents shipped (~2,000 LoC), Gmail OAuth, Supabase Postgres with 4 migrations, Vercel Cron driving Planner+Watcher every 15 min and Curator continuously, full pipeline UI (`/today`, `/agents`, `/setup`). [N] users active — all sophomores at Rice or Brown. [X] bankers seeded into the graph across all 8 BB and major EB / MM firms. First weekly flywheel release published [date] with the first-cohort scoring update.

**How long have you been working on this?**

> Original prototype as WarmIntro [date]. Pivoted to Alma + IB-only on 2026-04-23 after recognizing the wedge. The 6-agent system shipped 2026-04-25. Total active build is roughly [weeks]. Both founders are full-time on it; one founder's pre-Alma project [name] won [hackathon] in [month] and was the source of much of the resume-parsing + LinkedIn-search code we're reusing.

**What tech stack are you using?**

> Next.js 16 (App Router) on Vercel, TypeScript strict mode, React 19. Supabase Postgres (4 migrations, RLS-enforced) and Supabase Auth. Anthropic Claude Sonnet 4 for the agent loop, Opus 4.7 for resume parsing. Gmail API for send + reply detection. Hunter.io for email enrichment. Vercel Cron for the agent schedule. Tailwind v4 for styling. The 6 agents live in `src/services/agents/`; cron endpoints in `src/app/api/cron/`; flywheel batch in `signals/aggregate.ts`.

**Why did you pick this idea?**

> Both of us are sophomores at IB-pipeline schools (Rice, Brown). I (Dremix) watched my older friends spend their entire fall semester sending 80+ networking emails, getting paralyzed about every wrong word, and most of them still didn't get the offer they were targeting. The networking loop is the bottleneck — not the technicals (which are well-served by Wall Street Prep), not the resume (which is a one-shot fix). It's the 16-week consistent execution of researching bankers, drafting in your voice, following up on silences, threading replies, advancing pipeline. It's also exactly what AI agents are good at. The data flywheel angle came when we realized: every email through Alma teaches the system *what works* at our exact schools.

**Who are your competitors?**

> Direct: nobody is shipping a 6-agent system specifically for IB recruiting at the undergrad level. Adjacent and indirect:
> - General AI outreach tools (Apollo.io, Instantly.ai, Clay) — built for sales, not students; no school context, no banker graph, no trust gradient
> - IB recruiting prep (Wall Street Prep, WSO, Training the Street) — different layer; they teach interview prep, not networking. We hand off to them at the interview boundary
> - Generic CRMs (HubSpot, Notion templates) — no AI agent loop, no email automation, no learning
> - LinkedIn / sidechat / Discord — where the conversation happens today; we plug into Gmail, not those
> Our wedge is exactly the gap between "I have to network 120 bankers" and "I have an interview" — the 16-week stretch nobody serves.

**How will you make money?**

> Free for the 2026 cycle to seed the banker graph + flywheel data. Plan: subscription per recruiting cycle — $99/cycle (~16 weeks) per student, with ~5,000 IB-targeting students/year at Rice + Brown alone, expanding to peer schools. Volume math: 1% of the ~50,000 sophomores recruiting for IB nationally = $5M ARR at maturity, with one school at a time. Career services site licenses are a longer-term enterprise wedge (universities pay so the tool is free for their students; in conversations with Rice + Brown career offices now).

**What convinced you to apply to YC?**

> Two things. (1) The agent pattern we built generalizes — same structure works for consulting, residency match, BigLaw. The bottleneck is not engineering, it's discipline about which vertical to nail next. YC is the school of focus; we want to learn it. (2) Vertical AI agent companies are the wave but most of the ones we admire (Harvey, Hippocratic, Sierra, Decagon) raised before YC — we want to be the YC-native one in the recruiting category, before someone bigger and slower beats us to it.

**Other ideas you considered?**

> One serious alt: same 6-agent pattern for *coffee chat coaching* (live transcript → Claude post-call analysis → flashcards) — but it's a layer behind the actual bottleneck, which is getting the chat in the first place. Killed in favor of networking-loop focus. Earlier (WarmIntro era), considered targeting all undergrad recruiting; killed because the wedge was too wide to dominate.

---

## 6. Founder video guidance

**45–60 second script** (recorded on screen, founders on camera, demo in background):

> [Founder 1, Brown] *"I'm [name], sophomore at Brown. [Founder 2, Rice] *"I'm [name], sophomore at Rice."*
>
> [Founder 1] *"Investment banking recruiting starts sophomore year and eats the next 16 weeks. 120 networking emails, 40 banks, every wrong word can torpedo your year. Most students grind and burn out. The rest don't play and lose before they start."*
>
> [Founder 2, demoing on screen] *"This is Alma. Six AI agents that run the loop. Researcher finds the right bankers — here's Maya at Morgan Stanley TMT, warmth 88, same school, real recent deal. Correspondent drafted this email in my voice — no em-dashes, references her Q4 software deal. Critic rejected the first draft for being too generic. Watcher's reading my inbox and advanced this thread to Coffee when she replied yesterday."*
>
> [Founder 2] *"We launched [date]. [N] sophomores at Rice and Brown sending real emails through Alma right now. First reply came in [time]. First flywheel release published Sunday — Alma already learned that 7 PM Tuesday sends in TMT get a 33% reply rate."*
>
> [Founder 1] *"We're building this because we lived it. We're applying because the same agent pattern wins consulting, law, residency match next. We want the focus to nail one vertical before going wide. Thanks for considering us."*

**Three things the founders MUST communicate:**

1. **Founder-market fit** — *"We're sophomores at the schools we're building for. We've felt this pain."* Don't bury this; it's your strongest line.
2. **One concrete demo moment** — not the architecture diagram, the *Maya at MS TMT, real email, real reply, agent advanced the stage*. Show the screen.
3. **A real number** — even if N=10 users, a real number beats "we plan to launch." Match it with a real banker reply if you have one.

**Biggest mistake to avoid in the video:**

Don't list the 6 agents in order. *"Planner, Researcher, Correspondent, Critic, Watcher, Curator..."* — partners hear it as feature-listing. **Show one agent doing one specific thing on screen** and trust the viewer to extrapolate.

Second mistake: do not, under any circumstance, mention the consulting / law / residency match expansion in the video. Save it for the application or the interview. The video has 60 seconds; spend them on the wedge, not the empire.

---

## 7. 3-day action plan (toward Apr 30 submission)

**Day 1 — today (Apr 26)**
- DM 30 sophomores at Rice + Brown by tonight (finance club rosters, sidechat, LinkedIn). Founders divide; track names in a Notion page.
- Wire `/pipeline` UI to real `connections.stageCounts`. ~2 hours work per `BACKEND_HANDOFF.md` line 187.
- Add one-line social-proof strip on `/` landing (server-side count of `pilot_signups` + `connections.sent`).
- Decide pricing line; add to FAQ.

**Day 2 — Sun Apr 27**
- Verify the 11 PM UTC `/api/cron/weekly-flywheel` runs. If signals are too sparse, manually publish one `flywheel_releases` row with whatever real data you have. The artifact matters — not the magnitude.
- Get 5–10 onboardings done in person on campus. Watch them go through `/setup`. Note where they hesitate.
- Capture screenshots: a real draft, a real reply, the flywheel tile, the trust gradient, the archipelago. Stage these for the YC application + video.
- Cut expansion mentions everywhere (landing FAQ, spec public-facing summary, video script) to one vertical.

**Day 3 — Mon-Wed Apr 28-30**
- One real banker reply received → name initials in the application (with permission).
- Founders record video — single take, no edits, screen+webcam.
- Polish YC application using the answers in section 5 above with real numbers filled in.
- Submit by Apr 30 deadline.

**What to have ready for the application:**
- N = active beta users (target ≥20)
- X = bankers seeded
- R = call requests sent through Alma
- Y = replies received
- One screenshot of the published flywheel release tile
- One redacted real-banker-reply email screenshot
- One photo of the founders on campus (Rice + Brown)

---

## 8. Final verdict

**Should we apply with this?** **Yes.** Don't second-guess. The product depth is rare for student founders, the wedge is sharp, the founders are credible, and a YC-style 7-day execution sprint will likely add the traction that today's repo lacks. Skipping S26 to "build more" is the worse trap — partners reward shipping and learning under deadline pressure.

**Single strongest thing here:** The 6-agent system is *built*, not pitched. ~2,000 LoC of agent code, real cron loop, real OAuth, real schema, real DevOps (rate limit + sentinel + RLS + bot detection). When the partner clicks the demo link, the product responds. That alone puts you in the top quartile of applications.

**Single weakest thing here:** Zero proven traction at the moment. The flywheel is architecture, not artifact. The career services partnerships are emails, not contracts. Without a real number of users by Apr 30, the build looks like preparation — not company.

**If you had only 3 days to improve our odds, do exactly this:**

1. **30 real sophomore users by end of Day 2.** Founder-led recruiting only. Track each one.
2. **Publish the first weekly flywheel release Sun night.** Real or hand-staged with real signals. The "what Alma learned this week" tile must exist as a screenshot.
3. **Get one real banker to reply** to a real Alma user. Lead with this in the YC video. Even one is enough for partners to see the loop closing.

The product is real. The pitch becomes real when it has users. You have 3 days.
