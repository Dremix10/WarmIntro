# Alma — Database schema reference

Live as of **2026-04-30** · Postgres on Supabase · 24 tables in `public`

This doc is the canonical reference for cofounders who don't have direct
DB access. Read it before touching anything that reads or writes
Supabase. Schema migrations are in `supabase/migrations/*.sql` — those
are the ground truth; this file is a flattened view of where they
landed.

If anything looks stale, regenerate using the four queries in
[Regenerating this doc](#regenerating-this-doc) at the bottom — paste
into the Supabase SQL editor (or run via the Supabase MCP if you have
it wired). Manual but reliable; no extra deps required.

## How to read this

Each table block has:
- **Purpose** — what the table is for, in one sentence.
- **Owner** — who writes (Planner / Researcher / Correspondent / Critic / Watcher / Curator / user / system).
- **RLS** — `owner-only` (user can read/write only their rows), `public-read` (any authed user can SELECT), `service-only` (writes go through service-role API routes).
- **Columns** — name, type, nullable, default, comment.
- **Indexes** — non-PK indexes worth knowing about.
- **FK relationships** — which other tables reference this one (or it references).

Conventions across the schema:
- All ids are `uuid` (gen_random_uuid()) unless stated. `firms` and `groups` use `text` slugs because they're seeded.
- All timestamps are `timestamptz` defaulting to `now()`.
- JSONB defaults to `'{}'::jsonb` for objects, `'[]'::jsonb` for arrays.
- Most FKs to `auth.users` are `user_id`. Most internal FKs to `bankers` use `banker_id`.

---

## Domains

The schema breaks into five logical domains:

1. **User-scoped** — per-user data, RLS owner-only: `profiles`, `connections`, `funnel_states`, `selected_companies`, `referrals`, `trust_levels`, `drafts`, `agent_runs`, `signals`, `feedback`.
2. **IB domain** — global reference data, RLS public-read for authed users: `firms`, `groups`, `bankers`, `banker_profiles`, `banker_deals`, `banker_findings`.
3. **Agent infra** — internal pipelines: `critic_reviews`, `draft_iterations`, `claude_usage`.
4. **Flywheel & schema gov** — global, public-read: `scoring_weights`, `critic_calibration`, `flywheel_releases`, `schema_proposals`.
5. **Auth & misc** — `password_reset_tokens`, `pilot_signups`, `events`, `demo_sessions`.

---

## 1. User-scoped (RLS owner-only)

### `profiles`

**Purpose:** the user's resume + onboarding data, plus their Gmail OAuth tokens.
**Owner:** user (during /setup), Planner (when minting a fresh profile from `pilot_signups` on approve).
**RLS:** owner-only. `id = auth.uid()` for all of select / insert / update.
**FK:** `id` → `auth.users.id` (1:1 — the profile's PK is the user's auth id).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | — | PK + FK to auth.users.id |
| `name` | text | NO | — | Full name |
| `email` | text | YES | — | Cached from auth.users; not authoritative |
| `university` | text | NO | `'Rice University'` | Free text — e.g. "Brown University", "MIT" |
| `graduation_year` | int | NO | — | e.g. 2028 |
| `major` | text | NO | — | Free text |
| `skills` | jsonb | NO | `[]` | Legacy; from WarmIntro era. Free-form list. |
| `experience` | jsonb | NO | `[]` | Legacy; resume bullets parsed by Claude |
| `target_industries` | jsonb | NO | `[]` | Legacy WarmIntro field |
| `target_roles` | jsonb | NO | `[]` | Legacy WarmIntro field |
| `target_firms` | text[] | NO | `{}` | **IB-era**: array of `firms.id` slugs |
| `target_groups` | text[] | NO | `{}` | **IB-era**: array of `groups.id` slugs |
| `warm_hints` | text[] | NO | `{}` | Free-form alumni hints from setup ("Brown CS Club, lived in NYC") |
| `story_one_liner` | text | YES | — | One-sentence pitch generated during setup |
| `resume_text` | text | NO | `''` | Full resume after PDF parse |
| `referral_code` | text | YES (unique) | — | Legacy WarmIntro referrals feature |
| `company_unlocks` | int | NO | 5 | Legacy WarmIntro |
| `gmail_refresh_token_encrypted` | text | YES | — | OAuth refresh, AES-encrypted at rest |
| `gmail_access_token_encrypted` | text | YES | — | OAuth access, refreshed every ~50 min |
| `gmail_token_expires_at` | timestamptz | YES | — | when access token expires |
| `gmail_scopes` | text[] | YES | — | Granted Google scopes |
| `gmail_connected_at` | timestamptz | YES | — | First-ever Gmail connect |
| `gmail_email` | text | YES | — | The Gmail address user authorized (may differ from profiles.email) |
| `created_at` / `updated_at` | timestamptz | NO | now() |  |

**Indexes**: `idx_profiles_referral_code` + unique on `referral_code`.

### `connections`

**Purpose:** the IB pipeline kanban — every banker the user has reached out to and what stage they're in.
**Owner:** Planner / user (manually moved on /crm). Watcher writes too (when a banker reply moves a connection forward).
**RLS:** owner-only via `user_id = auth.uid()`.
**FK:** `user_id` → `profiles.id`, `banker_id` → `bankers.id` (nullable for legacy WarmIntro rows).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `user_id` | uuid | NO | — | Owner |
| `banker_id` | uuid | YES | — | Modern path. NULL for legacy WarmIntro `connections` from before bankers existed. |
| `alumni_id` | text | NO | — | **Legacy** — was the WarmIntro alum slug. Still required for old rows. |
| `alumni_name` / `alumni_role` / `alumni_email` / `alumni_linkedin_url` | text | mixed | — | Legacy mirrors of banker fields |
| `company_id` / `company_name` | text | NO | — | Legacy WarmIntro |
| `stage` | text | NO | `'sent'` | CHECK in `('sent','replied','coffee','referral','first_round','superday','offer','closed_lost')` — IB pipeline. |
| `notes_summary` | jsonb | YES | — | User notes, optionally structured |
| `warmth` | numeric | YES | — | Cached warmth score from Researcher |
| `last_send_message_id` | text | YES | — | Gmail message-id of the most recent send (helps Watcher dedupe replies) |
| `thread_id` | text | YES | — | Gmail thread id |
| `silence_days` | int | NO | 0 | Updated by Watcher: how many days since last activity |
| `needs_followup` | boolean | NO | false | Flagged by Watcher when silence >7d post-reply |
| `sent_at` / `updated_at` | timestamptz | NO | now() |  |

**Indexes:** `idx_connections_user`, `idx_connections_stage` (user_id, stage), unique on `(user_id, banker_id)` AND `(user_id, alumni_id)`.

### `funnel_states`

**Purpose:** XP / streak / badges for the gamification layer.
**Owner:** Planner (XP credits from sent / reply / coffee / referral events).
**RLS:** owner-only. PK is `user_id`.

| Column | Type | Default | Notes |
|---|---|---|---|
| `user_id` | uuid | — | PK + FK to profiles |
| `xp` | int | 0 | Cumulative XP |
| `level` | int | 1 | Calculated from xp |
| `level_name` | text | `'Networking Novice'` |  |
| `streak` | int | 0 | Days in a row with ≥1 outreach |
| `badges` | jsonb | `[]` | Earned badge ids |
| `recent_actions` | jsonb | `[]` | Last ~10 actions for the activity feed |
| `stages` | jsonb | `[]` | Snapshot of pipeline counts (legacy WarmIntro) |
| `total_outreach_done` | int | 0 |  |

### `selected_companies`

**Legacy WarmIntro** — companies the user picked during onboarding. PK is `(user_id, company_id)`. Not used in the IB flow (replaced by `profiles.target_firms`). RLS owner-only.

### `referrals`

**Legacy WarmIntro** — referral codes, unique on `referred_id`. RLS owner-only. Mostly unused in IB flow but tables stay for backwards compat.

### `trust_levels`

**Purpose:** per-user, per-capability autonomy ladder for autosend.
**Owner:** user (toggle in /account), Planner (auto-graduates on N approvals).
**RLS:** ALL via owner-only. PK is `user_id`.

| Column | Type | Default | Notes |
|---|---|---|---|
| `user_id` | uuid | — | PK + FK to auth.users |
| `send_new_email` | text | `'C'` | CHECK ∈ {'C','B','A'}. C = drafts only, B = preview-veto, A = autosend. |
| `send_followup` | text | `'C'` | same set |
| `send_reply` | text | `'C'` | same set |
| `approvals_count_new` / `_followup` / `_reply` | int | 0 | Auto-graduation counters |
| `stops_count` | int | 0 | Stop-button hits — used to demote |
| `auto_graduate` | boolean | true | User can disable auto-graduation |
| `preferred_send_time` | time | `'08:23'` | Local time for autosend |
| `preferred_timezone` | text | `'America/New_York'` |  |
| `daily_batch_size` | int | 5 | CHECK 1..15 — how many drafts/day Planner queues |
| `night_preview_enabled` | boolean | true | Whether to send the night-preview email |
| `tomorrow_override` | jsonb | YES | One-time override for next day's batch |
| `updated_at` | timestamptz | now() |  |

### `drafts`

**Purpose:** one row per outreach attempt to a banker. Flows through pending_critic → needs_revision → approved → sent.
**Owner:** Correspondent (creates), Critic (updates status via `critic_review_id`), user (approves/edits/skips).
**RLS:** ALL via owner-only — `user_id = auth.uid()`.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `user_id` | uuid | NO | — | FK auth.users |
| `banker_id` | uuid | YES | — | FK bankers (nullable for legacy / system drafts) |
| `connection_id` | uuid | YES | — | FK connections (nullable on cold; populated on followup/reply) |
| `type` | text | NO | — | CHECK ∈ {'cold','followup','reply','thank_you'} |
| `subject` | text | YES | — |  |
| `body` | text | NO | — | Final body (post-edits if user edited) |
| `pre_edit_ai_body` | text | YES | — | Snapshot of body the FIRST time user edits. Lets flywheel learn AI-vs-human diff. NULL means user never edited. |
| `user_edited_body` | text | YES | — | Same body but separately tracked when user explicitly hits Edit |
| `guardrail_flags` | jsonb | NO | `{}` | Result of `applyGuardrails()` — em-dashes replaced, banned phrases found, length |
| `fact_check` | jsonb | YES | — | Result of fact-checker agent — array of {claim, verdict, evidence_urls} |
| `status` | text | NO | `'pending_critic'` | CHECK ∈ {'pending_critic','needs_revision','approved','sent','skipped','edited_by_user','rejected_unresolvable'} |
| `iteration_count` | int | NO | 0 | How many Correspondent ↔ Critic round-trips |
| `critic_review_id` | uuid | YES | — | FK to most recent critic_reviews row for this draft |
| `critic_override` | boolean | NO | false | TRUE if user clicked "Send anyway" past a Critic reject |
| `scheduled_send_at` | timestamptz | YES | — | When auto-send fires (Trust=B/A) |
| `sent_at` | timestamptz | YES | — | When it actually sent |
| `sent_message_id` | text | YES | — | Gmail message-id |
| `gmail_draft_id` | text | YES | — | Gmail Drafts folder id (saved when Trust=A or user clicks "Save to Gmail") |
| `skip_reason` | text | YES | — | User-provided reason from Skip-with-reason modal. Fed into Correspondent on regenerate. |
| `created_at` / `updated_at` | timestamptz | NO | now() |  |

**Indexes:**
- `idx_drafts_user_status` (user_id, status) — every /today fetch hits this
- `idx_drafts_scheduled` partial — only on scheduled-and-approved
- `idx_drafts_gmail_draft_id` partial — only on rows with a Gmail draft id (Watcher uses this)
- **`uq_drafts_active_user_banker_type`** — UNIQUE on (user_id, banker_id, type) WHERE sent_at IS NULL AND status IN ('pending_critic','needs_revision','approved','rejected_unresolvable'). Prevents two parallel cold drafts to the same banker for the same user.

### `agent_runs`

**Purpose:** every agent invocation logs a row — trigger source, duration, tokens, error if any.
**Owner:** every agent (via `startAgentRun()` / `endAgentRun()` in `src/services/agents/shared.ts`).
**RLS:** owner-only — but `user_id` is nullable, and rows with NULL user_id (cron) are visible to no one via RLS. Service-role admin reads.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | nullable for cron (no user context) |
| `agent` | text | CHECK ∈ {'planner','researcher','correspondent','critic','watcher','curator'} |
| `triggered_by` | text | CHECK ∈ {'cron','event','user_command','agent_dispatch'} |
| `input_summary` / `output_summary` | jsonb | Small snapshots — full payloads NOT logged here |
| `duration_ms` | int |  |
| `claude_tokens_used` | int | Tracked but `claude_usage` is the canonical cost source |
| `error` | text | Set when the run threw. Sentinel alerts on any agent_runs.error in last 30min |
| `started_at` / `ended_at` | timestamptz |  |

**Indexes:** `(agent, started_at DESC)`, `(user_id, agent, started_at DESC)`.

### `signals`

**Purpose:** event log for the flywheel — every "interesting thing happened" gets a row. Single biggest table by row count.
**Owner:** every agent + many API routes (via `logSignal()` in `src/services/signals/log.ts`).
**RLS:** owner-only via `user_id = auth.uid()`. Rows with NULL `user_id` (system events) only visible to service-role.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` / `banker_id` / `connection_id` / `draft_id` | uuid | FKs, all nullable — depends on signal |
| `agent` | text | who emitted |
| `signal_type` | text | discriminator. Common values: `candidate_surfaced`, `draft_created`, `critic_approve`, `critic_reject`, `critic_escalate`, `draft_sent`, `draft_skipped`, `reply_received`, `welcome_email_sent`, `night_preview_sent`, `stale_summer_email_dropped`, `scout_completed`, etc. |
| `metadata` | jsonb | Free-form payload |
| `occurred_at` | timestamptz | now() |

**Indexes:** `(user_id, occurred_at DESC)`, `(signal_type, occurred_at DESC)`, `(banker_id, signal_type)`. Always query with at least one of these in the filter.

### `feedback`

**Purpose:** in-app floating-button feedback. Three kinds: `bug` / `feedback` / `praise`.
**Owner:** user (insert), admin (read all via service role).
**RLS:** users insert/read own rows. Admin reads all via service-role API.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK auth.users |
| `email` | text | Cached for admin convenience |
| `kind` | text | CHECK ∈ {'bug','feedback','praise'} |
| `body` | text | Free text |
| `page` | text | URL the user was on |
| `user_agent` | text |  |
| `resolved_at` | timestamptz | NULL until admin marks resolved |
| `created_at` | timestamptz |  |

**Indexes:** `(user_id, created_at DESC)`, partial on `(created_at DESC) WHERE resolved_at IS NULL`.

---

## 2. IB domain (RLS public-read for authed users)

### `firms`

**Purpose:** Bulge Bracket / Elite Boutique / Middle Market firms.
**Owner:** Curator (seeds + maintains). Public-read.
**Rows:** 24 (as of 2026-04-30). Seed in `src/data/seed/firms-groups.ts`.

| Column | Type | Notes |
|---|---|---|
| `id` | text | PK — slug like `goldman_sachs`, `pjt_partners`, `centerview` |
| `name` | text | Display name |
| `tier` | text | CHECK ∈ {'bulge_bracket','elite_boutique','middle_market'} |
| `domain` | text | Email domain (`pjtpartners.com`) — used by Hunter to construct emails |
| `logo_url` | text | optional |
| `hq_city` | text | optional |
| `created_at` | timestamptz |  |

### `groups`

**Purpose:** firm sub-teams (M&A, TMT, LevFin, Healthcare, etc).
**Owner:** Curator. Public-read.
**Rows:** 312.

| Column | Type | Notes |
|---|---|---|
| `id` | text | PK — slug like `gs_tmt`, `pjt_restructuring` |
| `firm_id` | text | FK firms |
| `name` | text |  |
| `kind` | text | CHECK ∈ {'coverage','product','region'} |
| `parent_group_id` | text | FK to groups (self) — for nested groups |

### `bankers`

**Purpose:** the people users reach out to. Heart of the IB domain.
**Owner:** Curator (24/7 ingestion via Serper / Hunter / directory imports).
**RLS:** public-read for any authenticated user.
**Rows:** 59 (small — actively growing).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | uuid | NO | PK |
| `firm_id` | text | YES | FK firms |
| `group_id` | text | YES | FK groups |
| `name` | text | NO |  |
| `title` | text | NO | Free text — "Investment Banking Summer Analyst", "VP", "Director", etc |
| `seniority` | text | YES | CHECK ∈ {'analyst','associate','vp','director','md'}. Coarse bucket; Researcher derives a finer score from title text. |
| `grad_year` | int | YES | E.g. 2024. Used for warmth (proximity to user). |
| `university` | text | YES | E.g. "Brown University". Used for same-school warmth boost. |
| `linkedin_url` | text | YES | Used by Scout for slug-matching findings |
| `email` | text | YES | NULL means we don't have a verified address. Researcher's `email IS NOT NULL` filter excludes these from drafting. |
| `email_verified` | boolean | NO | TRUE only if Hunter confirmed deliverable. Not currently used as a hard filter (only `email IS NOT NULL` is) but `verifyEmailViaHunter()` updates this. |
| `source` | text | YES | CHECK ∈ {'hunter','serper','rice_directory','brown_directory','user_added','manual_seed','proxycurl','curator'}. Provenance. |
| `created_at` / `updated_at` | timestamptz | NO | `updated_at` matters for stale-summer-analyst detection: if title contains "summer" or "intern" AND `updated_at > 270 days`, Researcher re-verifies via Hunter. |

**Indexes:** `(firm_id, group_id)`, `(university)`, partial `(email) WHERE email IS NOT NULL`.

### `banker_profiles`

**Purpose:** the deeper bio scrape — about_section, recent posts, education history. Joined to bankers 1:1.
**Owner:** Curator (Proxycurl/Serper background scrape). Public-read.
**Rows:** 0 (Proxycurl is paused; Scout is the runtime substitute).

| Column | Type | Notes |
|---|---|---|
| `banker_id` | uuid | PK + FK |
| `education` | jsonb | array of {school, degree, year, activities[]} |
| `past_positions` | jsonb | array of {firm, role, from, to} |
| `about_section` | text | bio paragraph |
| `recent_posts` | jsonb | array of {url, content, engagement, posted_at} |
| `recent_deals_mentioned` | jsonb |  |
| `volunteering` / `certifications` | jsonb |  |
| `languages` / `interests` | text[] |  |
| `scraped_at` | timestamptz |  |
| `scrape_source` | text | CHECK ∈ {'proxycurl','serper','manual'} |

### `banker_deals`

**Purpose:** verified deal participations — for citing specific deals in cold outreach.
**Owner:** Curator (Mergermarket / press / user_reply_extraction). Public-read.
**Rows:** 0 today (planned).

### `banker_findings`

**Purpose:** real-time scouted findings about a banker. Replacement for the old structured profile scrape.
**Owner:** Scout agent (`src/services/agents/scout.ts`). Public-read.
**Rows:** 2.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `banker_id` | uuid | FK |
| `url` | text |  |
| `title` | text |  |
| `snippet` | text |  |
| `source_type` | text | CHECK ∈ {'linkedin_post','article','press_mention','podcast','deal_announcement','other'}. Note: Scout in code now also returns `linkedin_profile` and `alumni_mention`; the CHECK constraint hasn't been migrated yet — pending. |
| `published_hint` | text |  |
| `scouted_at` | timestamptz | now() |
| `expires_at` | timestamptz | now() + 14 days. Researcher re-scouts after expiry. |

**Indexes:** `(banker_id, expires_at DESC)`, UNIQUE `(banker_id, url)` (idempotent upsert).

---

## 3. Agent infrastructure

### `critic_reviews`

**Purpose:** per-iteration Critic verdict on a draft.
**Owner:** Critic (`src/services/agents/critic.ts`).
**RLS:** read via the parent draft (`drafts.user_id = auth.uid()`).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `draft_id` | uuid | FK |
| `verdict` | text | CHECK ∈ {'approve','reject','escalate_to_planner'} |
| `overall_score` | numeric | 0..10 |
| `scores` | jsonb | per-axis: `{guardrails, voiceMatch, specificity, sharedGround}` (0..10 each) |
| `feedback` | text | The single string the Correspondent's prompt gets cumulatively in `revisionFeedbackHistory` |
| `suggested_revision` | text | Sometimes Critic writes a sample fix |
| `created_at` | timestamptz |  |

**Indexes:** `(draft_id)`. Multiple reviews per draft (one per iteration).

### `draft_iterations`

**Purpose:** snapshot of body + verdict per iteration. Lets the prompt-iteration view show "what was iter 0 vs iter 1?"
**Owner:** Correspondent (snapshots iter N) + Critic (annotates with verdict).
**RLS:** read via parent draft.
**Rows:** 27.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `draft_id` | uuid | FK |
| `iteration` | int | 0,1,2... |
| `subject` / `body` / `guardrail_flags` / `fact_check` | mirrors of drafts at that iteration |
| `critic_review_id` / `critic_verdict` / `critic_feedback` / `critic_score` | what Critic said |

**Indexes:** UNIQUE `(draft_id, iteration)`.

### `claude_usage`

**Purpose:** per-call Anthropic usage log keyed to the user (when known) and agent.
**Owner:** every askClaude / askClaudeJSON call (fire-and-forget). See `src/services/claude.ts`.
**RLS:** user reads own + service-only writes.
**Rows:** 131 today, growing fast.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | nullable when no user context (e.g. cron) |
| `agent` | text | "correspondent", "critic", etc. |
| `model` | text | "claude-opus-4-7", "claude-sonnet-4-20250514" |
| `input_tokens` / `output_tokens` | int |  |
| `cost_usd` | numeric | priced via `priceFor(model, input, output)` |
| `occurred_at` | timestamptz | now() |

**Indexes:** `(occurred_at DESC)`, `(user_id, occurred_at DESC)`. Sentinel reads from these for the $5/24h alert.

---

## 4. Flywheel & schema governance

### `scoring_weights`

**Purpose:** weekly-tuned weights for warmth scoring and ranking. ML pipeline output.
**Owner:** weekly batch job. Public-read.
**Rows:** 1 active.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `version` | int | UNIQUE |
| `weights` | jsonb | `{bankerResponseRate: {<id>: 0..1}, ...}` |
| `produced_by` | text | `'weekly_batch'` |
| `is_active` | boolean | UNIQUE WHERE is_active=true (only one active set at a time) |

### `critic_calibration`

**Purpose:** tracks Critic score buckets vs actual reply outcomes — for re-calibration.
**Owner:** weekly batch. Public-read.

### `flywheel_releases`

**Purpose:** "what changed this week" log — published with each weekly batch.
**Owner:** weekly batch. Public-read. Surfaced on the public landing.

### `schema_proposals`

**Purpose:** Curator's authority to propose schema changes. Admin reviews + approves manually for v1.
**Owner:** Curator (insert), admin (review/approve).
**Rows:** 2 pending.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `proposed_by` | text | default `'curator'` |
| `change_type` | text | CHECK ∈ {'add_column','add_table','add_index','alter_column','drop_unused','other'} |
| `sql` | text | The DDL the Curator wants to run |
| `rationale` | text |  |
| `status` | text | CHECK ∈ {'pending','approved','rejected','executed','reverted'}. Admin flips status; nothing executes automatically yet. |
| `reviewed_by` / `reviewed_at` / `executed_at` | mixed |  |

---

## 5. Auth & misc

### `password_reset_tokens`

**Purpose:** self-owned password recovery — bypasses Supabase Auth's recovery template entirely.
**Owner:** `/api/auth/reset-password` (insert), `/api/auth/set-password` (mark used).

| Column | Type | Notes |
|---|---|---|
| `token` | text | PK — 64-char hex from `randomBytes(32)` |
| `user_id` | uuid | FK |
| `email` | text | normalized lowercase |
| `expires_at` | timestamptz | now() + 60 min |
| `used_at` | timestamptz | NULL until consumed (single-use) |
| `ip` / `user_agent` | text | audit trail |

### `pilot_signups`

**Purpose:** the closed-beta waitlist. Inserted by the public /request-access form (anon role can insert). Read-by-service so admin sees the queue.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `email` | text | UNIQUE |
| `name` / `university` / `major` / `graduation_year` | mixed |  |
| `skills` / `target_industries` | jsonb |  |
| `resume_text` | text |  |
| `created_at` | timestamptz |  |

**Note**: the `e2e-*@brown.edu` rows from CI smoke tests pile up here; the Admin "Clean e2e signups" button bulk-deletes them.

### `events`

**Purpose:** front-end analytics — page_view, JS error, etc.
**Owner:** browser via `src/lib/track.ts`.
**RLS:** "Anyone can insert" + service reads.
**Rows:** 422.

### `demo_sessions`

**Purpose:** persists the public /demo's parsed resume + people-found list. Anonymous (no user_id).
**Owner:** anon (insert only — `No client reads` policy).

---

## RLS gotchas

- **Service-role bypasses RLS** — admin routes (`/api/admin/*`) and agents that use `createClient(URL, SERVICE_ROLE_KEY)` ignore policies entirely. Make sure those endpoints check admin email manually.
- **`auth.uid()` is NULL when called from service-role** — so an `auth.uid() IS NOT NULL` policy locks anonymous out but lets every authenticated user through. Used for "any logged-in user can read this reference data."
- **Restrictive policies stack with permissive** — most policies are permissive. Don't add a RESTRICTIVE one unless intentional.
- **No INSERT on signals/agent_runs from clients** — these are service-only via the agent helpers.

## Common foreign-key chains

```
auth.users (Supabase Auth)
  └─ profiles (1:1, user_id is the PK)
       └─ connections (user → many bankers)
       │     └─ bankers
       └─ drafts (user → many bankers, optional connection)
       │     ├─ critic_reviews (1 draft → many reviews)
       │     ├─ draft_iterations (1 draft → many iterations)
       │     └─ signals (draft_id is one of several optional FKs)
       ├─ trust_levels (1:1)
       ├─ funnel_states (1:1)
       └─ agent_runs / signals / feedback / claude_usage  (user → many)

firms ─┬─ groups ─┬─ bankers ─┬─ banker_profiles (1:1)
       │          │           ├─ banker_deals (1:many)
       │          │           ├─ banker_findings (1:many)
       │          │           └─ drafts.banker_id, connections.banker_id
       │          └─ profiles.target_groups (text[] of slugs)
       └─ profiles.target_firms (text[] of slugs)
```

## Where things are read/written in code

- **profiles** — `/api/profile`, `/api/setup/*`, Researcher (`loadUserProfile`)
- **bankers** — Researcher (`queryBankerDB`), Correspondent (`buildDraftPrompt`), Curator (insert/update)
- **banker_findings** — Scout (read+upsert), Correspondent (read)
- **drafts** — Correspondent (insert/update), Critic (update via critic_review_id), `/api/drafts/[id]/*` routes
- **critic_reviews** — Critic only
- **draft_iterations** — Correspondent + Critic
- **signals** — every agent + many API routes via `logSignal()`
- **agent_runs** — every agent via `startAgentRun` / `endAgentRun`
- **trust_levels** — `/api/trust`, Planner (auto-graduation)
- **connections** — Watcher (state advances), `/api/connections/*`, `/crm` page
- **password_reset_tokens** — `/api/auth/reset-password`, `/api/auth/set-password`, `/api/admin/users/[id]/send-welcome`
- **claude_usage** — every askClaude call via `logUsage()` (fire-and-forget)
- **feedback** — `/api/feedback`, /admin reads via service-role
- **events** — browser via `src/lib/track.ts`, /admin replay panel

---

## Regenerating this doc

Run these in the Supabase SQL editor (project → SQL Editor → New query) or
via the Supabase MCP. Paste the results back into this file at the right
sections.

### 1. Tables, columns, comments

```sql
SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  pgd.description AS column_comment
FROM information_schema.columns c
LEFT JOIN pg_catalog.pg_statio_all_tables st
  ON st.schemaname = c.table_schema AND st.relname = c.table_name
LEFT JOIN pg_catalog.pg_description pgd
  ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;
```

### 2. RLS policies

```sql
SELECT tablename, policyname, cmd, qual::text AS using_expr, with_check::text AS check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 3. Indexes

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;
```

### 4. Foreign keys

```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

### 5. RLS enabled + row counts

```sql
SELECT c.relname AS tablename,
       c.relrowsecurity AS rls_enabled,
       COALESCE(s.n_live_tup, 0) AS row_count
FROM pg_class c
LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
ORDER BY c.relname;
```
