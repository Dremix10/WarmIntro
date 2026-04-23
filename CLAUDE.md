# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Alma** (formerly WarmIntro) transforms investment banking recruiting from cold applications into a strategic networking pipeline with gamified progress tracking. Target: Brown and Rice University students breaking into IB (Bulge Bracket, Elite Boutique, Middle Market). Cofounders: one Brown student, one Rice student. Currently applying to YC (spring 2026 cycle) — scope narrowed to IB to ship something deep rather than wide.

**Core flow:** Resume upload → Claude parses profile → 30+ companies ranked by alumni connections → user picks favorites → system finds alumni at those companies → Claude drafts personalized outreach → funnel dashboard tracks pipeline with XP/badges/streaks.

**The IB funnel math:** 120 networking calls → 40 responses → 20 coffees → 8 referrals → 4 first rounds → 2 superdays → 1 offer. Consistency over sixteen weeks (~8 calls/week), not hero days.

**Product voice:** Alma means *leap* in Greek. The app is framed as a friend and mentor — calm, optimistic, professional × personal. Mentor quotes live in italic Fraunces. The CRM is also surfaced as an archipelago of islands (one per company) where every connection is a construction stage (logs → foundation → walls → roof → home). See `FRONTEND_HANDOFF.md` for the complete visual system and `BACKEND_REQUESTS.md` for the current backlog.

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
- `SERPER_API_KEY` — Google Serper API for LinkedIn profile lookups (gracefully degrades if missing)

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
| `resume-parser.ts` | Extract structured UserProfile from resume text | Yes |
| `company-matcher.ts` | Rank companies by skill/role match + alumni count | No (local scoring) |
| `alumni-engine.ts` | Find alumni, compute warmth scores, generate warm paths | Yes |
| `cold-outreach.ts` | Fallback when no alumni found — find real people via Serper | Yes |
| `outreach-writer.ts` | Generate personalized email + LinkedIn drafts, follow-ups | Yes |
| `linkedin-search.ts` | Find real LinkedIn profiles via Google Serper API | No |

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

No database. Seed data in `src/data/` as JSON files: `alumni.json` (Rice alumni), `companies.json` (50+ companies), `internships.json` (30+ listings), `email-domains.json` (company→domain mapping). Mock data for leaderboard in `src/data/mock-leaderboard.ts`.

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

- **Warm path** — the connection narrative between user and alumni
- **Warmth score** — 0-100 rating of connection strength
- **Funnel stage** — one of: Outreach → Coffee Chat → Referral → Interview → Offer
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
