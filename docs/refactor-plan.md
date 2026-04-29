# Codebase Refactor Plan

**Audience:** Other developer reviewing before we execute.
**Goal:** Modular, easier to maintain, fewer "how did this break?" surprises.
**Constraint:** Cannot break existing functionality. Land in batches with tests after each.

## Current pain (what's actually rough today)

1. **`src/app/today/page.tsx` is ~870 lines and doing too much.** DraftCard (300+ lines), RunAlmaNowButton, SendAllButton, GmailRequiredBanner, SectionShell, AnchorChip all live in one file. Inline edit, fact-check rendering, send-state machine, fade animations all interleaved. One bug in the file forces understanding all of them.
2. **`src/services/agents/`** is reasonable but `correspondent.ts` (~400 lines) bundles the prompt, the findCommonGround tool, the draft loop, and the persistence. Hard to test the prompt in isolation.
3. **`src/services/gmail/`** is small and clean — no refactor needed.
4. **API routes** under `src/app/api/` mix Next-runtime concerns + business logic. `/api/drafts/[id]/send/route.ts` is 130 lines of which 100 are business logic that could live in a service.
5. **Types** scattered: `src/shared/types.ts` (legacy WarmIntro), `src/shared/ib-types.ts` (IB pivot), `src/lib/database.types.ts` (Supabase-generated). Mostly OK, but draft-card-specific UI types live in the page file.
6. **Two conflicting connection-creation paths** — until last commit, single-send didn't insert a connection. Same business logic was implemented (slightly differently) in three places: planner autopilot, send-all batch, mark_sent. Now de-duped via DB constraint, but the *code* duplicates remain.
7. **No service layer for pipeline operations** — "advance a banker to stage X" is currently three different code paths (Watcher, manual `/api/connections/[id]/stage`, Planner sendApproved).

## Proposed structure

```
src/
├── app/                           # routes only — thin handlers
│   ├── (marketing)/               # group: landing, demo, coming-soon, privacy, terms
│   ├── (auth)/                    # group: login, forgot-password, reset-password, signup
│   ├── (app)/                     # group: today, network, crm, account, admin (gated)
│   └── api/
│       └── routes.ts              # each route ≤ 30 lines: parse → call service → respond
│
├── components/
│   ├── ui/                        # primitives (Button, Modal, Toast, etc.) — reusable
│   ├── layout/                    # NavHeader, AuthAwareLogin, SkeletonPage
│   └── feature/                   # feature-specific (DraftCard, BankerDetailPanel, ...)
│
├── services/                      # pure business logic, no Next dependencies
│   ├── agents/                    # already organized — keep as is
│   ├── pipeline/                  # NEW — connection lifecycle (create, advance, stage rules)
│   ├── outreach/                  # NEW — send a draft (Gmail + connection upsert + signal)
│   ├── auth/                      # NEW — admin allowlist, email-domain rules, gate logic
│   ├── data/                      # NEW — typed REST helpers per table (drafts, bankers, ...)
│   └── gmail/, hunter/, linkedin/  # already organized — keep as is
│
├── shared/
│   ├── types/                     # split: ib.ts, ui.ts, api.ts
│   └── constants/
│
└── lib/
    ├── auth.ts                    # request → user (existing)
    ├── supabase-rest.ts           # existing
    └── ...
```

Route handlers shrink from 100 lines to ~20:

```ts
// src/app/api/drafts/[id]/send/route.ts (refactored)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await outreach.sendDraft(ctx.user.id, id);
  return NextResponse.json(result, { status: result.ok ? 200 : (result.status ?? 500) });
}
```

The `outreach.sendDraft` service handles Gmail + connection upsert + signal logging, can be unit-tested without a Next runtime, and is the SAME function called by send-all + mark_sent + Planner autopilot. One source of truth.

## Batched execution plan

### Batch 1: extract services (no UI changes)
**~3 hrs · zero user-visible change · highest test coverage gain**

1. `services/outreach/sendDraft.ts` — pulls Gmail send + connection upsert + signal log out of `/api/drafts/[id]/send`, `/api/drafts/send-all`, `/api/drafts/[id]/mark_sent`, and `agents/planner.ts:sendApprovedDrafts`. Each becomes a thin wrapper.
2. `services/pipeline/advanceStage.ts` — pulls stage-update logic out of `/api/connections/[id]/stage` and Watcher.
3. Add unit tests: each service tested in isolation with the existing supabase-test pattern.

### Batch 2: split today/page.tsx
**~2 hrs · zero user-visible change**

1. `components/feature/DraftCard.tsx` — the card itself + sub-components (FactCheckPanel, SentToConfirmModal).
2. `components/feature/RunAlmaNowButton.tsx`, `SendAllButton.tsx`, `GmailRequiredBanner.tsx` — extracted as separate files.
3. `components/feature/TodayQueue.tsx` — orchestrator, uses the new components.
4. Page becomes a thin shell that mounts TodayQueue + Trust controls.

### Batch 3: route grouping + auth services
**~2 hrs · zero user-visible change**

1. Move pages into route groups `(marketing)`, `(auth)`, `(app)` for clearer mental model.
2. `services/auth/admin.ts` — `isAdmin(email)`, `assertAdmin(ctx)`. Replaces inline allowlist checks in /api/admin routes.
3. `services/auth/gate.ts` — testing-gate logic moved out of proxy.ts; proxy.ts becomes route ↔ tier mapping only.

### Batch 4: types tightening
**~1 hr · catches latent bugs**

1. Drop the `as never` casts left over from migration drift.
2. Re-derive UI types from DB types where possible (`type DraftRow = Tables<"drafts">`).
3. Clean up `src/shared/types.ts` — split into `ib.ts`, `ui.ts`, `api.ts`.

### Batch 5: testing infrastructure
**~3 hrs · enables safe future refactors**

1. Promote `scripts/e2e-user-journey.sh` → real test suite with vitest.
2. Add unit tests for each service from Batch 1.
3. Add integration tests for each refactored API route.
4. Wire to CI — every PR runs them.

## What we're explicitly NOT doing

- **No client-state library swap.** React state is fine for the current scale.
- **No moving away from Next.js App Router.** The DX is good, the boundaries (server vs client components) are working.
- **No abandoning Supabase.** Service-role REST is the right level of abstraction.
- **No turning the agents into a separate microservice.** They live in-process for v1.

## Questions for the reviewer

1. Comfortable with the `(app)` / `(auth)` / `(marketing)` route groups, or prefer a flatter layout?
2. Should `services/outreach/` and `services/pipeline/` share a common `services/core/` for cross-cutting helpers, or stay independent?
3. Tests in vitest + a Supabase test branch, or a separate test DB? Test branch is nicer but uses a Supabase paid feature.
4. Any DraftCard sub-component that's particularly important to keep separate? (FactCheckPanel feels like the most extractable.)

## Risks

- **Merge conflict surface area.** A refactor like this touches every file. Mitigation: do batches behind feature branches with the smallest possible PR each, merge before starting next.
- **Subtle behavior drift.** When you move 300 lines into a service, easy to subtly change a side-effect order. Mitigation: comprehensive E2E tests (Batch 5) BEFORE Batch 1.
- **Timing.** This is ~10-12 hours of focused work. We do it after the 3-day signups push and before the YC application — when there's slack time.
