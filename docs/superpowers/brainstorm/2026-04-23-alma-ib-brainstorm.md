# Brainstorm — Alma IB pivot & YC launch

**Date:** 2026-04-23
**Participants:** Dremix (backend / Rice) + Claude
**Parallel work:** cofounder on frontend (Brown)
**Outcome:** design spec committed → `docs/superpowers/specs/2026-04-23-alma-ib-agent-design.md` → implementation immediately following

---

## Why we're here

- Won a hackathon with WarmIntro (`386cbd0`, 2026-04-04).
- Between then and 2026-04-13: 40+ commits of production hardening (Supabase auth, security audit, PDF upload, LinkedIn OAuth) + a pivot to a `/demo` lead-magnet thesis.
- Signal test result: **0 demo_sessions, 1 pilot signup ever.** The demo-as-lead-magnet thesis did not work.
- 2026-04-14 → 2026-04-22: Dremix paused commits. Cofounder joined Brown side.
- 2026-04-23: Cofounder shipped rebrand WarmIntro → Alma (`df0a59e`), then full IB niche-down (`ee452fd` / `484634b` / `75b7d25`) across landing, profile target-groups, banks (BB/EB/MM), 7-stage CRM, TimelineBanner, archipelago, all mock content.

With YC spring 2026 application due 2026-04-30 and the frontend already IB-niched, the question became: what does the backend / agent layer look like for the IB wedge, and what ships in 48 hours to launch toward YC?

## Decisions reached (chronological)

| # | Question | Decision | Key rationale |
|---|---|---|---|
| Q1 | Cofounder alignment on IB? | Yes | User confirmed. Cofounder's commits same day validated this. |
| Q2 | What does the agent DO? | (D) all-in-one: find bankers + draft + send + watch + follow-up | User wanted full orchestrated loop, not just drafting |
| Q3 | Autonomy level? | **Gradual trust C→B→A** with manual toggle | Safer than full autopilot (one bad email torpedoes a recruit); trust earned over time is a real UX primitive |
| Q4 | Email sourcing? | Hunter.io as primary engine; Rice+Brown alumni directory asks live (pending) | Don't gate launch on directory access; if it lands, it slots in as another source with provenance |
| Q5 | ICP cohort? | **Rising sophomores, class of '29, targeting SA2028** | User corrected my first guess (SA2027 is already done); sophomores have 8+ month runway and need most handholding |
| Scope | Dashboard + email agent, or just email? | **All-in-one dashboard + agent underneath** | User's strong instinct: "the biggest problem solver is the all-in-one dashboard" — fits cofounder's existing frontend |
| Voice | CV alone as input? | **No** — 3-step conversational onboarding (resume → confirm + bank chips → one-sentence "why IB") | Resume misses voice, priorities, warm connections |
| Parser | Current parser accuracy? | Upgrade to **Opus 4.7** + curated Rice/Brown club list + verification UI | Pain: buried clubs, GPA formats, leadership titles |
| Data moat | What IS the moat? | **Data flywheel** (per-banker response rates, opener conversion, group activity, cohort patterns) + directory partnerships + proprietary banker graph + trust gradient UX | Not just lists — the 100th user's match quality > the 10th's |
| Deal tracker | Skip for v1? | **Keep** — schema + seed + Watcher growth mechanism | User pushed back: "isnt the data the whole point?" |
| Daily UX | Fixed 7am cron? | **Per-user `preferred_send_time` + night-before email preview** with PREVIEW/LATER/SKIP/MORE/plain-English replies | Inbox IS the control surface. Retentive loop. |
| Multi-agent | Truly multi-agent or pipeline? | Added **Critic agent** with reject/revise loop + Correspondent↔Critic handshake + Critic-graded-by-reply-rate calibration | Real inter-agent handoff; Critic's judgment graded by ground truth |
| Data steward | How does DB stay fresh? | Added **Curator agent** — 24/7 background, enrichment/freshness/dedup/discovery, schema-proposal authority (admin-gated for v1) | User push: "database auditor that proactively is enhancing and enriching our databases 24/7, even modify schemas" |
| Interfaces | Email-only or web or iOS? | **Email primary, web for launch, iOS future-not-scheduled** | Email is the distinctive moment; IB students live in Gmail |
| Scope edge | Include interview prep? | **No — hard scope boundary.** "Alma gets you to the interview. Other tools get you through it." | WSP/WSO/TTS already own that space |
| Workflow | Next step: writing-plans skill? | User override — **skip plan, just build it** | Compress timeline; handoff doc at end |

