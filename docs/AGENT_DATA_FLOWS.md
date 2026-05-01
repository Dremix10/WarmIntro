# Alma — Agent + data flows

A walkthrough of what gets read and written for each main flow. Pair with
`docs/DATABASE_SCHEMA.md` (table definitions) and `src/services/agents/*`
(actual implementation).

## The 6 agents in one paragraph each

- **Planner** (`src/services/agents/planner.ts`) — deterministic. No LLM. The orchestrator. On every cron tick or `/api/agents/run-now`, it: reads `profiles`, `trust_levels`, `connections`, `drafts`; decides what to do; dispatches Researcher / Correspondent / Watcher / Critic. Auto-graduates trust levels on N approvals. Logs `agent_runs` and `signals`.

- **Researcher** — finds + ranks bankers. Reads `bankers` (filter by `target_firms` / `target_groups`, `email IS NOT NULL`). Reads `connections` to exclude already-contacted. Computes warmth score (`computeWarmth()` in researcher.ts). Re-verifies stale-summer-analyst rows via Hunter. Asks Claude for a one-line "why this banker." Returns ranked candidates. Writes `signals` with `candidate_surfaced`.

- **Correspondent** — drafts emails. Reads banker context (`bankers`, `banker_profiles`), calls Scout to populate `banker_findings`, runs `findCommonGround` tool, builds the draft prompt, asks Opus 4.7 for subject + body. Applies `applyGuardrails()` (em-dashes, banned phrases, length). Inserts/updates `drafts` row. Reads prior `critic_reviews.feedback` for revise iterations.

- **Critic** — reviews every draft. Reads `drafts`, runs the fact-checker (which writes `drafts.fact_check`), scores 4 axes via Claude, writes `critic_reviews` (one row per iteration), updates `drafts.status` and `drafts.critic_review_id`. Verdict ∈ {approve, reject, escalate_to_planner}. Writes `signals` with `critic_*`.

- **Watcher** — polls Gmail for replies. Reads `profiles.gmail_*` tokens, fetches new messages since last poll, classifies intent via Claude, advances `connections.stage`, writes `signals` with `reply_received` / etc. Also detects user-sent drafts when `drafts.gmail_draft_id` becomes a sent message.

- **Curator** — 24/7 background data steward. Discovers new bankers via Serper, enriches via Hunter, refreshes stale rows, dedupes, proposes schema changes (`schema_proposals`).

## Flow 1: User clicks "Run Alma now" on /today

```
/api/agents/run-now (or cron tick)
        │
        ▼
┌───────────────────┐
│   Planner         │  reads: profiles, trust_levels, connections, drafts (count by status)
│                   │  writes: agent_runs (start), signals (planner_run_started)
└────────┬──────────┘
         │  decides: needs N more cold drafts based on daily_batch_size
         ▼
┌───────────────────┐
│   Researcher      │  reads: bankers (filtered), connections (exclude), scoring_weights
│                   │  writes: agent_runs, signals (candidate_surfaced × N)
│                   │  for each stale-summer banker: calls Hunter verifier
│                   │    if undeliverable → bankers.email = NULL + signal stale_summer_email_dropped
└────────┬──────────┘
         │ returns ranked candidates
         ▼
┌───────────────────┐
│   Correspondent   │  reads: bankers, banker_profiles, banker_findings, profiles
│   (per candidate) │  calls: Scout → upserts banker_findings; findCommonGround tool
│                   │         askClaudeJSON(Opus) for subject+body → claude_usage row
│                   │  applies guardrails → drafts row (status=pending_critic)
│                   │  writes: drafts (insert OR update existing draft on revise),
│                   │          draft_iterations (snapshot at iter N),
│                   │          signals (draft_created, anchors)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│   Critic          │  reads: drafts, banker context, profiles
│                   │  runs fact-checker → drafts.fact_check
│                   │  asks Claude (Opus) for axis scores → claude_usage row
│                   │  writes: critic_reviews (insert), drafts.status update,
│                   │          draft_iterations.critic_* fields,
│                   │          signals (critic_approve | critic_reject | critic_escalate)
└────────┬──────────┘
         │
         ├── verdict = approve  → drafts.status = 'approved', stop. Trust=A also schedules send.
         ├── verdict = reject AND iteration < 3
         │     → loop back into Correspondent with cumulative critic feedback
         └── verdict = reject at iter=3 OR verdict = escalate_to_planner
               → drafts.status = 'rejected_unresolvable', surface to user with "Send anyway" UX
```

End state per candidate: a row in `drafts` ready for user action on /today. Critic's per-axis scores are in `critic_reviews.scores`. The flywheel learns from these signals.

## Flow 2: User clicks Approve on /today

