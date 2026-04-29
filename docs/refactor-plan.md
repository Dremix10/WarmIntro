# Codebase Refactor Plan (v2)

> **Changelog (v2):** Added Batch 0 (perceived UX latency — buttons currently take ~1-2s),
> Batch 6 (scaling & correctness from §6 of the codebase analysis), and an updated file
> catalog reflecting commits through `39a59f9`. v1 batches 1-5 preserved (with light
> annotations where the world has moved). The recommended execution order at the end
> sequences these to land the perf wins first.

**Audience:** other developer reviewing before we execute. Plus future Claude sessions reading by path.
**Goal:** modular, easier to maintain, fewer "how did this break?" surprises. **Buttons under 500ms.**
**Constraint:** cannot break existing functionality. Land in batches with tests after each.

---

## Why now

Two pressures forced a v2:

1. **Users are reporting buttons take 1-2 seconds to respond.** Even when nothing is broken, the UX is noticeably laggy. This dominates everything else on the priority list.
2. **The repo moved.** Five new commit clusters since v1 — admin dashboard + endpoints, the `drafts.fact_check` JSONB column, Resend integration for the night-preview email, RecoveryHashRedirect for the password-reset flow, Researcher target-group relaxation. The catalog drifted; the plan should reference what's actually in the tree.

---

## Current pain

### Performance — perceived latency [NEW in v2]

**P0. Double auth lookup per request.** Middleware (`src/proxy.ts`) calls `supabase.auth.getUser()` via cookies on every request to enforce the private-beta gate. Then the route handler calls `getUser()` (`src/lib/auth.ts:54`) which calls `supabase.auth.getUser()` *again*. Two network round-trips to Supabase Auth before any business logic runs. Tax: ~200-600ms per click.

**P1. Sequential DB queries inside route handlers.** `/api/today/route.ts` runs 5 reads back-to-back (drafts, trust, signals, connections, profile). `/api/drafts/[id]/send/route.ts` runs 3 lookups before calling Gmail. None of these queries depend on each other — they should run with `Promise.all`. Free savings: ~150-400ms on most read endpoints.

**P2. No HTTP caching on read GETs.** `/api/today`, `/api/profile`, `/api/connections`, `/api/agents/runs` re-fetch on every page load. No `Cache-Control`, no SWR.

**P3. Cold starts compound everything.** Each `route.ts` is its own serverless function. First request after idle = 500-2000ms boot. The in-process caches (`claude.ts`, `linkedin-search.ts`, `proxy.ts` rate-limit map) reset on every cold start, so they don't actually help the first request — and the first request is what users feel.

**P4. No optimistic UI.** Buttons wait for the server round-trip before updating local state. Even a 250ms request feels laggy because the user sees no immediate feedback after the click.

### Structural (preserved from v1)

1. **`src/app/today/page.tsx` is now ~1118 lines** (up from ~870 in v1). DraftCard (300+ lines), RunAlmaNowButton, SendAllButton, GmailRequiredBanner, SectionShell, AnchorChip all live in one file. Inline edit, fact-check rendering, send-state machine, fade animations all interleaved. One bug forces understanding all of them.

2. **`src/services/agents/correspondent.ts` (~307 lines)** bundles the prompt, the `findCommonGround` tool, the draft loop, and the persistence. Hard to test the prompt in isolation.

3. **`src/services/gmail/`** is small and clean — no refactor needed.

4. **API routes mix Next-runtime concerns + business logic.** `/api/drafts/[id]/send/route.ts` is ~133 lines of which ~100 are business logic that could live in a service. The new `/api/admin/users/route.ts` (107 lines) and `/api/admin/users/[id]/reset-password/route.ts` (74 lines) each inline the same `isAdmin()` allowlist check — three copies now.

5. **Types still scattered:** `src/shared/types.ts` (legacy WarmIntro), `src/shared/ib-types.ts` (IB pivot), `src/lib/database.types.ts` (Supabase-generated). Draft-card-specific UI types still live in the page file.

