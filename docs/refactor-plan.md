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

## Status checkpoint (decisions D1–D5 resolved)

Session worked through the decisions sequentially with security-first / no-cost / 1k-user-ready / don't-break-anything as the binding constraints. Detailed answers in the *Open decisions* section at the bottom; high-level summary here so anyone opening this doc sees current state first.

| # | Item | Decision | Commit |
|---|---|---|---|
| **D1** | Auth header refactor | **Skip.** Double `getUser()` call is defense-in-depth, not a bug. Removing the second check trades immediate session-revocation detection for a JWT-TTL window of usable stolen tokens. The ~300ms tax is acceptable; perf wins from 0.2 + 0.3 + 0.4 cover most of the gap without touching the auth boundary. | — |
| **D2** | Cache freshness | **Done.** `Cache-Control: private, max-age=0, stale-while-revalidate=300` on `/api/today`, `/api/profile`, `/api/connections`, `/api/agents/runs`. Always-fresh-on-next-nav, never-blocking paint, free at scale. | `efe1f33` |
| **D3** | In-process caches | **Done (A′).** Deleted `claude.ts` Map (was misnamed FIFO-as-LRU, ~0% hit rate at scale) and three Maps in `linkedin-search.ts`. Stripped `skipCache` from 5 callers. Kept `proxy.ts:rateLimitMap` with explicit comment documenting per-instance limitation (S7) — deleting it would weaken security; upgrade path noted. | `904a1d3` |
| **D4** | Cron fan-out | **Done (parallel-cron, no external queue).** Cron now fires every minute; each tick dispatches up to 50 gmail-connected users whose last Watcher run is older than ~20 min, oldest-first, parallel via `Promise.allSettled`. Self-balances: ≤1k users → ~21-min cycle with idle headroom; >1k users → cycle stretches naturally. Added `services/queue/dispatch.ts` abstraction so future QStash migration is a one-file change. $0 cost today, $0 at 1k users. | `78357d5` + `f1d7c4d` |
| **D5** | Route groups + auth services | **Mostly skip; one targeted fix.** Hid `/design-lab/*` from production routing (404 in prod, accessible in `npm run dev`) — the only current bug. Backlogged `isAdmin` consolidation in `BACKEND_REQUESTS.md` (P2 tech debt) since the three copies are byte-identical today. Skipped route groups (~30 file moves, lost git blame, zero behavior gain) and gate extraction (cosmetic). | `55dbd12` |
| **D6** | Shared service helpers | **In progress (code committed; migration 018 + smoke test pending).** Option C+ refactor: every send path + stage move flows through `outreach/sendDraft` → `pipeline/upsertConnectionAtStage`. CAS guard with 5-min stale recovery, JSON-parsed Gmail error messages, `revertToApproved` logs failures, distinct `gmail_succeeded_db_failed` variant for the dual-write hazard, `connection_id` writeback after fresh insert, `toHttpResponse` + `assertNever` so routes don't reason about variants directly, orphan-connection guard in `advanceStage`. Sentinel adds Check 5 (stuck `'sending'` > 10 min) + Check 6 (gmail-failure rate per user). Migration `018_drafts_sending_status.sql` waiting to be applied via Supabase Dashboard. | (this PR) |
| **D7** | Test database | **In progress — Option A only (code committed; npm install pending).** Vitest@^3 + 1 sample unit test (`tests/unit/pipeline/stage-validation.test.ts`) + `tests/integration/` scaffolding folder for future Docker work. CI gates PRs on `npm run test:unit`. Skipped Supabase Branching ($10/mo) and Docker integration (no Docker locally). Upgrade path to Option F is additive: add a `projects` array in `vitest.config.ts` + a global-setup that boots `supabase start`. | (this PR) |
| D8 | DraftCard sub-components | open (decided 2026-04-30 — Option A 8-way split, deferred) | — |

**Branch:** `claude/explain-cache-freshness-5X676`. All commits pushed.

**Tone of decisions so far:** prefer the smallest correct change. Skip cosmetics that don't fix current bugs. Document upgrade paths (Upstash Redis for D3, QStash for D4, isAdmin consolidation for D5) so future-us can pick them up the moment a real signal justifies the work.

---

## 🚨 ADMIN TODO — to ship D6 + D7 (committed in `e3ccaa0` on branch `claude/happy-dewdney-636b5c`)