## The 6 agents (canonical)

1. **Planner** — deterministic orchestrator (not LLM). Reads state, dispatches agents, handles trust-level gating.
2. **Researcher** — finds + ranks bankers. Tools: queryBankerDB, scrapeSerper, enrichHunter, scoreBankerFit. Learns from reply-rate signals.
3. **Correspondent** — drafts emails (cold / follow-up / reply / thank-you). New tool: `findCommonGround(user, banker)` returning 2-3 ranked anchors. Learns from opener conversion.
4. **Critic** — reviews every draft on 4 axes (specificity, voice match, guardrails, shared-ground). Reject/revise loop max 3 iterations; escalate to Planner if unresolvable. Graded by reply rate per score bucket, per axis.
5. **Watcher** — polls Gmail, classifies reply intent, extracts signals, advances stages, triggers Correspondent, handles meta-inbox (replies to Alma's night preview).
6. **Curator** — 24/7 background: enrichment backfill, freshness (60-day re-scrape), dedup, discovery, signal extraction from cold sources (press/Mergermarket), flywheel health, schema proposals (admin-gated for v1).

## Key architectural decisions

- **Claude model:** Sonnet 4 → Opus 4.7 for resume parsing; Sonnet 4 fine for agent calls (cost + latency).
- **Data model:** new migrations 003 (bank hierarchy + LinkedIn profiles + deals + trust levels) and 004 (agent runs + drafts + critic reviews + signals + flywheel + schema proposals).
- **Gmail:** Testing-mode OAuth app for launch (≤100 users, no Google verification needed). Public launch post-YC.
- **Enrichment:** Hunter.io Starter ($49/mo) for emails + Google Serper for LinkedIn discovery. (Original brainstorm picked Proxycurl for structured profile scrape; that was removed 2026-04-29 after Proxycurl shut down — we don't scrape LinkedIn pages anymore.)
- **Scheduler:** Vercel Cron — tick every 15 min, curator-hot every 30 min, daily sweep, weekly flywheel batch (Sunday 11 PM UTC).
- **Trust gradient:** per-user, per-capability (send_new_email / send_followup / send_reply). Auto-graduation C→B at 5 approvals, B→A at 10 more. Manual toggle always available.
- **Flywheel:** signals table captures everything; weekly batch computes scoring weights + critic calibration; `flywheel_releases` records each "release" with headline + diff.

## What we explicitly decided NOT to build in v1

- Telegram agent
- Calendly / scheduler integration
- Technical prep / behavioral prep tracker (hard scope boundary)
- Other verticals (consulting, law, tech, medicine) — expansion path, not launch
- New branding (Alma stays; IB is the wedge)
- Quest engine, milestone engine, cohort aggregation, pipeline trajectory history (cofounder's mocks stay mock for v1)

## User preferences captured (persist in memory)

- Trust gradient is a product primitive, not just a toggle. New agent capabilities default to C.
- Alumni directory asks are live with Rice + Brown — don't gate launch or YC claims on them.
- Email = primary control surface. Web for launch. iOS future.
- 6-agent canonical roster. Curator runs 24/7, has schema-proposal authority.

## Next

1. Implementation (this session).
2. Handoff doc for frontend cofounder.
3. YC narrative iteration with cofounder, post-build.
4. Launch 2026-04-25, YC submit 2026-04-30.
