# Alma IB — Design Spec

**Date:** 2026-04-23
**Authors:** Dremix (Rice) + cofounder (Brown)
**Status:** Approved for implementation — YC spring 2026 application push
**Deadline:** Launch 2026-04-25. YC application 2026-04-30.

---

## 1. Scope & positioning

### What we're building

Alma IB — an all-in-one IB recruiting command center for Rice + Brown rising sophomores, powered by a 6-agent system (Planner, Researcher, Correspondent, Critic, Watcher, Curator) that proactively runs the networking loop and a data flywheel that sharpens with every call.

### Wedge and moat

- **Wedge.** IB recruiting at Rice + Brown, class of '29 (current sophomores, rising juniors by fall), targeting SA2028.
- **Moat — four compounding layers:**
  1. **Data flywheel.** Every call through Alma teaches the system — banker reply rates, opener conversion, group-level activity, per-profile match patterns. Each user benefits from every prior user's inbox signal. Not ML-heavy in v1; weighted heuristics updated weekly from SQL aggregates.
  2. **Directory partnerships.** Formal asks with Rice + Brown career services are live as of 2026-04-23. If granted, exclusive banker contact data competitors can't replicate. Stored with provenance; Alma extends to new schools the same way.
  3. **Proprietary banker graph.** Bank → group → banker hierarchy + deals tracker. Seeded manually; grows automatically as Watcher extracts deal mentions from inbound replies and as Curator scrapes press releases.
  4. **Trust gradient as UX primitive.** C → B → A autonomy ladder with manual toggle. Category-defining positioning — nobody else is shipping AI agents this way.

### Expansion path (post-YC)

Same 6-agent pattern, new vertical each quarter: consulting (MBB) → law (BigLaw) → tech (FAANG new grad) → medicine (residency match). Alma becomes the *AI recruiting team* platform for professional pipelines where networking is the gate.

### ICP one-liner

A rising sophomore at Rice or Brown who wants to land an IB SA2028, has heard networking is the only path, is terrified of sending a bad email from their real address, and is drowning before they've even started.

### Hard scope boundary

**Alma gets you to the interview. Other tools get you through it.** The pipeline includes First Round → Superday → Offer stages for tracking, but Alma does not teach DCF / LBO / M&A / behaviorals / stock pitches. That space is well-served (Wall Street Prep, WSO, Training the Street). Explicit handoff at interview prep.

### Out of scope for v1 (explicit cuts)

- Telegram agent (email-first v1; same promise, simpler)
- Scheduler / Calendly integration
- Technical / behavioral prep tools (hard scope boundary)
- Other verticals (consulting, etc.)
- New branding — Alma stays; IB is the wedge, brand is the umbrella

---

## 2. User flow

### Onboarding (3 steps, conversational, AI-pre-filled, < 3 min)

Alma reads resume first, then confirms + asks — every question looks like a confirmation, not a form.

1. **Gmail OAuth + resume upload.** Single screen. Rice/Brown `.edu` email whitelist enforced.
2. **Confirm what Alma learned.** Alma displays extracted profile card (name, year, major, GPA, clubs, experience) — inline editable, no forms. Same screen: *"Based on your resume, you'd be strongest in TMT and Healthcare. I'll default to those plus two you pick. Tap the banks you care about most."* Bank chips tiered BB/EB/MM; taps register; Alma auto-selects 10 if user gets bored.
3. **One sentence of leverage.** *"Why IB? I'll use it in every email I write for you."* Single textarea. Skip button pulls the resume's objective/summary as fallback.

**Trust gradient picker** sits as expandable footer on step 3 — default C, toggle to B or A. Most users never touch it.

After step 3 the agent starts running tonight.

### Onboarding input model (not just resume — resolves "CV alone is not optimal")

Captured during onboarding:
- Resume (file → parser)
- Target firms (bank chips, 8-15)
- Target groups (chips, 2-4)
- Story one-liner (free text, 1 sentence)
- Warm-start contacts (optional: bankers already talked to, pastes LinkedIn URLs or names)
- Warm-connection hints (optional: frat, HS network, family relationships, shared hometown)
- LinkedIn URL (optional: auto-scrape via existing `linkedin-profile-scraper.ts`)