The code is committed and pushed. Theo has stepped away. The admin (Dremix) needs to complete these steps in order. Each step is independent of the others *except* where noted.

### Step 1 — Apply migration `018_drafts_sending_status.sql` (REQUIRED FIRST)

**Why first:** the new code calls `drafts.status = 'sending'`. Without the migration, every send (button, send-all, mark-sent, planner autopilot) throws a `drafts_status_check` constraint violation. Vercel preview AND production both share the same Supabase, so this affects live users immediately on deploy.

**How:**
1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → SQL Editor → New query.
2. **Verify the CHECK constraint name first.** Paste and run this:
   ```sql
   SELECT conname FROM pg_constraint
   WHERE conrelid = 'drafts'::regclass AND contype = 'c';
   ```
   Expected: list includes `drafts_status_check`. If it's named differently (e.g., `drafts_status_check1`), open `supabase/migrations/018_drafts_sending_status.sql` and replace `drafts_status_check` with the actual name before running.
3. Open `supabase/migrations/018_drafts_sending_status.sql`, copy the contents, paste into a new SQL Editor query, click Run.
4. **Verify the migration applied:**
   ```sql
   -- Should return 1 row
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'drafts' AND column_name = 'send_started_at';

   -- Should include 'sending' in the constraint definition
   SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conname = 'drafts_status_check';

   -- Should list both indexes
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'drafts'
     AND indexname IN ('uq_drafts_active_user_banker_type', 'idx_drafts_sending_started');
   ```

The migration is forward-only and additive — old code that ignores `'sending'` keeps working, so it's safe to apply BEFORE merging the PR.

### Step 2 — Pull and install deps

```bash
git fetch origin
git checkout claude/happy-dewdney-636b5c
npm install     # picks up vitest@^3 (new devDep)
```

### Step 3 — Type-check + build (catches any TypeScript errors)

```bash
npm run build
```

This runs `tsc --noEmit` + Next build. **Most likely places to break** (Theo could not run tsc locally and may have type errors):
- The `BankerJoin` cast in `outreach/sendDraft.ts` — supabase-js may type nested joins differently than expected.
- The discriminated-union narrowing in `toHttpResponse` — *should* compile cleanly because of `assertNever`, but watch for "property does not exist on type" errors.
- The `claim1.data?.length` checks — TypeScript may type `data` as something other than an array.

If anything fails, **start a new Claude session** with the error output pasted in. Reference this branch and the spec in this doc.

### Step 4 — Run unit tests

```bash
npm run test:unit
```

Should pass 5 assertions in `tests/unit/pipeline/stage-validation.test.ts`. If this fails, the vitest config or `@/` alias is broken. Fix that first.

### Step 5 — Open the PR and watch CI

```bash
gh pr create --fill   # or open https://github.com/Dremix10/WarmIntro/pull/new/claude/happy-dewdney-636b5c
```

CI runs:
- `test-unit` (new, gating)
- `typecheck-build-lint` (existing)

If both green → proceed to smoke test.

### Step 6 — Smoke test on Vercel preview

GitHub will comment on the PR with a Vercel preview URL. Test these 6 paths against it:

| Path | How | Verify |
|---|---|---|
| Button send | `/today` → click Send on an approved draft | Email arrives, draft → `sent`, signal `draft_sent` with `via: send_button` |
| Send-all | `/today` → "Send all" with 2+ approved drafts | All sent, response includes `skipped` count if any were already sending |
| Mark sent | Trust C user → click "I sent it" | No Gmail call, signal `via: user_marked_sent` |
| Planner autopilot | Set Trust A on a capability, hit `/api/planner/run-now` (or wait for cron) | Drafts sent, signal `via: planner_autopilot_A` |
| Manual stage | `/crm` → drag a banker to "replied" | `connections.stage` updates, signal `stage_replied` with `via: manual` |
| Watcher reply | Reply to a previously-sent test email, wait ~20 min for cron | Signal `stage_replied` with `via: watcher` plus existing `reply_received` |

**The CAS guard test (the most important new behavior):** open `/today`, find an approved draft, click Send and immediately click Send again. First click sends. Second returns `{ ok: true, alreadySending: true }`. No double email. If you get TWO emails to the banker, the CAS guard is broken.

### Step 7 — Merge and watch Telegram

After smoke tests pass, merge the PR. Vercel auto-deploys to prod. For the first 24-48 hours, watch Telegram for:

