# Alma — Backend Handoff

> For: frontend cofounder (evangelosparaskeva). Last updated: 2026-04-23.
> Pair read: `FRONTEND_HANDOFF.md` (yours), `BACKEND_REQUESTS.md` (your backlog asks → this doc = what's answered), `docs/superpowers/specs/2026-04-23-alma-ib-agent-design.md` (the canonical spec), `docs/superpowers/brainstorm/2026-04-23-alma-ib-brainstorm.md` (how the spec was reached).

The backend for Alma IB is live. This doc tells you what it exposes, what env it needs, what's still mocked on the UI, and what's safe to wire up now.

---

## TL;DR — state of the repo

- **Spec:** `docs/superpowers/specs/2026-04-23-alma-ib-agent-design.md` is the source of truth. Read before starting new feature work.
- **Data model:** migrations 003 + 004 applied to Supabase. Full IB data model (firms / groups / bankers / banker_profiles / banker_deals), trust gradient, drafts, critic reviews, signals, flywheel, schema proposals.
- **6 agents shipped in `src/services/agents/`:** Planner, Researcher, Correspondent, Critic, Watcher, Curator.
- **Agent loop runs via Vercel Cron** (schedules in `vercel.json`). Every 15 min: Planner + Watcher tick. Every 30 min: Curator hot tasks + night-preview email sender. Daily 11am UTC: Curator daily sweep. Sunday 11pm UTC: flywheel batch.
- **UI pages landed:** `/today` (critical-path daily view), `/agents` (transparency / what the agents did), `/setup` (3-step conversational onboarding).
- **Existing pages you built** (`/`, `/network`, `/pipeline`, `/crm`, `/profile`, `/companies`, `/quests`, `/recap`, `/cohort`, `/leaderboard`) — your IB-flavored designs stay exactly as they are. Wire them to the APIs below when you want; `/quests`, `/recap`, `/cohort` are fine as mock for v1 launch.
- **Build is green:** `npm run build` passes. `npx tsc --noEmit` is clean.

---

## What's running

### The 6 agents

| Agent | File | What it does |
|---|---|---|
| **Planner** | `src/services/agents/planner.ts` | Deterministic orchestrator (not an LLM call). Per-user cron dispatches agents, gates trust-level send actions. |
| **Researcher** | `src/services/agents/researcher.ts` | Finds + ranks bankers. Tools: queryBankerDB, scoreBankerFit (Claude), Serper fallback, Hunter enrich. |
| **Correspondent** | `src/services/agents/correspondent.ts` | Drafts emails. Uses `findCommonGround` tool. Rejects candidates back to Researcher if no anchor. |
| **Critic** | `src/services/agents/critic.ts` | Reviews every draft on 4 axes (specificity, voice match, guardrails, shared-ground). Reject/revise loop max 3 iterations. |
| **Watcher** | `src/services/agents/watcher.ts` | Polls Gmail every 15 min. Classifies reply intent, advances stages, extracts signals. Also parses night-preview replies (PREVIEW / LATER 10 / SKIP / MORE 3). |
| **Curator** | `src/services/agents/curator.ts` | 24/7 data steward. Enrichment backfill, new-banker discovery, dedup, refresh stale profiles, generate schema proposals. |

### Integrations

| Service | Env keys | Behavior if missing |
|---|---|---|
| Claude API | `ANTHROPIC_API_KEY` | Agents log warnings, resume parser returns empty profile. |
| Hunter.io | `HUNTER_API_KEY` | Email enrichment returns null. |
| Proxycurl | `PROXYCURL_API_KEY` | LinkedIn scrape returns null. Correspondent falls back to sparse banker context. |
| Gmail OAuth | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | OAuth flow returns 503. Users can't connect Gmail. |
| Serper (legacy fallback) | `SERPER_API_KEY` | LinkedIn search returns empty. |
| Supabase service role (for agents writing across users) | `SUPABASE_SERVICE_ROLE_KEY` | Admin client throws — agents fail loudly. |
| Cron protection | `ALMA_CRON_SECRET` | If set, cron endpoints require `Authorization: Bearer ${secret}`. If unset, cron is open (dev only). |

Graceful degradation is the rule: every integration boots without its key and logs a single warning.

### Cron schedule (`vercel.json`)

```
/api/cron/tick              every 15 min   Planner + Watcher for active users
/api/cron/curator-hot       every 30 min   Curator enrichment backfill
/api/cron/night-preview     every 30 min   9 PM user-local preview email
/api/cron/daily-sweep       daily @ 11 UTC Curator daily deep sweep (discovery, refresh)
/api/cron/weekly-flywheel   Sunday 23 UTC  Signal aggregation → scoring weights + critic calibration + flywheel_release
```

---

## API endpoints for you to wire

All endpoints except `/api/cron/*` and `/api/auth/gmail/*` require `Authorization: Bearer <supabase access token>`.

### Daily UX

| Endpoint | Method | Returns / accepts |
|---|---|---|
| `/api/today` | GET | `{ drafts, trust, recent, stageCounts }` — drives `/today` page. |
| `/api/drafts/[id]/approve` | POST | User approves a pending draft → `approved` status (will auto-send on trust B/A). |
| `/api/drafts/[id]/skip` | POST | User skips → `skipped` status, no send. |
| `/api/drafts/[id]/edit` | POST `{subject, body}` | User edits → auto-approved (skips Critic since user wrote it). |
| `/api/drafts/[id]/send` | POST | User triggers immediate send (bypass preview window). |
| `/api/drafts/[id]/stop` | POST | User vetoes a B-mode scheduled send. Increments `stops_count` for auto-demote. |

### Transparency / flywheel

| Endpoint | Method | Returns |
|---|---|---|
| `/api/agents/runs` | GET | `{ runs, flywheel }` — per-agent recent runs + recent flywheel releases. Drives `/agents`. |

### Onboarding

| Endpoint | Method | Notes |
|---|---|---|
| `/api/setup/firms` | GET | `{ firms, groups }` — seeded BB / EB / MM list for the bank picker. |
| `/api/setup/profile` | POST | `{ name?, major?, graduationYear?, targetFirms?, targetGroups?, warmHints?, storyOneLiner? }` |
| `/api/setup/trust` | POST | `{ sendNewEmail, sendFollowup, sendReply, autoGraduate, preferredSendTime, preferredTimezone, nightPreviewEnabled }` — initial trust level + scheduling prefs. |
| `/api/setup/trust` | GET | Current trust state. |
| `/api/auth/gmail/start` | GET | Returns `{ url }` — redirect user there to start OAuth. |
| `/api/auth/gmail/callback` | GET | OAuth callback. Redirects to `/setup?gmail=connected` on success. |

### Existing (legacy) — still work

`/api/parse-resume`, `/api/extract-pdf`, `/api/find-companies`, `/api/find-alumni`, `/api/find-people`, `/api/generate-outreach`, etc. — unchanged from the WarmIntro era. Safe to keep using on legacy pages until migration.

---

## Database shape

Migrations `001` + `002` (existing) + new `003_alma_ib_schema` + `004_alma_agents_flywheel`. Full column list in `src/lib/database.types.ts` (regenerated from live schema).

Key reads for the frontend:

- **`firms`, `groups`** — global reference. Tier + coverage/product kind. Safe to query from client. Seeded automatically on first Curator run (or call `/api/setup/firms`).
- **`bankers`, `banker_profiles`, `banker_deals`** — the proprietary graph. Curator keeps them fresh. Public-read (auth'd users).
- **`connections`** — user's pipeline. IB 7-stage model (sent → replied → coffee → referral → first_round → superday → offer → closed_lost). Now has `banker_id`, `warmth`, `thread_id`, `last_send_message_id`, `needs_followup`, `silence_days`.
- **`drafts`** — everything Correspondent writes. Status: pending_critic → needs_revision → approved → sent | skipped | rejected_unresolvable.
- **`trust_levels`** — per-user C/B/A per capability + preferred_send_time + tomorrow_override (one-time night-preview parsed).
- **`agent_runs`** — observability. What each agent did, when, duration, tokens, error.
- **`signals`** — the flywheel's append-only event stream. Every agent writes to it.
- **`scoring_weights`, `critic_calibration`, `flywheel_releases`** — Sunday batch outputs. `/agents` reads `flywheel_releases` for the "what Alma learned this week" tile.

All user-scoped tables have RLS on (owner-only). Global tables are auth'd-user-readable, service-role-writable.

---

## Fields the UI now has real data for

| Data | Source | Wire it where? |
|---|---|---|
| `connections[*].warmth` | persisted on every send via Planner | `/network` archipelago (size-by-warmth), `/crm` cards |
| `connections[*].stage` (7 values) | Watcher auto-advances on reply | `/pipeline`, `/crm`, `/network` (construction stage) |
| `connections[*].silence_days`, `.needs_followup` | Watcher computes each tick | `/crm` "needs attention" row |
| `connections[*].banker_id` → `bankers` → `banker_profiles` | Researcher/Curator | Banker detail drawer anywhere you show a contact |
| `drafts` queue with Critic scores | Correspondent + Critic | `/today` (already wired), eventually `/outreach/[id]` |
| `agent_runs` + `flywheel_releases` | Agents themselves | `/agents` page (already wired) |
| `trust_levels` | onboarding + /today settings | Anywhere you want to show C/B/A state |
| `preferred_send_time` | user setting | Surface in `/today` header, profile settings |
| `target_firms`, `target_groups`, `story_one_liner`, `warm_hints` | profile extensions | `/profile` edit mode (the target picker you have already) |

---

## What's still mock and safe to leave mock for v1 launch

- `/quests` — engine not built; your IB-flavored mock content ships as-is. Post-launch we'll wire a real quest generator.
- `/recap` — Sunday letter UI stays mock; a real recap email goes out server-side via `/api/cron/weekly-flywheel` (piggybacks the flywheel batch).
- `/cohort` — aggregation not built; cofounder's signals feed stays mock.
- `/leaderboard` — your mock with IB flavor is fine; real leaderboard query can land post-launch.

Everything on `/`, `/network`, `/pipeline`, `/profile`, `/companies`, `/crm` can be wired to real endpoints now. Start with the ones that matter most for the demo (probably `/pipeline` + `/network`).

---

## Trust gradient — how it works

Three capabilities, each independently at C / B / A:
- **send_new_email** — cold outreach sends
- **send_followup** — silence-triggered follow-ups
- **send_reply** — responses to banker replies

**Auto-graduation** (if `auto_graduate = true`):
- C → B after 5 approvals without skip
- B → A after 10 further approvals without STOP
- A → B demotion on any STOP during preview window
- B → C demotion on two STOPs in 7 days (future; v1 only tracks stops_count)

**Manual override:** user can lock at any level from `/today` or via onboarding.

**Tomorrow-only override** via night-preview reply (PREVIEW / LATER XX / SKIP / MORE N / plain English) — parsed by Watcher, applied to next tick, cleared after use.

---

## Things that need your attention (or ours, together)

### Safe for you to do solo

1. Wire `/pipeline` funnel numbers from real `connections` stage counts. Endpoint: `/api/today` already exposes `stageCounts` for the current user.
2. Wire `/network` archipelago islands+markers from `connections` + `bankers` + `firms` + `banker_profiles`. Construction stage maps from `stage` per spec.
3. Wire `/crm` columns directly from `connections`. The 7 stages you already modeled match the schema exactly.
4. Wire `/profile` target-firm + target-group pickers through `POST /api/setup/profile`.

### Needs a joint conversation

1. **YC narrative polish** — user flagged they want to iterate with you post-build. Current draft in spec Section 8 — we'll rewrite together.
2. **Launch copy / target-user DMs** — we both have lists of rising sophomores at Rice + Brown; let's divide and message Friday.
3. **Pricing / business model** — not modeled anywhere yet. YC will ask.

### Requires Dremix (env + keys)

1. Hunter.io / Proxycurl / Google OAuth accounts + keys land in `.env.local` + Vercel env. Will wire tonight.
2. Supabase service role key → Vercel env (already in Supabase, just set as `SUPABASE_SERVICE_ROLE_KEY`).
3. `ALMA_CRON_SECRET` → new random token, set in Vercel env + on the Vercel Cron entries.
4. Gmail OAuth app published in Google Cloud (Testing mode, ≤100 users, no verification needed for launch).

---

## Running locally

```bash
npm install        # if dependencies changed (none new were added in this pass)
npm run dev        # dev server, no cron, graceful-degrade without optional keys
npm run build      # production build (passes green as of this commit)
npx tsc --noEmit   # type-check only
```

To trigger an agent run manually without waiting for cron (dev):

```bash
curl -X POST http://localhost:3000/api/cron/tick                  # Planner + Watcher tick
curl -X POST http://localhost:3000/api/cron/curator-hot           # Curator enrichment pass
curl -X POST http://localhost:3000/api/cron/weekly-flywheel       # Flywheel batch (safe to run anytime)
```

In production, protect all of these with `Authorization: Bearer $ALMA_CRON_SECRET`.

---

## One-liners for each agent (useful in YC demo & UI copy)

- **Planner** — *"decides what the others should do next"*
- **Researcher** — *"finds the right bankers to email"*
- **Correspondent** — *"writes in your voice, using what you actually share with each banker"*
- **Critic** — *"rejects drafts that are generic or sound like AI"*
- **Watcher** — *"reads your inbox and advances the pipeline"*
- **Curator** — *"keeps the database fresh, 24 hours a day"*

Use these in tooltips on `/agents` or in landing copy if you want.
