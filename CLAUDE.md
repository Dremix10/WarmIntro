# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Alma** (formerly WarmIntro) transforms investment banking recruiting from cold applications into a strategic networking pipeline with gamified progress tracking. Target: Brown and Rice University students breaking into IB (Bulge Bracket, Elite Boutique, Middle Market). Cofounders: one Brown student, one Rice student. Currently applying to YC (spring 2026 cycle) — scope narrowed to IB to ship something deep rather than wide.

**Core flow:** Resume upload → Claude parses profile → 30+ companies ranked by alumni connections → user picks favorites → system finds alumni at those companies → Claude drafts personalized outreach → funnel dashboard tracks pipeline with XP/badges/streaks.

**The IB funnel math:** 120 networking calls → 40 responses → 20 coffees → 8 referrals → 4 first rounds → 2 superdays → 1 offer. Consistency over sixteen weeks (~8 calls/week), not hero days.

**Product voice:** Alma means *leap* in Greek. The app is framed as a friend and mentor — calm, optimistic, professional × personal. Mentor quotes live in italic Fraunces. The CRM is also surfaced as an archipelago of islands (one per company) where every connection is a construction stage (logs → foundation → walls → roof → home). See `FRONTEND_HANDOFF.md` for the complete visual system and `BACKEND_REQUESTS.md` for the current backlog.

## Canonical docs (read these before starting new work)

- **Design spec:** `docs/superpowers/specs/2026-04-23-alma-ib-agent-design.md` — the agreed architecture for the IB wedge and the 6-agent system (Planner, Researcher, Correspondent, Critic, Watcher, Curator). Scope, user flow, agent prompts+tools+I/O, data model, integrations, delivery plan, YC narrative.
- **Brainstorm that produced the spec:** `docs/superpowers/brainstorm/2026-04-23-alma-ib-brainstorm.md` — decisions chronologically with rationale. Useful when you need to understand *why* something is the way it is.
- **Backend handoff for frontend cofounder:** `BACKEND_HANDOFF.md` — what the backend exposes (tables, endpoints, OAuth flow, agent behavior), what wiring is still needed on the UI side.
- **Frontend handoff for backend cofounder:** `FRONTEND_HANDOFF.md` — what the frontend renders and what it expects from the backend.
- **Backlog:** `BACKEND_REQUESTS.md` — running list of backend asks surfaced from frontend work.

## The 6 agents (canonical — see spec Section 3)

1. **Planner** (`src/services/agents/planner.ts`) — deterministic orchestrator, not an LLM call
2. **Researcher** (`src/services/agents/researcher.ts`) — finds + ranks bankers
3. **Correspondent** (`src/services/agents/correspondent.ts`) — drafts emails (cold / followup / reply / thank_you) with `findCommonGround` tool
4. **Critic** (`src/services/agents/critic.ts`) — reviews every draft before send; 4-axis scoring; reject/revise loop max 3 iterations
5. **Watcher** (`src/services/agents/watcher.ts`) — polls Gmail, classifies reply intent, advances stages
6. **Curator** (`src/services/agents/curator.ts`) — 24/7 background data steward; schema-proposal authority

Shared utilities in `src/services/agents/shared.ts`.

## Commands

```bash
npm run dev          # Start dev server (Next.js + Turbopack)
npm run build        # Production build (also runs TypeScript checks)
npm run lint         # ESLint (Next.js core-web-vitals + TypeScript)
npx tsc --noEmit     # Type-check only (no tests configured yet)
```

## Environment variables