- 🟠 **Drafts wedged in 'sending' > 10 min** (Sentinel Check 5) — if this fires, the dual-write hazard is biting. Time to ship Choice 2 (the reconciler cron). ~half a day of work; spec in this doc's D6 answer body.
- 🔶 **Gmail send failures · last 1h** (Sentinel Check 6) — if this fires for a real user, their OAuth token is broken. Ping them to reconnect Gmail at /account.

Both are NEW alerts that didn't exist before this PR — non-zero counts on day one are normal. Sustained high counts mean follow-up work needed.

### What this PR does NOT include (deferred follow-ups)

- **Choice 2 reconciler cron** (D6) — only if Sentinel Check 5 starts firing weekly. ~half day of work.
- **Option B integration test suite** (D7) — needs Docker installed locally. ~1 hour of work; upgrade path documented in D7 answer body below.
- **D8** — DraftCard split into 8 components. Decided 2026-04-30, deferred. ~2-3 hrs.

### What was removed in the redo (vs the original D6+D7 commit Theo reverted)

The original was reverted because the audit surfaced 17 worry-points. This redo bakes them in:
- `gmail_succeeded_db_failed` variant (clearer UX than "send failed")
- JSON-parse for Gmail error messages (replaces fragile regex)
- `revertToApproved` logs failures to Sentinel
- `connection_id` writeback after fresh insert
- `toHttpResponse` + `assertNever` (single source of truth for response narrowing)
- Orphan-connection guard in `advanceStage`
- Sentinel Check 6 for gmail-failure rate (was missing)
- `.gitattributes` for LF line endings
- `vitest@^3` (was 2.1)
- No `supabase` CLI as npm devDep (use brew/scoop locally + GH Action in CI)
- Removed integration suite scaffolding I had originally written for Docker — now deferred to F upgrade

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

1. **`src/app/today/page.tsx` is now ~1358 lines** (up from ~870 in v1, +240 since Apr 29). DraftCard (300+ lines), RunAlmaNowButton, SendAllButton, GmailRequiredBanner, SectionShell, AnchorChip, plus the new override-modal, iteration-history viewer, escalated-draft styling, and Critic-feedback rendering all live in one file. Inline edit, fact-check rendering, send-state machine, fade animations all interleaved. One bug forces understanding all of them. Refactor urgency keeps growing with every commit.

2. **`src/services/agents/correspondent.ts` (~388 lines)** bundles the prompt, the `findCommonGround` tool, the cumulative-feedback revise loop, and the persistence. The cumulative-feedback addition since v1 made it harder to test the prompt in isolation, not easier.

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
- `admin/users/[id]/resume/route.ts` `[NEW: admin downloads a user's parsed resume]`

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

The roster is now **7 agents** (was 6 in v1). Scout is new.

- `planner.ts` `[updated: dispatches Scout; dedupes escalated bankers; uses Opus 4.7]` — orchestrator (deterministic, not an LLM call)
- `scout.ts` `[NEW: 270 LOC — real-time finding harvest, Serper fan-out with provenance, parallel queries within run-now budget; defensive Serper-query gating]`
- `researcher.ts` `[updated]`
- `correspondent.ts` `[updated: cumulative feedback in revise loop, banned-phrase tightening, Opus 4.7]`
- `critic.ts` `[updated: cumulative feedback, iteration history, banker facts in prompt, Opus 4.7]`
- `fact-checker.ts` `[updated: claims must come with a defensible Serper query]`
- `watcher.ts`
- `curator.ts`
- `sentinel.ts` `[updated: failure auditing, hot-path Telegram]`
- `shared.ts`

### Integrations — `src/services/`

- `claude.ts` `[updated: Opus 4.7 model migration]`
- `gmail/oauth.ts`, `gmail/send.ts` `[updated: drafts.send API for atomic conversion]`, `gmail/poll.ts`, `gmail/thread-match.ts`, `gmail/tokens.ts`
- `gmail/sync-draft.ts` `[NEW: mirrors approved drafts into the user's Gmail Drafts folder]`
- `hunter/enrich.ts`
- `linkedin/discovery.ts` `[renamed from proxycurl.ts in 1c51324; Serper-only now]`
- `lib/telegram.ts` `[NEW: shared Telegram alert client — used by Sentinel + run-now hot-path auditing]`

(Resend and Serper are still inline — search for their env keys.)

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

