# Dev A — Backend, API Routes, AI, and Data

You are working on the BACKEND of WarmIntro. You own `src/app/api/`, `src/services/`, and `src/data/`.

## Your boundaries

- ONLY create/edit files in: `src/app/api/`, `src/services/`, `src/data/`
- NEVER touch: `src/app/` pages (page.tsx files), `src/components/`, `src/hooks/`, `src/shared/`
- Your teammate (Dev B) builds the frontend. You communicate via the API contract in `src/shared/types.ts`.

## API Routes — Next.js Route Handlers

Each route is a `route.ts` file:
src/app/api/parse-resume/route.ts      → receives resume text, returns UserProfile
src/app/api/find-companies/route.ts    → receives industries + skills, returns ranked Company[]
src/app/api/find-alumni/route.ts       → receives companyId + university, returns Alumni[] + WarmPath[]
src/app/api/generate-outreach/route.ts → receives user + alumni context, returns OutreachDraft[]
src/app/api/update-funnel/route.ts     → receives action, returns FunnelState + GameState

## Services (src/services/)
claude.ts           → Claude API wrapper. Use @anthropic-ai/sdk. Model: claude-sonnet-4-20250514
resume-parser.ts    → Takes raw text, uses Claude to extract UserProfile
company-matcher.ts  → Loads companies.json, ranks by warmth score + match score
alumni-engine.ts    → Loads alumni.json, scores connections, generates warm paths via Claude
outreach-writer.ts  → Uses Claude to draft personalized email + LinkedIn message

## Data (src/data/)

Seed files, all JSON. No database.
- `companies.json` — 50+ companies, 6 industries, each with alumniCount
- `alumni.json` — 100+ mock Rice University alumni across those companies
- `internships.json` — 30+ internship listings
- `sample-resume.txt` — demo resume

## Claude API pattern
```typescript
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
const response = await client.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: prompt }],
});
```

## Warmth scoring algorithm

Build in alumni-engine.ts:
- Base: 30
- Same major: +20
- Graduation within 5 years: +15, within 10: +10
- Each shared club/group: +10 (max +30)
- Same city: +5
- Senior role: +5
- Cap at 100

## Performance

Cache Claude API responses by input hash. Pre-run golden path at end and save cached responses as fallback.
