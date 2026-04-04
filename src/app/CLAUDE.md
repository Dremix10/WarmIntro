# Dev B — Frontend, Components, Pages, and UX

You are working on the FRONTEND of WarmIntro. You own `src/app/` (pages only, NOT api routes), `src/components/`, and `src/hooks/`.

## Your boundaries

- ONLY create/edit files in: `src/app/` pages (page.tsx, layout.tsx), `src/components/`, `src/hooks/`
- NEVER touch: `src/app/api/`, `src/services/`, `src/data/`, `src/shared/`
- Your teammate (Dev A) builds the backend. You call his endpoints via `useApi.ts`.

## Pages
src/app/page.tsx                 → Landing: resume upload + university selector
src/app/profile/page.tsx         → Parsed resume review + industry picker
src/app/companies/page.tsx       → Grid of 30+ companies (selectable)
src/app/pipeline/page.tsx        → Funnel dashboard + gamification ⭐ THE STAR
src/app/outreach/[id]/page.tsx   → Company detail: alumni list + outreach drafts

## Components — Build in this order

ResumeUpload.tsx       → Textarea paste. Submit calls /api/parse-resume
ProfileCard.tsx        → Shows parsed name, skills, experience, targets
CompanyCard.tsx         → Company name, industry, match score, alumni badge
AlumniBadge.tsx         → "8 Rice alumni" badge
InternshipGrid.tsx      → Selectable grid of CompanyCards with checkboxes
AlumniList.tsx          → Alumni at company with warm path narratives
OutreachDraft.tsx       → Email/LinkedIn preview, editable, COPY BUTTON, "mark as sent"
FunnelDashboard.tsx     → 5-stage pipeline visualization with progress bars
FunnelStage.tsx         → Single stage: icon, name, count/target, progress bar, conversion %
StepTracker.tsx         → Per-company: Contact → Draft → Send → Follow up
XPBar.tsx               → XP progress bar with level name
StreakCounter.tsx        → "3 day streak"
AchievementBadge.tsx    → Badge with pop-in animation


## CRITICAL: Start with mock data

Do NOT wait for backend. Build with mocks first. In useApi.ts:
```typescript
const USE_MOCKS = true; // flip false when backend ready

export async function parseResume(req: ParseResumeRequest): Promise<ParseResumeResponse> {
  if (USE_MOCKS) {
    await new Promise(r => setTimeout(r, 800));
    return { profile: MOCK_PROFILE };
  }
  const res = await fetch("/api/parse-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return res.json();
}
```

## Funnel math (for FunnelDashboard)
Stage 1: Initial Outreach → Target: 100 → 30% → 30 replies
Stage 2: Coffee Chat      → Target: 30  → 50% → 15 chats
Stage 3: Warm Referral     → Target: 15  → 40% → 6 referrals
Stage 4: Interview         → Target: 6   → 50% → 3 interviews
Stage 5: Offer             → Target: 3   → 33% → 1 offer

## Styling

- Tailwind only. Emerald for primary, slate for neutrals, amber for streaks.
- rounded-xl cards, shadow-sm default, shadow-md on hover
- animate-pulse skeletons for loading states
- Confetti on first outreach sent (CSS animation, no library)

## Page routing

1. `/` → upload resume → redirect `/profile`
2. `/profile` → show profile + pick industry → redirect `/companies`
3. `/companies` → select favorites → redirect `/pipeline`
4. `/pipeline` → funnel hub → click company → `/outreach/[id]`
5. `/outreach/[id]` → draft + send → back to `/pipeline`

Use React Context or zustand for state. NOT localStorage.