Requires `.env.local` with:
- `ANTHROPIC_API_KEY` — Claude API key (used by `src/services/claude.ts`)
- `SERPER_API_KEY` — Google Serper fallback for LinkedIn search (gracefully degrades if missing)
- `HUNTER_API_KEY` — Hunter.io email enrichment (Curator + Researcher; gracefully degrades)
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` — Gmail OAuth (send + readonly + modify scopes)
- `ALMA_CRON_SECRET` — bearer token protecting `/api/cron/*` endpoints
- `SUPABASE_SERVICE_ROLE_KEY` — used server-side for service-role writes (bankers, signals, flywheel tables)

Every service reads its env key with a graceful-degrade path — missing keys log a warning and return empty/safe defaults. The app boots without any of the optional keys.

## Architecture

### Data flow

```
Frontend (React Context)  →  useApi.ts  →  /api/* routes  →  services/*  →  Claude API / JSON data
```

- **State management:** React Context in `AppProvider.tsx` — all app state (profile, companies, funnel, game state, connections) lives here. No database; everything is in-memory and resets on server restart.
- **API client:** `src/hooks/useApi.ts` — all API calls go through `apiFetch()` helper. Has a `USE_MOCKS` flag (currently `false`) with mock data in `src/hooks/mock-data.ts` for offline development.
- **Claude integration:** `src/services/claude.ts` — single `Anthropic` client instance, model `claude-sonnet-4-20250514`. Two helpers: `askClaude()` (text) and `askClaudeJSON<T>()` (parsed JSON). In-memory cache (max 200 entries) keyed by prompt hash.
- **LinkedIn enrichment:** `src/services/linkedin-search.ts` — uses Serper API to find real LinkedIn profiles. Multiple caches (profile lookups, alumni searches, email lookups).

### Key services

| Service | Purpose | Uses Claude? |
|---|---|---|
| `resume-parser.ts` | Extract structured UserProfile from resume text (Opus 4.7, Rice+Brown club list baked in) | Yes |
| `agents/planner.ts` | Deterministic orchestrator; dispatches agents per user tick | No |
| `agents/researcher.ts` | Find + rank bankers; reuses Serper/Hunter | Yes |
| `agents/correspondent.ts` | Draft emails with `findCommonGround` tool | Yes |
| `agents/critic.ts` | Review drafts; 4-axis score; reject/revise loop | Yes |
| `agents/watcher.ts` | Poll Gmail, classify intent, extract signals | Yes |
| `agents/curator.ts` | 24/7 DB steward; enrichment + freshness + dedup + discovery | Yes |
| `gmail/*` | OAuth, send, poll, thread-match | No |
| `hunter/enrich.ts` | Email enrichment by name + domain | No |
| `linkedin/discovery.ts` | Serper-driven LinkedIn banker discovery for the Curator | No |
| `signals/{log,aggregate}.ts` | Flywheel writes + weekly batch | No |
| `guardrails.ts` | Student-voice copy linting (no em-dashes, banned words) | No |
| `linkedin-search.ts` *(legacy)* | Google Serper fallback | No |

### Legacy services (from WarmIntro era)

`alumni-engine.ts`, `cold-outreach.ts`, `outreach-writer.ts`, `people-finder.ts`, `company-matcher.ts`, `linkedin-profile-scraper.ts` — kept for backward compatibility on legacy routes. Warmth scoring logic from `alumni-engine.ts` is referenced by `agents/researcher.ts`; prompt patterns from `outreach-writer.ts` are evolved into `agents/correspondent.ts`. Legacy routes (`/api/find-alumni`, `/api/generate-outreach`, `/api/find-people`, etc.) still work but new flows should use the agents.

### Warmth scoring (alumni-engine.ts)

Base 30 + same major (+20) + grad year within 5yr (+15) or 10yr (+10) + shared clubs (+10 each, max 30) + same city (+5) + senior role (+5). Capped at 100. Constants are named (`WARMTH_BASE`, etc.).

### API routes

All 8 routes follow the same pattern: validate required fields → call service → return JSON. Errors return `{ error: string }` with status 400 (validation) or 500 (server). Types for the 5 core routes are in `src/shared/types.ts`. Three additional routes (`coaching-tip`, `generate-followup`, `summarize-recording`) define their own request/response interfaces inline.

### Caching strategy

Multiple in-process Map caches (no external cache):
- `claude.ts` — prompt responses (200 max, LRU eviction)
- `find-alumni/route.ts` — full alumni responses by company+university
- `linkedin-search.ts` — profile lookups, alumni searches, email lookups
- `coaching-tip/route.ts` — tips by stage+company+role
- `update-funnel/route.ts` — module-level funnel/game state (MVP persistence)

### Data layer

Supabase Postgres. Full schema in `supabase/migrations/`. Key tables:

**IB domain (global, public-read):** `firms`, `groups`, `bankers`, `banker_profiles`, `banker_deals`.

**User-scoped (RLS: owner only):** `profiles` (extended with `target_firms`, `target_groups`, `warm_hints`, `story_one_liner`, Gmail OAuth tokens), `connections` (7-stage IB pipeline: sent→replied→coffee→referral→first_round→superday→offer), `trust_levels` (per-capability C/B/A + preferred_send_time), `agent_runs`, `drafts`, `critic_reviews`, `signals`.

**Flywheel (public-read):** `scoring_weights`, `critic_calibration`, `flywheel_releases`.

**Curator's authority:** `schema_proposals` (admin-gated v1).

Migrations: `001_initial_schema.sql`, `002_events_table.sql`, `003_alma_ib_schema.sql`, `004_alma_agents_flywheel.sql`. Apply via Supabase MCP or dashboard.

Seed data: `src/data/` holds legacy JSON (`alumni.json`, `companies.json`, etc.) and `src/data/seed/firms-groups.ts` holds the BB/EB/MM seed used by the Curator to populate `firms` + `groups` on first run.

## Page routing

1. `/` → marketing landing (funnel math, how it works, FAQ)
2. `/profile` → review parsed profile + pick industries
3. `/companies` → select favorite companies
4. `/pipeline` → funnel hub → click company → `/outreach/[id]`
5. `/outreach/[id]` → draft + send → back to `/pipeline`
6. `/crm` → track connections (kanban + list, filter/sort)
7. `/network` → archipelago view of your network (islands + construction stages)
8. `/quests` → weekly quests + milestone feed
9. `/recap` → Sunday letter from Alma
10. `/cohort` → aggregate numbers across your class (non-competitive)
11. `/leaderboard` → class competition
12. `/design-lab/*` → reference designs for staged UI migration (see `FRONTEND_HANDOFF.md`)

## Coding conventions

- TypeScript strict mode, no `any` types
- Named exports only (no default exports)
- File naming: kebab-case for services/utilities, PascalCase for React components
- Keep files under 200 lines — extract components/modules when approaching limit
- All API routes validate required fields before processing
- Tailwind CSS palette: warm stone body (`#EAE3D2`), Aegean blue primary (`#1B3B5F` / `#2E5A88`), terracotta accent (`#C86B4F`), ochre for streaks only (`#E8B339`). `rounded-2xl` cards on cream/white, hairline borders `#D9CFB5`.
- Typography: **Fraunces** (variable serif) for display + big tabular numbers + Alma's italic mentor voice. **Geist Sans** for UI body text.

## Key domain terms

- **Warm path** — the connection narrative between user and banker (formerly alumni)
- **Warmth score** — 0-100 rating of connection strength (same school, same club, shared city, shared interests)
- **Trust gradient** — per-user, per-capability C (copilot, drafts only) → B (preview-veto) → A (autopilot). Auto-graduates via approvals, manual toggle always available.
- **Common ground** — ranked anchors the Correspondent finds between user and banker (shared_major, shared_club, shared_city, shared_hobby, banker_recent_post, banker_deal_area, shared_alma_mater)
- **Flywheel release** — weekly Sunday batch-computed update to scoring weights + critic calibration, published with a "what changed" summary
- **Funnel stage (IB)** — one of: sent → replied → coffee → referral → first_round → superday → offer (or closed_lost)
- **Coverage group** — M&A, TMT, Healthcare, Consumer, Industrials, FIG, Energy, Real Estate, Sponsors
- **Product group** — LevFin, Restructuring, ECM, DCM
- **Tier** — Bulge Bracket (BB), Elite Boutique (EB), Middle Market (MM)
- **SA2028** — Summer 2028 analyst position (class of '29 junior-summer internship; Alma's ICP targets this)
- **XP** — experience points: outreach_sent (10), reply_received (25), coffee_booked (50), referral_earned (100)

## Security

- **Auth:** Supabase Auth (email + LinkedIn OAuth). All Claude-calling API routes require authentication via Bearer token.
- **Rate limiting:** Middleware at `src/middleware.ts` — per-IP sliding window. AI routes: 10 req/min, auth routes: 5 req/min, others: 30 req/min.
- **Headers:** CSP, HSTS, X-Frame-Options, Permissions-Policy configured in `next.config.ts`.
- **RLS:** All Supabase tables have row-level security — users can only access their own data.
- **OAuth callback:** `src/app/auth/callback/route.ts` handles Supabase OAuth redirects.

## Current limitations

- In-memory rate limiting is per-serverless-instance (not globally shared). Upgrade to Upstash Redis if abuse is observed.
- Unauthenticated fallback still exists in `update-funnel/route.ts` for the transition period.
- `find-companies` route is intentionally unauthenticated (no Claude call, used before profile setup).
- Gmail OAuth app is in Google **Testing mode** for launch (≤ 100 test users, no verification required). Verification submission happens post-YC.
- Rice + Brown alumni directory access is pending (both founders have formally asked their schools). Design treats it as a bonus `ContactSource`, never a launch gate.
- Curator schema-proposal authority is admin-gated for v1 (all proposals land in `schema_proposals` as `pending` — Dremix approves manually). Autonomous execution is a post-launch decision.
- Agents ship with graceful env degradation: without `ANTHROPIC_API_KEY` / `HUNTER_API_KEY` / `SERPER_API_KEY` / Google OAuth creds, they log warnings and return safe defaults. The app boots regardless.