Fed to Researcher + Correspondent as structured context.

### Resume parser — accuracy pass (required before launch)

Current parser on Sonnet 4 misses clubs buried inline, GPA in non-standard formats, leadership titles, relevant coursework. Required upgrades:
- Upgrade parser call to **Claude Opus 4.7** (low volume, quality matters)
- Hand-curate Rice + Brown club/society list as known-list in system prompt (Rice Finance Club, Owls on Wall Street, Rice Consulting Club, Brown Finance Club, Brown Investment Group, Brown Consulting, relevant frats/sororities with banker pipelines, etc.)
- Post-parse verification UI (step 2 of onboarding — user sees highlights, fixes in place)
- Targeted extractors for GPA variants, coursework, leadership titles (VP / President / Treasurer), technical skills (Bloomberg, FactSet, CapIQ, Excel modeling, Python, SQL)

### Daily loop (user-configurable time, night-before control)

Every user has a `preferred_send_time` (default 7:00 AM local). Changeable anytime via `/today` or night-before reply.

**Every night at 9 PM user-local:**

Alma sends a calm preview email (THE retention loop):

```
Subject: Tomorrow — 5 drafts ready

2 TMT at Morgan Stanley, 1 M&A at Evercore, 2 Healthcare at Centerview.
Sending at 7:15 AM tomorrow unless you tell me otherwise.

Reply with:
  PREVIEW — send the queue to you first at 6:45
  LATER 10 — push tomorrow's send to 10:00 AM
  SKIP — no sending tomorrow
  MORE 3 — add 3 more drafts
  or just tell me in plain English
```

Watcher parses these replies (Claude intent-classifies), updates user's tomorrow-only settings, confirms with one-line reply. **The control surface IS the inbox.**