6. ~~Two conflicting connection-creation paths~~ → **resolved** by the `(user_id, banker_id)` unique constraint plus the race-safe upsert in `/api/drafts/[id]/send/route.ts:97-121`. Code duplicates remain (planner autopilot, send-all batch, mark_sent, single-send) but no longer cause data corruption. Still worth de-duping for testability.

7. **No service layer for pipeline operations.** "Advance a banker to stage X" is still three different code paths (Watcher, manual `/api/connections/[id]/stage`, Planner `sendApprovedDrafts`).

### Scaling & correctness [NEW in v2 — from §6 of the codebase analysis]

**S1. `claude.ts` cache is mislabeled.** Calls itself "LRU" but evicts oldest *insertion*, not oldest *access*. Wrong semantics; trivial fix.

**S2. Researcher TOCTOU race.** `alreadyContactedBankerIds()` in `researcher.ts` is checked before insert; two parallel ticks can both see "no draft yet" and both create one. Migration 005's unique partial index mitigates the data corruption but pushes the failure into the error path and wastes Claude calls.

**S3. Curator dedup is O(N²).** `curator.ts:dedupBankers` does `duplicates.some(...)` inside the outer loop. Fine at seed scale; quadratic at 100k+ bankers.

**S4. Cron tick is serial + capped at 50 users.** `cron/tick/route.ts` runs Planner sequentially under a 60s function timeout. Will saturate around 50 active users.

**S5. Legacy `alumni_*` columns** still required on `connections`. Dual-written by every send path (see the `bankerRow` mapping in `/api/drafts/[id]/send/route.ts:104-110`). Should be on a deprecation track.

**S6. Four Supabase clients** (`lib/supabase-{browser,server,admin,rest}.ts`). The raw-REST one exists because of an SDK bug returning empty arrays in serverless runtimes. Verify the bug still reproduces on Next 16; collapse if fixed.

**S7. In-process rate-limit map** (`proxy.ts:45`). Per-instance only — distributed abuse bypasses it.

---

## Updated file catalog (state at `39a59f9`)

> Reference index for "where do I look?" — paste these paths when prompting Claude. `[updated]` = touched since v1; `[NEW]` = added since v1.

### API routes — `src/app/api/*/route.ts`

**Auth**
- `auth/signin/route.ts` — email + password sign-in
- `auth/signup/route.ts` — email + password sign-up
- `auth/reset-password/route.ts` — self-owned reset flow `[updated]`
- `auth/gmail/start/route.ts` — begin Gmail OAuth
- `auth/gmail/callback/route.ts` — finish Gmail OAuth

**Profile / setup**
- `profile/route.ts` — GET/POST profile
- `setup/profile/route.ts` — extended profile fields
- `setup/firms/route.ts` — target firms (also serves seed data)
- `setup/trust/route.ts` — trust prefs `[updated: send-time controls]`

**Resume / PDF**
- `parse-resume/route.ts` — text → structured profile
- `extract-pdf/route.ts` — PDF binary → text

**Drafts**
- `drafts/[id]/approve/route.ts`
- `drafts/[id]/send/route.ts` `[updated: race-safe upsert + verbose Gmail errors]`
- `drafts/[id]/skip/route.ts`
- `drafts/[id]/edit/route.ts`
- `drafts/[id]/stop/route.ts`
- `drafts/[id]/mark_sent/route.ts`
- `drafts/send-all/route.ts`

**Connections / pipeline**
- `connections/route.ts`
- `connections/[id]/stage/route.ts`

**Cron**
- `cron/tick/route.ts` `[updated]`
- `cron/daily-sweep/route.ts`
- `cron/weekly-flywheel/route.ts`
- `cron/sentinel/route.ts`
- `cron/curator-hot/route.ts`
- `cron/night-preview/route.ts` `[updated: now sends via Resend, not user's Gmail]`

**Admin** `[NEW]`
- `admin/route.ts` — legacy admin endpoint
- `admin/users/route.ts` — admin roster + per-user state
- `admin/users/[id]/reset-password/route.ts` — admin-triggered password reset