```
POST /api/drafts/[id]/approve
        │
        ├── if Trust=C → drafts.status = 'approved', no send. User has to hit Send manually next.
        ├── if Trust=B → drafts.status = 'approved', drafts.scheduled_send_at = now()+30min. Cron picks it up.
        └── if Trust=A → drafts.status = 'approved', schedule immediate. Optionally save to Gmail Drafts.

trust_levels.approvals_count_<type>++ → maybe Planner auto-graduates trust level next tick.
```

## Flow 3: User clicks Send on an approved draft

```
POST /api/drafts/[id]/send
        │
        ▼
┌─────────────────────┐
│  src/services/gmail/send.ts │  reads: profiles.gmail_* tokens (decrypt)
│                              │  refreshes access token if expired
│                              │  sends via gmail.users.messages.send
│                              │  returns sent_message_id, threadId
└─────────┬───────────┘
          │
          ▼
   drafts.status = 'sent', drafts.sent_at = now(),
   drafts.sent_message_id = <gmail id>
   connections row created OR updated (stage='sent', warmth=draft warmth, thread_id=<id>)
   signals: draft_sent
   funnel_states: xp += outreach_sent (10)
```

## Flow 4: User clicks Skip with a reason on /today

```
POST /api/drafts/[id]/skip { reason, regenerate }
        │
        ├── always:
        │     drafts.status = 'skipped', drafts.skip_reason = <reason>
        │     deletes Gmail draft if any
        │     signals: draft_skipped (metadata: reason, regenerated)
        │
        └── if regenerate=true:
              read all prior critic_reviews.feedback for this draft
              build revisionFeedbackHistory + 'USER SKIPPED: <reason>'
              call runCorrespondent (creates fresh draft for same banker)
              call runCritic on the new one
              return new draftId so /today can refresh and show it
```

## Flow 5: Watcher cron tick (every minute via Ubuntu VPS, daily backup via Vercel)

```
GET /api/cron/tick (with bearer token)
        │
        ▼
   Planner.dispatchWatcher(userId batch — up to 50 stale users at a time)
        │
        ▼
┌────────────────────┐
│   Watcher          │  reads: profiles.gmail_* (decrypt)
│   (per user)       │         connections.thread_id, drafts.gmail_draft_id
│                    │  fetches: gmail.users.history.list since lastHistoryId
│                    │  for each new message:
│                    │    classify intent via Claude (claude_usage row)
│                    │    if reply to known thread → connections.stage advance,
│                    │                                signals: reply_received
│                    │    if user manually sent a draft (gmail_draft_id sent) →
│                    │       drafts.status = 'sent', drafts.sent_at = <gmail date>,
│                    │       signals: draft_sent (via=user_marked_sent)
└────────────────────┘
```

## Flow 6: Admin approves a waitlist row → user gets welcome email

```
POST /api/admin/access-requests/[id]/approve
        │
        ▼
   reads pilot_signups row (email, name, university, resume_text)
   creates auth.users row (or reuses if existing)
   creates profiles row from signup data
   mints password_reset_tokens (1h TTL)
   sends welcome via Resend (welcome@alma.careers)
       — body from src/lib/welcome-email.ts (single source of truth)
       — link goes to /reset-password?token=<token>
   fires Telegram alert with the link (admin backup)
   signals: welcome_email_sent
```

For users created outside this flow (e.g. ce53@rice.edu, manually inserted), use the per-user **Send welcome** button on /admin which calls `/api/admin/users/[id]/send-welcome` — same email body, fresh token.

## Important invariants

- **Unique active draft per (user, banker, type)** — `uq_drafts_active_user_banker_type` index. Revise iterations MUST update the existing row; INSERT silently fails. See comment in correspondent.ts.
- **email IS NOT NULL gates banker selection** — Researcher will skip any banker without an email. Setting `email = NULL` is how we exclude (e.g., the stale-summer-analyst nullify path).
- **Trust gradient is per-capability** — `send_new_email` / `send_followup` / `send_reply` move independently. Don't read just one and assume the others.
- **All signals + agent_runs writes are fire-and-forget** — never await them on the user-visible critical path.
- **claude_usage is also fire-and-forget** — failures here must not block the actual Claude call.

## What Curator does in the background

- Discovers new bankers from Serper (LinkedIn search) → inserts into `bankers` with `source='curator'`.
- Enriches missing emails via Hunter → updates `bankers.email`, `email_verified`.
- Refreshes stale rows (e.g., Scout findings expiring in `banker_findings.expires_at`).
- Dedupes obvious duplicates.
- Proposes schema changes via `schema_proposals` (admin-gated for v1).

Curator runs every `/api/cron/curator-hot` tick (currently daily on Vercel; minute-granular on Ubuntu VPS).