- `src/app/today/page.tsx` `[updated, ~1358 LOC and growing — refactor target #1]`
- `src/app/admin/page.tsx` `[updated: resume download UI]`
- `src/app/reset-password/page.tsx`
- `src/components/RecoveryHashRedirect.tsx`
- `src/app/crm/page.tsx` `[updated locally on worktree-batch-0-optimistic-ui: optimistic stage moves]`

### Database — `supabase/migrations/`

- `001_initial_schema.sql`
- `002_events_table.sql`
- `003_alma_ib_schema.sql`
- `004_alma_agents_flywheel.sql`
- `005_unique_active_drafts.sql`
- `006_draft_fact_check.sql` — `drafts.fact_check JSONB`
- `008_drafts_critic_override.sql` — `drafts.critic_override` flag for "Send anyway"
- `009_banker_findings.sql` `[NEW: Scout's per-banker discovery records with provenance]`
- `010_draft_iterations.sql` `[NEW: full revision history per draft for the override-modal + audit trail]`
- `011_unique_active_drafts_include_escalated.sql` `[NEW: extended migration 005 to cover escalated state]`
- `012_rls_draft_iterations_banker_findings.sql` `[NEW: RLS policies for the two new tables]`
- `013_drafts_gmail_draft_id.sql` `[NEW: drafts.gmail_draft_id for two-way Gmail sync]`
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

**Status as of 2026-05-01:** 0.2 + 0.3 + 0.5 are essentially done. 0.1 (the single biggest win) is the unblocked next step. 0.4 (optimistic UI) is the highest-ROI UI piece still pending. 0.6 is blocked on Vercel Hobby's daily-cron limit.

**0.1 Single auth path** *(biggest single win, ~300ms median saved)* `⚠ blocks on D1` `⏳ pending`

Today: middleware verifies the session against Supabase, then the route does the same call again. Two network round-trips to Supabase Auth before any business logic.

Plan:
- Middleware verifies once.
- Sets a signed header (`x-alma-user-id` + HMAC-SHA256 using `ALMA_INTERNAL_SECRET`) on the forwarded request.
- `lib/auth.ts:getUser()` reads the header, verifies the HMAC, returns immediately. Skips the network call.
- Falls back to the old path on routes that bypass middleware (cron with bearer-token).
- Ship behind feature flag `ALMA_USE_AUTH_HEADER=true`; soak on staging for 24h before promoting.

Files: `src/proxy.ts`, `src/lib/auth.ts`, every `route.ts` (no change required if `getUser()` keeps the same signature).

**0.2 Parallelize independent reads** *(~150-300ms saved on read endpoints)* `✅ done`

Wrap independent queries in `Promise.all`. Status:
- `src/app/api/today/route.ts` — DONE: 5-query phase 1 + 2-query phase 2 are both `Promise.all`.
- `src/services/outreach/sendDraft.ts` — DONE: draft + profile read in parallel (D6+D7 refactor pulled this out of the route handlers).
- `src/app/api/profile/route.ts` — single read; nothing to parallelise.
- `src/app/api/connections/route.ts` — single read; nothing to parallelise.
- `src/app/api/admin/users/route.ts` — already uses `in()` joins.

Pattern:
```ts
const [drafts, trust, recent, pipeline, profile] = await Promise.all([...]);
```

**0.3 HTTP cache headers on read GETs** *(repeat-load latency drops to ~50ms)* `✅ done`

Set `Cache-Control: private, max-age=5, stale-while-revalidate=300` on:
- `/api/today`, `/api/profile`, `/api/connections`, `/api/agents/runs`.

5s of fresh-cache + 5min SWR. The fresh window means immediate Back/refresh skips the server entirely; SWR makes everything else feel instant via cached render + background revalidate. Picked 5s over 10s because "Run Alma" → reload should still surface fresh drafts.

**0.4 Optimistic UI on action buttons** *(zero-perceived-latency for clicks)* `⏳ pending`

Approve / skip / edit / stage-move all update local React state instantly. Server confirms in background; revert with toast on failure.

Files: `src/app/today/page.tsx`, `src/app/crm/page.tsx`, `src/components/OutreachDraft.tsx`, `src/components/ConnectionCard.tsx`.

**0.5 Tighter middleware matcher** `✅ done`

`src/proxy.ts:344-348` now excludes `_next/static`, `_next/image`, `_next/data`, favicon, robots, sitemap, manifest, plus all of woff/woff2/ttf/otf/svg/png/jpg/jpeg/gif/webp/ico/txt/xml/json/map/css/js. Bypass-prefix list also covers /api/cron, /api/auth, /api/pilot-signup, /api/setup/firms.