**Other**
- `today/route.ts` `[updated]`
- `coaching-tip/route.ts`
- `summarize-recording/route.ts`
- `pilot-signup/route.ts`
- `analytics/route.ts`
- `account/activity/route.ts`
- `agents/runs/route.ts`
- `companies/selected/route.ts`
- `find-companies/route.ts`
- `find-alumni/route.ts`, `find-people/route.ts` (legacy)
- `scrape-linkedin/route.ts`
- `generate-outreach/route.ts`, `generate-followup/route.ts` (legacy)
- `update-funnel/route.ts`
- `planner/run-now/route.ts`

### Agents — `src/services/agents/`

- `planner.ts` — orchestrator (deterministic, not an LLM call)
- `researcher.ts` `[updated: target_groups soft preference, URL-encoded queries, banker query fix]`
- `correspondent.ts` `[updated: career-arc framing tightening]`
- `critic.ts` `[updated: career-arc rejection, persists fact_check JSON]`
- `fact-checker.ts` `[updated: results persisted via drafts.fact_check column]`
- `watcher.ts`
- `curator.ts`
- `sentinel.ts`
- `shared.ts`

### Integrations — `src/services/`

- `claude.ts` — Anthropic wrapper
- `gmail/oauth.ts`, `gmail/send.ts` `[updated: verbose error surfacing]`, `gmail/poll.ts`, `gmail/thread-match.ts`, `gmail/tokens.ts`
- `hunter/enrich.ts`
- `linkedin/proxycurl.ts` `[updated]`

(Resend, Serper, Telegram are inline — search for their env keys.)

### Support — `src/services/`

- `resume-parser.ts`, `guardrails.ts`, `sanitize.ts`, `linkedin-search.ts` (legacy)
- `signals/log.ts`, `signals/aggregate.ts`
- Legacy: `alumni-engine.ts`, `outreach-writer.ts`, `cold-outreach.ts`, `people-finder.ts`, `company-matcher.ts`, `linkedin-profile-scraper.ts`

### Infrastructure

- `src/proxy.ts` — middleware (rate limit, bot block, beta gate)
- `src/lib/supabase-{browser,server,admin,rest}.ts` — four clients
- `src/lib/database.types.ts` `[updated]`
- `src/lib/auth.ts` — request → user
- `src/shared/{types,ib-types,ib-constants,constants}.ts`
- `src/data/seed/firms-groups.ts`

### Frontend pieces touched recently (for awareness)

- `src/app/today/page.tsx` `[updated, ~1118 LOC — refactor target]`
- `src/app/admin/page.tsx` `[NEW]`
- `src/app/reset-password/page.tsx` `[updated]`
- `src/components/RecoveryHashRedirect.tsx` `[NEW]`

### Database — `supabase/migrations/`

- `001_initial_schema.sql`
- `002_events_table.sql`
- `003_alma_ib_schema.sql`
- `004_alma_agents_flywheel.sql`
- `005_unique_active_drafts.sql`
- `006_draft_fact_check.sql` `[NEW: adds drafts.fact_check JSONB]`

---

## Proposed structure (preserved from v1)

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
│   ├── ui/                        # primitives (Button, Modal, Toast, etc.)
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
    ├── auth.ts                    # request → user (existing, restructured in Batch 0.1)
    ├── supabase-rest.ts           # existing
    └── ...