**7:00 AM (or user's chosen time) next day:**
- Trust C — drafts saved to Gmail Drafts folder. Morning digest: *"5 drafts in your Gmail folder."*
- Trust B — 15-min preview window after digest, then send. *"About to send"* email at T-15.
- Trust A — sends immediately. Post-send digest: *"Sent 5. Morgan Stanley already replied."*

### Real-time loop (Watcher, every 15 min)

Poll Gmail for replies to our message-ids → advance stage → extract deal mentions → trigger follow-up drafts → push notification to user on reply.

### Weekly loop (Sunday 4 PM user-local)

Claude generates recap email per user. `/recap` page ships as IB-flavored mock for v1; the email goes out real.

### UI surfaces

- `/` landing (cofounder's IB copy, already shipped)
- `/today` (new, critical path — drafts, trust level, override buttons)
- `/agents` (new, transparency — per-agent recent runs + flywheel releases tile)
- `/profile` (cofounder's — now backs onboarding)
- `/network` (cofounder's archipelago — now real-data-backed)
- `/pipeline` (cofounder's — now real-data-backed)
- `/crm` (cofounder's 7-stage kanban — now real-data-backed)
- `/quests`, `/recap`, `/cohort`, `/leaderboard` — cofounder's IB-flavored mocks ship as-is for v1, wire post-launch

---

## 3. Agent architecture

Six services. Each has distinct prompt, data scope, tools, signal stream, learning curve.

### 3.1 Planner — `services/agents/planner.ts`

Deterministic orchestrator, not an LLM call. Triggered by Vercel Cron (every 15 min; per-user send-time gates invocation) and events (reply detected by Watcher, user command).

Logic per user per tick:
1. Load state: trust level, pending drafts, active threads, last run timestamps, Curator flags.
2. If pending drafts > 3: skip Researcher (queue full). Else: dispatch Researcher for (5 − pending) new candidates.
3. For each (candidate from Researcher) + (thread flagged `needs_followup` by Watcher): dispatch Correspondent to draft.
4. For each draft from Correspondent: dispatch Critic. Rejection loop, max 3 iterations. Unresolvable → escalate to Planner → return to Researcher for swap/enrichment.
5. Trust-level gating: C → save to Gmail Drafts. B → schedule preview window. A → send immediately.
6. Night preview (9 PM local) with plain-English overrides.
7. Log entire run to `agent_runs`.

### 3.2 Researcher — `services/agents/researcher.ts`

**System prompt:** *"You are a recruiting researcher for an IB-bound college sophomore. Find bankers the student should contact next. Rank by (a) response-rate likelihood from our data, (b) seniority × group relevance, (c) warmth vectors (same school, same club, shared city, shared connection path), (d) thread gap — don't over-saturate one bank."*

**Tools:** `queryBankerDB`, `scoreBankerFit` (Claude), `scrapeSerper`, `enrichHunter`, `logSignal`.

**Inputs:** `{ userId, targetFirms, targetGroups, warmHints, activeThreadCount, needed }`.

**Outputs:** `{ candidates: [{ bankerId, firmId, groupId, warmth, reasonToContact, priority }] }` written to `researcher_outputs`.

**Learns from:** `banker_response_rate`, `group_activity_tier`, `user_cohort_pattern_match` — weights refreshed weekly.

**Rejection handler:** receives bubbled-up Correspondent-Critic rejections, either dispatches enrichment sub-task (LinkedIn re-scrape, Hunter retry, deal lookup) and re-offers, or swaps candidate and moves on.

### 3.3 Correspondent — `services/agents/correspondent.ts`

**System prompt:** *"You are writing as a 20-year-old Rice/Brown sophomore reaching out to an IB professional. Sound like them, not like AI. No em-dashes, no 'I hope this email finds you well', no 'cognizant/leverage/endeavor'. Their voice is: [user.storyOneLiner]. They're targeting: [user.targetGroups]. This banker's context: [banker.context + commonGround]."*

**Tools:**
- `findCommonGround(user, banker)` — Claude call. Reads user's full profile (resume, clubs, hometown, story, hobbies, coursework) and banker's deep profile (education, past positions, about, recent posts, deals). Returns 2-3 ranked overlaps.
- `getBankerContext(bankerId)` — firm, group, recent deals, recent LinkedIn activity
- `getUserVoice(userId)` — resume story + previously-sent drafts
- `draftColdEmail(banker, user, commonGround)` — Claude
- `draftFollowUp(banker, user, thread, daysSilent)` — Claude
- `draftReply(thread, incomingMessage)` — Claude
- `guardrails(draft)` — post-process regex + lint
- `logSignal`

**Inputs:** `{ userId, type: 'cold' | 'followup' | 'reply' | 'thank_you', targetBankerId, threadContext? }`.

**Outputs:** `{ draftId, subject, body, channel, guardrailFlags }` → `drafts` table status = `pending_critic`.

**Rejection path:** if `findCommonGround` returns nothing high-confidence, Correspondent rejects the banker candidate back to Researcher (no attempt at drafting).

**Learns from:** `opener_conversion_rate` — weekly batch reweights template library.

### 3.4 Critic — `services/agents/critic.ts`

**System prompt:** *"You are a recruiting VP reviewing a cold email before it goes out. Grade 4 axes — Specificity (real, verifiable banker context), Voice match (sounds like a 20-year-old sophomore), Guardrails (no em-dashes, no banned words, appropriate length, correct sign-off), Shared-ground anchor (genuine connection or generic?). Any axis < 7/10 → reject with surgical feedback. Don't be nice — be the reviewer these students need."*

**Tools:** Claude call for scoring, DB lookups to verify claims (does claimed shared club actually exist on user profile? Does cited deal exist in `banker_deals`?).

**Inputs:** draft from Correspondent.

**Outputs:** `{ verdict, scores, feedback, suggested_revision? }` → `critic_reviews` table.

**Rejection loop:** feedback → Correspondent redrafts → re-review. Max 3 iterations; then escalate to Planner → Researcher for candidate swap.

**Graded by ground truth:** every approved draft carries its Critic scorecard; Watcher captures reply outcome; weekly batch computes reply-rate-per-Critic-score-bucket and per-axis correlation. Miscalibrated axes get rubric updates.

### 3.5 Watcher — `services/agents/watcher.ts`

**System prompt:** *"You read the user's inbox. For each new message in our tracked thread-scope, classify reply intent (interested / polite no / silent-adjacent / request-time / off-topic / referral-offer / delete-me) and extract structured signals (deal mention, bank mention, date proposal, referral, group name, seniority hint)."*

**Tools:** `pollGmail`, `matchThread`, `classifyIntent` (Claude), `extractSignals` (Claude), `updateConnectionStage`, `triggerCorrespondent`, `notifyUser`, `logSignal`.

**Inputs:** `{ userId, since: lastPollTimestamp }`.

**Outputs:** mutations to `connections`, `events`, `signals`; draft requests enqueued for Correspondent.

**Meta-inbox handling:** also parses Alma's own night-preview replies (PREVIEW / LATER 10 / SKIP / MORE 3 / plain-English). Updates `trust_levels` tomorrow-override fields.

**Learns from:** v1 uses hand-tuned prompts. Post-launch: reply-pattern → eventual-coffee correlation drives intent classifier weights.

### 3.6 Curator — `services/agents/curator.ts`

**24/7 background worker.** Runs independent of user activity. Makes Alma's data asset a live moat instead of a frozen snapshot.

**Responsibilities:**
1. Enrichment backfill — find bankers missing LinkedIn/email/deals, queue Proxycurl/Hunter/deal-source queries.
2. Freshness — re-scrape profiles > 60 days old.
3. Discovery — scan target firms for new bankers (job changes, new hires on LinkedIn).
4. Dedup + integrity — merge duplicates, resolve email/domain mismatches.
5. Weekly quality audit — flag low-confidence rows, report coverage gaps to Planner.
6. Signal extraction from cold sources — press releases, Mergermarket, deal announcements → `banker_deals`.
7. User profile refresh — for LinkedIn-connected users, detect profile changes; on resume re-upload, re-parse and diff.
8. Flywheel health — read `signals`, identify data gaps, propose improvements.

**Schema-level authority:** Curator can propose DDL changes (new columns, tables, indexes, archival of stale structures) via `schema_proposals` table. V1 ships with all proposals requiring admin (Dremix) approval via a simple review UI — no autonomous DDL for launch. Post-launch decision on when to graduate to autonomous execution (candidate criteria: ≥ 20 proposals with ≥ 95% approval rate, zero destructive missteps) — tracked via a `schema_changes` log when it eventually lands.

**Cadence:**
- Hot tasks every 30 min (enrichment backfill, new-banker discovery)
- Daily deep sweeps (freshness, signal extraction from cold sources)
- Weekly quality audits (dedup pass, coverage gap reports, flywheel health)

### Non-trivial inter-agent handoffs

- Correspondent ↔ Critic: draft review rejection loop (max 3).
- Critic → Researcher: unresolvable candidate escalation.
- Watcher → Correspondent: response drafts triggered by reply detection.
- Curator → Planner: data-gap flags that change dispatch priorities.
- All agents → `signals`: flywheel write target.

### Data flywheel

Every agent writes signals. Weekly Sunday 11 PM batch aggregates:
- `banker_response_rate` → Researcher input
- `opener_conversion_rate` → Correspondent template weights
- `group_activity_tier` → Researcher priority
- `user_cohort_pattern_match` → new-user warm-start
- `critic_calibration` → per-axis reply-rate correlation, drives Critic prompt updates

Each release writes a `flywheel_releases` row. `/agents` surfaces it as a "what changed this week" tile. **First release ships by 2026-04-27.**

---

## 4. Data model

Supabase Postgres. RLS on everything; user-scoped tables enforce owner-only; global-reference tables (firms, groups, bankers, banker_profiles, banker_deals, scoring_weights, critic_calibration, flywheel_releases) are readable by auth'd users but writable only by service role.

### Migration 003 — `alma_ib_schema.sql`

- **Bank hierarchy:** `firms` (id, name, tier, logo_url, domain, hq_city), `groups` (id, firm_id, name, kind, parent_group_id), `bankers` (id, firm_id, group_id, name, title, seniority, grad_year, university, linkedin_url, email, email_verified, source)
- **LinkedIn enrichment:** `banker_profiles` (banker_id, education, past_positions, about_section, recent_posts, recent_deals_mentioned, volunteering, languages, certifications, interests, scraped_at, scrape_source)
- **Deal tracker:** `banker_deals` (id, banker_id, deal_name, target, acquirer, value_usd, closed_on, description, source, confidence)
- **User profile extensions:** `profiles` gains `target_firms`, `target_groups`, `warm_hints`, `story_one_liner`, `gmail_refresh_token_encrypted`, `gmail_scopes`, `gmail_connected_at`
- **Connections extended:** adds `banker_id`, `warmth`, 7-stage `stage`, `last_send_message_id`, `thread_id`, `silence_days`, `needs_followup`
- **Trust state:** `trust_levels` (user_id, send_new_email C|B|A, send_followup C|B|A, send_reply C|B|A, approvals_count, stops_count, auto_graduate, preferred_send_time, preferred_timezone, night_preview_enabled)

### Migration 004 — `alma_agents_flywheel.sql`

- **Agent activity:** `agent_runs` (id, user_id, agent, triggered_by, input_summary, output_summary, duration_ms, claude_tokens_used, started_at, ended_at)
- **Drafts:** `drafts` (id, user_id, banker_id, connection_id, type, subject, body, guardrail_flags, status, iteration_count, critic_review_id, sent_at, sent_message_id)
- **Critic reviews:** `critic_reviews` (id, draft_id, scores, overall_score, verdict, feedback, suggested_revision)
- **Signals + flywheel:** `signals` (id, user_id, banker_id, connection_id, draft_id, agent, signal_type, metadata, occurred_at), `scoring_weights` (id, version, weights, is_active), `critic_calibration` (id, version, bucket_stats, axis_correlations, notes), `flywheel_releases` (id, week_of, headline, changes, scoring_weights_version, critic_calibration_version)
- **Schema proposals (Curator):** `schema_proposals` (id, proposed_by, change_type, sql, rationale, status: pending|approved|rejected|executed, reviewed_by, reviewed_at, executed_at), `schema_changes` log

Exact column types and FKs are owned by Dremix (user said: "u own the data"). Curator agent has implicit authority to propose further schema extensions as new data patterns emerge.

---

## 5. Integrations

### Gmail OAuth

- Google Cloud OAuth consent screen, app in **Testing mode** (up to 100 users, no verification needed — sufficient for launch + YC)
- Scopes: `gmail.send`, `gmail.readonly`, `gmail.modify` (for labeling)
- `services/gmail/oauth.ts` — authorize, token refresh, token encryption at rest via Supabase vault
- `services/gmail/send.ts` — send email, capture `Message-ID` header for thread matching
- `services/gmail/poll.ts` — query labeled threads since timestamp, paginate
- `services/gmail/thread-match.ts` — reply → original send via In-Reply-To / References headers
- **Post-YC:** move to Production mode, submit for OAuth verification (required for > 100 users)

### Hunter.io

- Starter plan, batch mode (`domain-search` for bulk + `email-finder` per banker)
- `services/hunter/enrich.ts` — given `(name, domain)` return `(email, confidence, pattern)`
- Cache in Supabase (never re-bill for same name+domain)
- Budget monitor: Curator pauses enrichment if monthly credit threshold breached

### Proxycurl (or equivalent — Nubela, Coresignal, PDL)

- Pay-as-you-go to start ($0.01-0.10 per profile)
- `services/linkedin/proxycurl.ts` — given LinkedIn URL, return structured profile
- Cache in `banker_profiles` table
- 60-day re-scrape cadence via Curator

### Vercel Cron

- One cron every 15 min: `/api/cron/tick` — runs Planner + Watcher gates
- One cron daily 11 AM UTC: `/api/cron/daily-sweep` — Curator deep sweep
- One cron Sunday 11 PM UTC: `/api/cron/weekly-flywheel` — batch aggregate + flywheel release
- One cron every 30 min: `/api/cron/curator-hot` — Curator enrichment backfill

All crons protected by bearer token. Each cron writes a run record for observability.

---

## 6. Trust gradient state machine

Per-user, per-capability. Capabilities: `send_new_email`, `send_followup`, `send_reply`. Each independently at level C / B / A.

- **Default on signup:** all capabilities at C.
- **Auto-graduation (if `auto_graduate = true`):** 5 approvals (user didn't skip or edit before send) graduates C → B; 10 more approvals at B (where user didn't hit STOP during preview window) graduates B → A.
- **Auto-demotion:** any STOP reply during B's preview window, or any user-initiated trust-down toggle, drops level. One-way demotions respected for 7 days before re-eligibility.
- **Manual override:** user can set any capability to any level from `/today` → settings. Overrides auto-graduation until manually re-enabled.
- **Night-preview overrides:** one-time settings adjustment for tomorrow only, parsed from Alma-reply email (PREVIEW / LATER / SKIP / MORE / plain-English).

---

## 7. Delivery plan (48h)

### Pre-flight (tonight, 2026-04-23)

- Pull `origin/main` to local
- Sign up: Hunter.io (Starter $49/mo), Proxycurl ($10 prepaid), Vercel Cron (free), Google Cloud OAuth (Testing mode)
- Budget envelope: ~$100 across APIs for launch + first week

### Day 1 — 2026-04-24 (Dremix, backend)

- **Morning:** Migration 003 + seed `firms`/`groups` from cofounder's BB/EB/MM list. Gmail OAuth integration. Hunter.io + Proxycurl clients.
- **Afternoon:** Pre-launch data seeding pass — batch enrich ~500-900 bankers across 30 banks × 10 groups × 3 seniority tiers. Resume parser upgrade (Opus 4.7 + club list + verification UI).
- **Evening:** Researcher agent. Correspondent agent with `findCommonGround`. IB-specific prompts + guardrails.

### Day 2 — 2026-04-25 (Dremix + cofounder)

- **Morning (Dremix):** Critic agent + rejection loop. Watcher agent + Gmail poll + intent classifier. Planner + Vercel Cron wiring. Trust-level state machine + night-preview email loop. Curator agent (enrichment backfill + schema_proposals framework).
- **Afternoon (Dremix):** Migration 004. `/today` page. `/agents` page. Wire `/network` + `/pipeline` + `/crm` to real data.
- **Evening (both):** QA on founder accounts. Launch posts queued. **5-10 target users DM'd personally** from finance clubs / sidechats / LinkedIn before midnight.

### Cofounder (parallel, over same 48h)

- Merge any frontend gaps surfaced during wiring
- Launch copy: Sidechat posts, LinkedIn announcement, finance-club Slack templates
- YC application pieces owned by cofounder: founder story, "why Rice + Brown", demo video script
- Drive user recruiting on launch day

### Week 1 post-launch (2026-04-26 → 2026-04-30)

- **Sun 2026-04-27, 11 PM:** First flywheel batch runs, produces first `flywheel_release` with real signal data
- **Mon 2026-04-28:** YC app polished with real numbers (signups, sends, replies, first critic calibration)
- **Thu 2026-04-30:** **YC application submitted** with live traction + 2-minute demo video

### Risks + mitigations

| Risk | Mitigation |
|---|---|
| Gmail sensitive-scope verification | Stays in Testing mode (≤ 100 users) for launch + YC. Verification submitted post-YC. |
| Hunter/Proxycurl credit burn | Curator throttles if > $20/day. Daily spend monitor. |
| Zero users on launch day | Pre-curated target list of ~60 known recruiters at Rice + Brown. Personal DMs, not broadcast. |
| Critic over-rejecting | If > 50% first-48h rejection rate, drop threshold; re-tune after day 3 data. |
| Reply-detection false positives | Start conservative (in-thread only). Loosen after day 3 review. |

---

## 8. YC narrative

**One-liner:** *Alma is the AI recruiting team that runs IB networking for Rice and Brown sophomores while they study.*

**Problem (30 sec):** IB recruiting eats sophomore year. 120 networking calls, 40 banks, a calendar nobody gives you, and one bad email from your real address can torpedo the year. Students grind and burn out, or don't play and lose before they start.

**Solution (60 sec):** Six AI agents. Five serve the student live — Planner orchestrates, Researcher finds the right bankers, Correspondent writes in the student's voice using verified common ground, Critic reviews every draft before send, Watcher reads the inbox and advances the pipeline. One agent — Curator — works 24/7 on the data asset: finding new bankers, refreshing profiles, extracting deals. Student connects Gmail, answers 3 questions, picks a trust level (C/B/A), Alma runs the loop. Every call sharpens the system; the 100th user benefits from the first 99's inbox signal.

**Wedge → expansion:** IB at Rice + Brown first. Same agent pattern extends to consulting, law, tech NG, residency match. We become the *AI recruiting team* platform for every professional pipeline where networking is the gate.

**Why us:** Two founders — Rice (Dremix) and Brown (cofounder). We've lived this recruiting cycle. Schools we're building for are our own. Won a hackathon on v1. Career services partnerships in motion with our own universities.

**Traction (by submission):** X signups, Y emails sent, Z replies detected, 1 published flywheel release showing real learning from real data in week 1.

**Ask:** Standard YC — funding, partner wisdom on scaling from IB to the next pipeline, network to unlock university alumni directory partnerships beyond Rice and Brown.

---

## 9. Glossary

- **Bulge Bracket (BB):** GS, MS, JPM, Citi, BofA, Barclays, DB, UBS.
- **Elite Boutique (EB):** Evercore, Centerview, Lazard, Moelis, PJT, Perella, Guggenheim, Greenhill.
- **Middle Market (MM):** Jefferies, Houlihan Lokey, William Blair, Raymond James, Piper Sandler, Stifel.
- **Coverage group:** TMT, Healthcare, Consumer, Industrials, FIG, Energy, Real Estate, Sponsors.
- **Product group:** M&A, LevFin, Restructuring, ECM, DCM.
- **SA:** Summer Analyst.
- **SA2028:** Summer 2028 analyst position (class of '29's junior-summer internship).
- **Superday:** final-round interview event (half-day of back-to-back interviews).
- **Warmth score:** 0-100 signal of connection strength between user and banker (same school, same club, shared city, shared interests).
- **Trust gradient:** C (copilot, drafts only) → B (preview-veto) → A (autopilot). Per-user, per-capability.
- **Flywheel release:** weekly batch-computed update to scoring weights + calibration, published with a "what changed" summary.

---

## Appendix — Existing code reuse map

| Existing file | Reused for | Modification |
|---|---|---|
| `services/claude.ts` | All agent Claude calls | None; existing cache useful |
| `services/sanitize.ts` | Prompt sanitization | None |
| `services/resume-parser.ts` | Onboarding step 2 | Upgrade to Opus 4.7, add club list, post-parse UI |
| `services/linkedin-search.ts` | Researcher fallback tool | Wrap in Researcher, same functionality |
| `services/linkedin-profile-scraper.ts` | Researcher user enrichment tool | Same, Researcher integrates |
| `services/alumni-engine.ts` warmth scoring | Moves into Researcher `scoreBankerFit` | Logic copied, function re-homed |
| `services/outreach-writer.ts` | Correspondent prompts base | Rewritten for IB voice + guardrails |
| `services/cold-outreach.ts` | Stub out; not needed | Remove from active code |
| `services/company-matcher.ts` | Replaced by Researcher logic | Remove or archive |
| Cofounder's `/network`, `/pipeline`, `/crm` pages | Real-data-backed | Wire to new tables |
| Cofounder's `/`, `/quests`, `/recap`, `/cohort`, `/leaderboard` | Ship as-is for v1 | IB-flavored mocks stay mock |