**0.6 Cron pre-warm** *(mitigates cold-start tax during business hours)* `🚫 blocked`

Vercel Hobby plan caps cron at daily granularity (we already had to downgrade /api/cron/tick from per-minute to daily). 5-minute pre-warm requires Pro plan or moving the cron schedule to the Ubuntu VPS. Revisit when the VPS is wired up.

**0.7 Replace or delete in-process caches** `⚠ blocks on D3` `⏳ pending`

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

**6.4 Cron tick fan-out.** `⚠ blocks on D4` `src/app/api/cron/tick/route.ts`. Replace serial loop with dispatcher: cron triggers fan-out function that enqueues one invocation per user. Use Vercel queue, QStash, or Inngest. **Required before user count exceeds ~50. 3-4 hrs.**

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

## Decisions needed before execution

> **Reviewer: please answer inline below each.** The executor will treat your answers as binding and start the corresponding batch as soon as the answer lands. If you don't have an opinion, write `default` and we'll go with the recommended option (italicized).

### Blocks Batch 0 (perf — the user-felt priority)

**D1.** `[Batch 0.1]` Auth header refactor — *recommended: HMAC-signed `x-alma-user-id` header (simpler).*
Alternative: verify the JWT in middleware and pass the parsed claims as plaintext headers (slightly safer if `ALMA_INTERNAL_SECRET` ever leaks).

> Answer: **Skip.** Security is the higher priority; the double `getUser()` call is defense-in-depth, not a bug. Removing the second check trades immediate session-revocation detection (logout / password reset / admin disable lock the user out within seconds) for up to a JWT-TTL-long window of usable stolen tokens. The ~300ms tax is acceptable; the perf wins in 0.2 (parallelize reads), 0.3 (HTTP caching), and 0.4 (optimistic UI) cover most of the gap without touching the auth boundary. Revisit only if those three together don't get clicks under 500ms.

**D2.** `[Batch 0.3]` Cache freshness — *recommended: `Cache-Control: private, max-age=10, stale-while-revalidate=60` on `/api/today`, `/api/profile`, `/api/connections`, `/api/agents/runs`.*
Trade-off: a "Send" click takes up to 10s to reflect in funnel counts on the Today page. If that's too long, we can drop to 5s or use `max-age=0, stale-while-revalidate=30` (always revalidates but serves stale instantly).

> Answer: **`Cache-Control: private, max-age=0, stale-while-revalidate=300`** on all four endpoints. Optimizes for minimum perceived delay at our current scale (~1k users target) while leaving an obvious upgrade path. `max-age=0` means every navigation triggers a background revalidation; `swr=300` means the user sees the cached paint instantly for up to 5 min of idle time. Combined with optimistic UI (0.4), users never see stale funnel counts. Server-load cost (~20k revalidations/day at 1k users) is trivial for Supabase Pro and the parallelized reads from 0.2. Upgrade levers when we cross ~10k users: (a) bump to `max-age=30, swr=600` (one-line change, ~30× fewer revalidations, accept 30s staleness), or (b) add Upstash Redis as a shared cache (D3) so origin reads stop mattering. Implemented in `src/app/api/{today,profile,connections,agents/runs}/route.ts`.

**D3.** `[Batch 0.7]` In-process caches — *recommended: delete them.*
They're per-instance only and don't help cold starts. Alternative: move to Upstash Redis ($0 free tier, $10/mo at scale) as a real shared cache. Worth doing if we're going to need cache for the agent system anyway; not worth it for the current footprint.

> Answer: **Option A′ — delete the two useless caches, keep the rate-limit map as-is.** The pure "delete everything" answer would also remove `proxy.ts:rateLimitMap`, which weakens security (a per-instance limit is weak but not zero — deleting it is strictly worse). Compromise:
> - Deleted `claude.ts` Map + `hashKey` + `MAX_CACHE_SIZE` + `getCacheSize` + `clearCache` + `skipCache` option (and stripped `skipCache: true` from the 5 callers in `fact-checker.ts`, `correspondent.ts`, `watcher.ts` ×2, `curator.ts`, `critic.ts`). The "LRU" was actually FIFO (S1) and hit rate was ~0% at any scale; deleting kills both problems at once.
> - Deleted the three Maps in `linkedin-search.ts` (profile, alumni, email caches). Same reasoning.
> - **Kept `proxy.ts:rateLimitMap`** with an explicit comment documenting the per-instance limitation (S7) and the upgrade path (`@upstash/ratelimit` or Vercel Firewall) once traffic justifies it. Zero new dependency, zero new cost, security posture unchanged.