```

Route handlers shrink from ~100 lines to ~20:

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

`outreach.sendDraft` handles Gmail + connection upsert + signal logging, can be unit-tested without a Next runtime, and is the SAME function called by send-all, mark_sent, and Planner autopilot. One source of truth.

---

## Batched execution plan

### Batch 0: Performance — get clicks under 500ms `[NEW in v2]`

**~6-10 hrs · zero new features · highest perceived-UX gain. Do this BEFORE anything else.**

The user-stated #1 priority. Every other batch is academic until the app feels snappy.

**0.1 Single auth path** *(biggest single win, ~300ms median saved)*

Today: middleware verifies the session against Supabase, then the route does the same call again. Two network round-trips to Supabase Auth before any business logic.

Plan:
- Middleware verifies once.
- Sets a signed header (`x-alma-user-id` + HMAC-SHA256 using `ALMA_INTERNAL_SECRET`) on the forwarded request.
- `lib/auth.ts:getUser()` reads the header, verifies the HMAC, returns immediately. Skips the network call.
- Falls back to the old path on routes that bypass middleware (cron with bearer-token).
- Ship behind feature flag `ALMA_USE_AUTH_HEADER=true`; soak on staging for 24h before promoting.

Files: `src/proxy.ts`, `src/lib/auth.ts`, every `route.ts` (no change required if `getUser()` keeps the same signature).

**0.2 Parallelize independent reads** *(~150-300ms saved on read endpoints)*

Wrap independent queries in `Promise.all`:
- `src/app/api/today/route.ts` — 5 queries, all independent.
- `src/app/api/drafts/[id]/send/route.ts` — draft + profile + banker (3 queries).
- `src/app/api/profile/route.ts`
- `src/app/api/connections/route.ts`
- `src/app/api/admin/users/route.ts` — already uses `in()` joins; check if anything still serializes.

Pattern:
```ts
const [drafts, trust, recent, pipeline, profile] = await Promise.all([...]);
```

**0.3 HTTP cache headers on read GETs** *(repeat-load latency drops to ~50ms)*

Add `Cache-Control: private, max-age=10, stale-while-revalidate=60` on:
- `/api/today`, `/api/profile`, `/api/connections`, `/api/agents/runs`.

Browser shows cached response instantly; revalidates in background. Trade-off: data is up to 10s stale on second view. Acceptable for non-critical reads.

**0.4 Optimistic UI on action buttons** *(zero-perceived-latency for clicks)*

Approve / skip / edit / stage-move all update local React state instantly. Server confirms in background; revert with toast on failure.

Files: `src/app/today/page.tsx`, `src/app/crm/page.tsx`, `src/components/OutreachDraft.tsx`, `src/components/ConnectionCard.tsx`.

**0.5 Tighter middleware matcher**

Current matcher in `src/proxy.ts:297-299` runs middleware on virtually every path. Tighten to skip purely static routes (favicon, fonts, image manifests) — they're getting the gate-check tax for no reason.

**0.6 Cron pre-warm** *(mitigates cold-start tax during business hours)*

Cheap trick: add `cron/warm` route that pings the 4-5 hottest endpoints every 5 min (during 6am-11pm America/New_York). Keeps those functions warm so the first user click of the morning isn't a 2s cold start.

**0.7 Replace or delete in-process caches**

`claude.ts`'s "LRU" map is per-instance; cleared on every cold start; doesn't actually save anything. Either:
- Delete (cleanest), OR
- Move to Upstash Redis as a real shared cache.

Same decision for `proxy.ts` rate-limit map and `linkedin-search.ts` profile/email caches.

**Acceptance:**
- Median click latency: <500ms
- p95: <1s
- Verified via browser DevTools Network panel for the 5 most-clicked buttons (approve, send, skip, run-now, save).

---

### Batch 1: extract services (no UI changes) `[v1, preserved]`

**~3 hrs · zero user-visible change · highest test coverage gain**

1. `services/outreach/sendDraft.ts` — pulls Gmail send + connection upsert + signal log out of `/api/drafts/[id]/send`, `/api/drafts/send-all`, `/api/drafts/[id]/mark_sent`, and `agents/planner.ts:sendApprovedDrafts`. Each becomes a thin wrapper.
2. `services/pipeline/advanceStage.ts` — pulls stage-update logic out of `/api/connections/[id]/stage` and Watcher.
3. Add unit tests: each service tested in isolation with the existing supabase-test pattern.

> Note: the unique-constraint upsert work since v1 means the underlying race is fixed; this batch is now about *code* deduplication, not correctness.

---

### Batch 2: split today/page.tsx `[v1, preserved + updated]`

**~2-3 hrs · zero user-visible change**

`today/page.tsx` is now ~1118 lines (up from 870). Same plan, more pressing.

1. `components/feature/DraftCard.tsx` — the card itself + sub-components (FactCheckPanel, SentToConfirmModal, FactCheckCitations).
2. `components/feature/RunAlmaNowButton.tsx`, `SendAllButton.tsx`, `GmailRequiredBanner.tsx`, `BatchStepper.tsx`, `SendTimePicker.tsx` — extracted as separate files.
3. `components/feature/TodayQueue.tsx` — orchestrator, uses the new components.
4. Page becomes a thin shell that mounts `TodayQueue` + Trust controls.

> If Batch 0.4 (optimistic UI) lands first, do that work *inside* the new components for free.

---

### Batch 3: route grouping + auth services `[v1, preserved + updated]`

**~2 hrs · zero user-visible change**

1. Move pages into route groups `(marketing)`, `(auth)`, `(app)` for clearer mental model.
2. `services/auth/admin.ts` — `isAdmin(email)`, `assertAdmin(ctx)`. **Now consolidates 3 copies** (the new `admin/users/route.ts` + `admin/users/[id]/reset-password/route.ts` each inline the allowlist check).
3. `services/auth/gate.ts` — testing-gate logic moved out of `proxy.ts`; proxy becomes route ↔ tier mapping only.

---

### Batch 4: types tightening `[v1, preserved]`

**~1 hr · catches latent bugs**

1. Drop the `as never` casts left over from migration drift.
2. Re-derive UI types from DB types where possible (`type DraftRow = Tables<"drafts">`).
3. Clean up `src/shared/types.ts` — split into `ib.ts`, `ui.ts`, `api.ts`.
4. Type the new `drafts.fact_check` JSONB column in `database.types.ts` (currently bare `Json`).

---

### Batch 5: testing infrastructure `[v1, preserved]`

**~3 hrs · enables safe future refactors**

1. Promote `scripts/e2e-user-journey.sh` → real test suite with vitest.
2. Add unit tests for each service from Batch 1.
3. Add integration tests for each refactored API route.
4. Wire to CI — every PR runs them.

> Recommendation: do at least Batch 5 *first* so Batch 0 perf changes can be verified.

---

### Batch 6: scaling & correctness `[NEW in v2]`

**~6-8 hrs · prevents future fires. Each item ships independently.**

**6.1 Fix the "LRU" cache (or delete it).** `src/services/claude.ts`. Either implement true LRU (move-to-front on get) or delete. Since the cache is per-instance only, deletion is cleaner unless 0.7 already moved it to Redis. **30 min.**

**6.2 Researcher TOCTOU race.** `src/services/agents/researcher.ts`. Add Postgres advisory lock per `(user_id, banker_id)` before draft insert. Migration 005 fixed corruption; this stops wasted Claude calls. **1 hr.**

**6.3 Curator dedup O(N²) → O(N).** `src/services/agents/curator.ts`. Two-pass with Set-based dedup index. **30 min.**

**6.4 Cron tick fan-out.** `src/app/api/cron/tick/route.ts`. Replace serial loop with dispatcher: cron triggers fan-out function that enqueues one invocation per user. Use Vercel queue, QStash, or Inngest. **Required before user count exceeds ~50. 3-4 hrs.**

**6.5 Legacy `alumni_*` deprecation.** Three-phase migration:
- `migration 007`: backfill `alumni_id` ← `banker_id` where mismatched.
- `migration 008`: remove dual-write from all send paths.
- `migration 009`: drop the legacy columns.

Ship one per week with a soak between. **2 hrs of code, weeks of soak.**

**6.6 Verify Supabase SDK bug.** Reproduce empty-array bug on Next 16 in a one-off test. If fixed: collapse `lib/supabase-rest.ts` into `lib/supabase-admin.ts`. Otherwise: file upstream + add a comment explaining the constraint. **30 min.**

**6.7 Distributed rate limit.** `src/proxy.ts`. Move `rateLimitMap` to Upstash Redis if abuse appears. Until then, document the limitation. **1 hr if needed.**

---

## What we're explicitly NOT doing

- **No client-state library swap.** React Context is fine for current scale.
- **No moving away from Next.js App Router.** The DX is good; the boundaries (server vs client) are working.
- **No abandoning Supabase.** Service-role REST is the right level of abstraction.
- **No turning the agents into a separate microservice.** They live in-process for v1.
- **No rewriting the agent prompts.** Calibration tracking goes through the flywheel; refactor doesn't change behavior.

---

## Questions for the reviewer

(v1 questions preserved + new ones for v2 batches)

1. Comfortable with the `(app)` / `(auth)` / `(marketing)` route groups, or prefer a flatter layout?
2. Should `services/outreach/` and `services/pipeline/` share a common `services/core/` for cross-cutting helpers, or stay independent?
3. Tests in vitest + a Supabase test branch, or a separate test DB? Test branch is nicer but uses a Supabase paid feature.
4. Any DraftCard sub-component that's particularly important to keep separate? (FactCheckPanel feels like the most extractable.)
5. **[NEW]** Batch 0.1: comfortable signing `x-alma-user-id` with HMAC, or prefer to verify the JWT in middleware and pass parsed claims via headers? Both work; HMAC is simpler.
6. **[NEW]** Batch 0.7: drop the in-process caches outright, or move to Upstash Redis as a single follow-up? Redis adds $0/$10/mo depending on tier.
7. **[NEW]** Batch 6.4: which queue — Vercel native (limited), QStash (Upstash, $0 free tier), or Inngest (richer features, more setup)?
8. **[NEW]** Batch 0.3: 10s stale-while-revalidate window OK, or stricter? Affects how fast a "Send" button click reflects in the funnel counts on /today.

---

## Risks

- **Merge conflict surface area.** A refactor like this touches every file. Mitigation: one batch per feature branch, smallest possible PR each, merge before starting next.
- **Subtle behavior drift.** When you move 300 lines into a service, easy to subtly change side-effect order. Mitigation: ship Batch 5 (tests) BEFORE Batch 1.
- **Auth-header refactor (Batch 0.1) is high-blast-radius.** Get it wrong and every authenticated request fails. Mitigation: feature flag (`ALMA_USE_AUTH_HEADER`), staging soak, rollback path.
- **Optimistic UI (Batch 0.4) hides server failures.** A button "succeeding" then silently reverting is worse than a slow button that always shows truth. Mitigation: toast every revert, log the failure, don't optimistically update if the request errored once already this session.
- **Timing.** Batch 0 alone is ~6-10 hours. Whole plan is ~20-25 hours. Sequence so the user-facing wins (0.2, 0.3, 0.4) ship in week 1.

---

## Recommended order of operations

1. **Batch 5 minimal** — vitest setup + 2 smoke tests. **2 hrs.** Foundation for verifying everything else.
2. **Batch 0.2 + 0.3** — parallel queries + cache headers. **2 hrs.** Biggest no-risk win.
3. **Batch 0.4** — optimistic UI on the 4 most-clicked buttons. **2 hrs.** User-felt impact in week 1.
4. **Batch 0.1** — single auth path behind a flag. **3 hrs.** 24h staging soak before promoting.
5. **Batch 0.5 + 0.6 + 0.7** — middleware tightening + pre-warm + cache decision. **2 hrs.**
6. **Batch 1** — service extraction (`outreach/sendDraft.ts`, `pipeline/advanceStage.ts`). **3 hrs.**
7. **Batch 3** — auth services extraction (consolidates 3 copies of `isAdmin`). **2 hrs.**
8. **Batch 2** — split `today/page.tsx`. **2-3 hrs.**
9. **Batch 4** — types tightening. **1 hr.**
10. **Batch 6.1, 6.3, 6.6** — quick correctness wins. **2 hrs.**
11. **Batch 6.2** — Researcher race lock. **1 hr.**
12. **Batch 6.5** — legacy column deprecation, one migration per week.
13. **Batch 6.4** — cron fan-out, when user count crosses 30 (build the runway before you need it).
14. **Batch 6.7** — only if abuse appears.

Total: ~25 hrs over 3-4 weeks of part-time work.
