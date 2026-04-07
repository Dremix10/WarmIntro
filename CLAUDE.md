# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WarmIntro transforms job searching from cold applications into a strategic networking pipeline with gamified progress tracking. Target: Rice University students seeking internships.

**Core flow:** Resume upload → Claude parses profile → 30+ companies ranked by alumni connections → user picks favorites → system finds alumni at those companies → Claude drafts personalized outreach → funnel dashboard tracks pipeline with XP/badges/streaks.

**The funnel math:** 100 outreach → 30 replies → 15 coffees → 6 referrals → 3 interviews → 1 offer.

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

1. `/` → upload resume → `/profile`
2. `/profile` → review + pick industry → `/companies`
3. `/companies` → select favorites → `/pipeline`
4. `/pipeline` → funnel hub → click company → `/outreach/[id]`
5. `/outreach/[id]` → draft + send → back to `/pipeline`
6. `/crm` → track connections across companies (kanban view)
7. `/leaderboard` → compete with classmates

## Coding conventions

- TypeScript strict mode, no `any` types
- Named exports only (no default exports)
- File naming: kebab-case for services/utilities, PascalCase for React components
- Keep files under 200 lines — extract components/modules when approaching limit
- All API routes validate required fields before processing
- Tailwind CSS: emerald primary, slate neutrals, amber for streaks. `rounded-xl` cards, `shadow-sm` default

## Key domain terms

- **Warm path** — the connection narrative between user and alumni
- **Warmth score** — 0-100 rating of connection strength
- **Funnel stage** — one of: Outreach → Coffee Chat → Referral → Interview → Offer
- **XP** — experience points: outreach_sent (10), reply_received (25), coffee_booked (50), referral_earned (100)

## Current limitations (MVP)

- All state is in-memory — resets on server restart
- No authentication or user identity
- No rate limiting on API routes
- Module-level state in `update-funnel/route.ts` is shared across all users in the same process