### Blocks Batch 6 (scaling)

**D4.** `[Batch 6.4]` Cron fan-out queue — *recommended: QStash (Upstash, $0 free tier, simplest).*
Alternatives: Vercel native queue (newer, limited features), Inngest (richer DX, more setup). Required before user count crosses ~50.

> Answer: **Skip the external queue. Use parallel-cron with self-balancing batches.** Cron fires every minute (`* * * * *` in `vercel.json`); each tick processes up to 50 gmail-connected users whose last Watcher run is older than ~20 min, sorted oldest-first. At ≤1k users this means full coverage in ~21 min and idle ticks the rest of the cycle (each user re-polled every ~21 min); at >1k users the cycle stretches proportionally (1500 users → ~30 min, 2000 users → ~40 min). Watcher is I/O-bound (Gmail history-id check + optional Claude classify only when there are new messages) so 50 in-flight async calls fit comfortably in a 60s function. The Planner side is naturally throttled by users' staggered `preferred_send_time` and now also dedups against `agent_runs` to prevent double-fires when cron drift straddles a tick boundary. Both sides parallelized via `Promise.allSettled`. Future scale-out path (>1k users or sub-20-min freshness): swap the bodies of `dispatchWatcher` / `dispatchPlanner` in `src/services/queue/dispatch.ts` from direct calls to `qstash.publishJSON(...)` — call sites in the cron tick don't change. Vendor-swap insurance was the whole point of the abstraction. Cost today: $0. Cost at 1k users: $0. No vendor account, no env vars, no new dependency.

### Blocks Batches 1-3 (structural)

**D5.** `[Batch 3]` Route groups — *recommended: yes, `(marketing)` / `(auth)` / `(app)` groups.*
Alternative: keep flat layout. Groups give a clearer mental model but mean every existing page-import path changes.

> Answer: **Mostly skip; one targeted fix.** Of the three Batch 3 items, only the `isAdmin` duplication has any security relevance, and the three copies are byte-identical today (no current bug, only future drift risk) — backlogged in `BACKEND_REQUESTS.md` under "P2 — tech debt / code hygiene." Route groups and gate extraction are pure code-organization moves with zero current bug, so they're not worth the file-move blast radius. The one current issue worth fixing now is `/design-lab/*` being publicly routable: added a production-only 404 in `src/proxy.ts` so the reference UIs are reachable in `npm run dev` (Option 3, dev-only) but return 404 on Vercel deploys. Files stay in `src/app/design-lab/` for cofounder editing access.

**D6.** `[Batch 1]` Shared service helpers — *recommended: keep `services/outreach/` and `services/pipeline/` independent for now.*
Alternative: introduce `services/core/` upfront for cross-cutting helpers. Premature unless real overlap shows up.

