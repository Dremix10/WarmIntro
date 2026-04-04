# WarmIntro — AI-Powered Recruiting Relationship Engine

## What this is

WarmIntro is a hackathon project (Y-Claude Combinator, April 2026). It transforms job searching from cold applications into a strategic networking pipeline with gamified progress tracking. Target: Rice University students seeking internships.

**Core flow:** Resume upload → Claude parses profile → 30+ companies/internships load (ranked by alumni connections) → user picks favorites → system finds alumni from user's university at those companies → Claude drafts personalized outreach → funnel dashboard tracks pipeline progress with XP/badges/streaks.

**The differentiator is the funnel math:** 100 outreach → 30 replies → 15 coffees → 6 referrals → 3 interviews → 1 offer. Users always know where they stand.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Claude API (claude-sonnet-4-20250514) for all AI features
- JSON seed files for data (NO database)
- In-memory state (NO persistence layer for MVP)

## Two-dev architecture — CRITICAL

This project has TWO developers working simultaneously with Claude Code. To prevent merge conflicts, the codebase is split by directory ownership:

**Dev A owns:** `src/app/api/`, `src/services/`, `src/data/`
**Dev B owns:** `src/app/` (pages only, NOT api routes), `src/components/`, `src/hooks/`
**Shared (frozen):** `src/shared/` — do NOT modify after initial setup

### Rules you MUST follow:
1. NEVER create or edit files outside your assigned directories
2. NEVER modify anything in `src/shared/` — types and constants are frozen
3. If you need something from the other dev's domain, use the API contract defined in `src/shared/types.ts`
4. All communication between frontend and backend goes through the API routes

## API contract
POST /api/parse-resume      → ParseResumeRequest / ParseResumeResponse
POST /api/find-companies    → FindCompaniesRequest / FindCompaniesResponse
POST /api/find-alumni       → FindAlumniRequest / FindAlumniResponse
POST /api/generate-outreach → GenerateOutreachRequest / GenerateOutreachResponse
POST /api/update-funnel     → UpdateFunnelRequest / UpdateFunnelResponse

All request/response types are in `src/shared/types.ts`. Do not add fields without coordinating.

## Project structure
warmintro/
├── CLAUDE.md
├── src/
│   ├── shared/                    ← FROZEN
│   │   ├── types.ts
│   │   └── constants.ts
│   ├── services/                  ← Dev A only
│   │   └── CLAUDE.md
│   ├── data/                      ← Dev A only
│   ├── hooks/                     ← Dev B only
│   ├── components/                ← Dev B only
│   └── app/
│       ├── CLAUDE.md              ← Dev B instructions (frontend)
│       ├── page.tsx               ← Landing
│       ├── profile/page.tsx
│       ├── companies/page.tsx
│       ├── pipeline/page.tsx
│       ├── outreach/[id]/page.tsx
│       └── api/
│           ├── CLAUDE.md          ← Dev A instructions (backend)
│           ├── parse-resume/route.ts
│           ├── find-companies/route.ts
│           ├── find-alumni/route.ts
│           ├── generate-outreach/route.ts
│           └── update-funnel/route.ts

## Coding conventions

- TypeScript strict mode, no `any` types
- Named exports, not default exports
- File naming: kebab-case for utilities, PascalCase for React components
- Keep files under 200 lines
- Error handling: try/catch, never silent failures

## Key domain terms

- **Warm path**: the connection chain between a user and an alumni
- **Warmth score**: 0-100 rating of connection strength
- **Funnel stage**: one of 5 pipeline stages (Outreach → Coffee Chat → Referral → Interview → Offer)
- **XP**: experience points for networking actions

## Demo golden path

1. Paste resume → profile appears
2. Pick "Automotive" → 30+ companies load sorted by alumni count
3. Select 5 companies → funnel dashboard with pipeline math
4. Click Tesla → see Rice alumni, Sarah Chen is strongest match
5. Draft outreach → personalized email + LinkedIn message
6. Copy + mark sent → funnel updates, +10 XP, badge pops