> Answer: **Option C+ (code committed in this PR; awaiting smoke test + migration apply).** Neither A (independent) nor B (upfront `core/`). The connection-upsert block was already duplicated 3x in the tree — not hypothetical. The right home is `pipeline/`, since it already owns connection lifecycle, with `outreach/` importing down. Directional rule: `outreach → pipeline → signals`, never reverse.
>
> **What shipped:**
> - `services/pipeline/upsertConnectionAtStage.ts` — single connection writer (legacy `alumni_*` dual-write + stage-specific resets). Race-loser retry on insert error so parallel sends settle deterministically.
> - `services/pipeline/advanceStage.ts` — manual + watcher stage moves with **orphan-connection guard** for legacy rows where `banker_id IS NULL`.
> - `services/outreach/sendDraft.ts` — orchestrator with the **CAS guard** (5-min stale-claim recovery), **JSON-parsed Gmail error messages** (replaces fragile regex), **`revertToApproved` that logs on its own error** for Sentinel visibility, **`gmail_succeeded_db_failed`** variant for the rare Gmail-OK / DB-fail dual-write hazard (UI shows "email may have been sent — refresh in a few min" instead of generic "send failed"), **`connection_id` writeback** after fresh connection insert, **`toHttpResponse`** + **`assertNever`** so routes don't reason about discriminated-union narrowing themselves and TypeScript errors at compile time if a new variant is added without a handler.
> - 4 routes shrink to ~10 LOC each (auth check + helper call + `toHttpResponse` + return).
> - `agents/planner.ts:sendApprovedDrafts` — Trust C inline path unchanged; Trust B post-window + Trust A both route through `sendDraft`. Removed `createOrUpdateConnection` (~60 LOC dead code).
> - `agents/watcher.ts` — stage advancement via `advanceStage` (single source of truth for connection writes + stage_X signal).
> - `agents/sentinel.ts` — **Check 5** (drafts wedged in `'sending'` > 10 min) + **Check 6** (per-user `draft_send_failed` rate > 5/hour, catches OAuth-token-expired loops that other checks miss).
> - Migration `018_drafts_sending_status.sql` — adds `'sending'` to status CHECK, `send_started_at` column, updates active-draft index to cover `'sending'`, adds partial index for the Sentinel stuck-sending query. Includes verify-name SQL block at top so the admin can confirm the existing CHECK constraint name before running.
>
> **Pending:**
> 1. Apply migration `018_drafts_sending_status.sql` via Supabase Dashboard (admin runs at session end)
> 2. `npm install` to pick up new vitest devDep
> 3. Push, watch CI, fix any type-check errors
> 4. Smoke test 6 paths (button send, send-all, mark sent, planner autopilot, manual stage, watcher reply) against Vercel preview
> 5. Confirm CAS guard works — double-click Send rapidly should return `alreadySending: true` on the second click
>
> **Why not Choice 2 reconciler now:** at 100-1k users, the dual-write window is rare. Sentinel Check 5 will tell us if it actually bites. Choice 2 stays as a parked half-day-of-work follow-up.

**D7.** `[Batch 5]` Test database — *recommended: vitest + dedicated Supabase test branch (paid feature, $10/mo).*
Alternative: a separate test DB on the existing instance with cleanup hooks. Cheaper but riskier (cleanup bugs leave junk in prod-ish data).

> Answer: **Option A only (code committed in this PR).** Lighter than the original Option F decision — we picked the unit-tests-only slice because (a) Docker isn't installed locally so the integration suite couldn't actually run, (b) at 1k users the bugs only Option B catches (CAS races, RLS edge cases) happen rarely enough that A's 90% coverage is sufficient, and (c) starting with A leaves a clean upgrade path to F whenever Docker arrives.
>
> **What shipped:**
> - `vitest@^3.0.0` as devDep (no `supabase` CLI devDep — that's a binary, not an npm package; install via brew/scoop locally + `supabase/setup-cli@v1` in CI).
> - `vitest.config.ts` with single project pointed at `tests/unit/**`, `@/` alias matching tsconfig, integration folder explicitly excluded.
> - `tests/unit/pipeline/stage-validation.test.ts` — 5 assertions on `isValidStage`. Foundational test: if it doesn't run, the rig is broken.
> - `tests/integration/.gitkeep` — scaffolding folder for future Option B work. No tests yet.
> - `.gitattributes` — normalizes line endings to LF on commit. Stops CRLF noise on Windows-edited files. Pre-existing repo issue, fixed alongside.
> - npm scripts: `test`, `test:unit`, `test:watch`. CI gets a `test-unit` job that gates every PR.
>
> **What's NOT in this PR (deferred to F upgrade):**
> - `tests/integration/_setup/` (boots local Supabase via `supabase start`)
> - GH Actions integration job
> - Docker setup
>
> **Upgrade path to F when ready:** ~1 hour of work — install Docker, write `tests/integration/_setup/global-setup.ts` that calls `supabase start`, change `vitest.config.ts` to use a `projects` array (existing unit project + new integration project with global-setup), add a `test-integration` GH Actions job marked `continue-on-error: true` initially. Existing unit tests keep working unchanged.
>
> **Triggers to upgrade:** Sentinel pings stuck-sending alert weekly | a third collaborator joins | scaling past 5k users.

**D8.** `[Batch 2]` DraftCard sub-components — *recommended: extract `DraftCard`, `FactCheckPanel`, `SentToConfirmModal`, `RunAlmaNowButton`, `SendAllButton`, `GmailRequiredBanner`, `BatchStepper`, `SendTimePicker`.*
Reviewer: any sub-component you'd specifically want kept separate or merged differently? FactCheckPanel feels like the most extractable.

> Answer:

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
