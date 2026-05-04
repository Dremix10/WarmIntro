# Monitoring — the activity tracker pattern

This doc describes the live monitoring setup used during Claude-driven development sessions, so it can be recreated in any other environment (Codex, a terminal, a Slack webhook, etc.).

## What it watches

Alma's runtime state lives in the **`signals`** table in Supabase. Every notable thing — a draft sent, a Critic verdict, a user replying with a night-preview override, a planner crash, a trust auto-graduation — writes one row via `logSignal()` (`src/services/signals/log.ts`). The `signals` table is append-only and is the canonical event stream for both the flywheel weekly aggregation (`src/services/signals/aggregate.ts`) and live monitoring.

Schema (subset):
```
id            uuid
user_id       uuid (nullable for system-wide events)
banker_id     uuid (nullable)
connection_id uuid (nullable)
draft_id      uuid (nullable)
agent         text  -- planner | researcher | correspondent | critic | watcher | curator | architect | scout | sentinel
signal_type   text  -- enumerated below
metadata      jsonb
occurred_at   timestamptz
```

## How "Activity tracker v4 (critic_reviews path disabled)" worked in Claude sessions

A Monitor-tool background process polled Supabase every ~30s for new rows in `signals`, filtered to interesting types, and emitted one stdout line per row. Each line became a chat notification. The format was:

```
[HH:MM:SS] 📡 user_email · signal_type · {metadata_json}
```

**The "v4 (critic_reviews path disabled)" naming** comes from iteration history: earlier versions also surfaced every `critic_${verdict}` row, but the Critic emits 1–3 signals per draft, which was too noisy to be useful for real-time attention. v4 explicitly omits them. The Architect agent's daily 16:00 UTC digest is the right place to see critic patterns in aggregate; live monitoring should focus on user-visible state changes and failures.

## Recreate it (bash poll loop)

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`, then:

```bash
#!/usr/bin/env bash
# alma-monitor.sh — tail interesting Alma signals
set -euo pipefail
LAST_TS="$(date -u -v -10M +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null \
        || date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S.000Z)"

# Signals worth interrupting work for. Excludes critic_* (too chatty),
# scout_completed (background), candidate_surfaced (background),
# curator_run_* (background), sentinel_run (meta).
INTERESTING="critic_override,critic_rejected_unresolvable_escalated,\
draft_send_failed,draft_post_send_db_failed,draft_revert_failed,\
planner_run_failed,planner_run_slow,planner_crash,\
welcome_email_sent,welcome_email_failed,\
reset_password_failed,gmail_oauth_expired,\
trust_graduated_C_to_B,trust_graduated_B_to_A,\
night_preview_override_applied,reply_received,\
draft_sent,draft_skipped,draft_edited,\
fact_check_unavailable,rejected_no_common_ground,\
stage_replied,stage_coffee,stage_referral,stage_first_round,stage_superday,stage_offer"

while :; do
  NOW="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
  curl -s --get "${SUPABASE_URL}/rest/v1/signals" \
    --data-urlencode "occurred_at=gt.${LAST_TS}" \
    --data-urlencode "signal_type=in.(${INTERESTING})" \
    --data-urlencode "order=occurred_at.asc" \
    --data-urlencode "select=occurred_at,signal_type,metadata,user_id" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | jq -r --unbuffered '
      .[] | "[\(.occurred_at | split("T")[1] | split(".")[0])] 📡 \(.user_id // "system") · \(.signal_type) · \(.metadata)"
    ' || true
  LAST_TS="$NOW"
  sleep 30
done
```

`user_id` is a UUID; if you want emails like the Claude tracker showed, join to `auth.users` (a service-role read) — easiest is a single up-front fetch into a local map and refresh hourly.

## Signal taxonomy

Grouped by emitter. The full source-of-truth list is whatever `grep -rn 'signalType:' src/` returns; this is the snapshot as of 2026-05-03.

### Auth flow
| Signal | Emitter | Meaning |
| --- | --- | --- |
| `reset_password_unknown_email` | `/api/auth/reset-password` | Forgot-password form submitted with an email not in auth.users |
| `reset_password_sent` | `/api/auth/reset-password` | Reset email dispatched |
| `reset_password_failed` | `/api/auth/reset-password` | Send error |
| `password_set` | `/api/auth/set-password` | User completed reset and set a new password |
| `welcome_email_sent` | `/api/admin/access-requests/[id]/approve`, `/api/admin/users/[id]/send-welcome`, `scripts/resend-welcome.ts` | Admin approved a request or manually re-sent welcome |
| `welcome_email_failed` | same | Send error |

### Planner orchestration
| Signal | Meaning |
| --- | --- |
| `planner_nudge` | Planner queued an action for the user (handled by Planner-issuer code) |
| `planner_run_slow` | Per-user run exceeded threshold |
| `planner_run_failed` | Exception during run |
| `planner_crash` | Uncaught crash (raised to Sentinel) |
| `trust_graduated_C_to_B` | Capability auto-graduated based on user behavior |
| `trust_graduated_B_to_A` | Capability auto-graduated to autopilot |

### Researcher
| Signal | Meaning |
| --- | --- |
| `candidate_surfaced` | Banker added to the draft candidate pool |
| `stale_summer_email_dropped` | Hunter re-verify nullified a >270d-old SA contact |

### Correspondent
| Signal | Meaning |
| --- | --- |
| `draft_created` | New draft persisted (pre-Critic) |
| `draft_skipped_duplicate` | Skipped because banker already has an open draft |
| `rejected_no_common_ground` | Correspondent refused to draft — anchors too thin |

### Critic *(excluded from the v4 live tracker — too chatty; surfaces in admin + flywheel)*
| Signal | Meaning |
| --- | --- |
| `critic_approve` / `critic_revise` / `critic_reject` | Per-draft verdict |
| `critic_override` | User shipped a Critic-rejected draft anyway |
| `critic_rejected_unresolvable_escalated` | Critic ran out of revise iterations; draft escalated to user |
| `fact_check_unavailable` | Critic couldn't fact-check (no banker_profile row) |

### Architect *(meta agent — daily digest, see `project_email_iteration_plan` doc)*
| Signal | Meaning |
| --- | --- |
| `architect_review_skipped` | Not enough new data to review since last digest |
| `architect_review_completed` | Daily digest shipped (Telegram) |

### Curator *(background — usually excluded from live tracker)*
| Signal | Meaning |
| --- | --- |
| `curator_run_${mode}` | One Curator run completed; `mode` is `hot` / `full` / specific subtask |

### Scout *(background — usually excluded)*
| Signal | Meaning |
| --- | --- |
| `scout_completed` | One Scout sweep finished, with finding counts in metadata |

### Watcher (Gmail polling)
| Signal | Meaning |
| --- | --- |
| `reply_received` | Watcher detected a reply on a thread Alma owns |
| `night_preview_override_applied` | User replied to night-preview email with overrides (`SKIP`, `LATER 10`, `MORE 3`, etc.) |
| `silence_detected` | Window passed with no reply on a sent draft |

### Sentinel (alerts)
| Signal | Meaning |
| --- | --- |
| `sentinel_run` | One sentinel cycle ran (meta) |
| `alert_${key}` | A sentinel check fired — `key` identifies which |

### Pipeline / stage advancement
| Signal | Meaning |
| --- | --- |
| `stage_${stage}` | Connection advanced into `${stage}` (sent / replied / coffee / referral / first_round / superday / offer / closed_lost) |

### Drafts (user actions on `/today`)
| Signal | Meaning |
| --- | --- |
| `draft_sent` | Draft sent via Gmail (Sent successfully) |
| `draft_skipped` | User skipped a draft (with optional reason) |
| `draft_edited` | User edited the draft body before sending |
| `draft_send_failed` | Gmail send error |
| `draft_post_send_db_failed` | Send succeeded, but DB writeback failed (corrupt state — flagged) |
| `draft_revert_failed` | Send-revert path failed (rare) |

### Cron
| Signal | Meaning |
| --- | --- |
| `night_preview_sent` | Night-preview email dispatched for a user |

## Reading signals from the app

- **Per-user audit:** `GET /api/account/activity` (`src/app/api/account/activity/route.ts`) returns sent drafts + watcher signals + night-preview signals for the calling user. Used by `/account/privacy`.
- **Per-connection history:** `/pipeline` page renders the per-banker signal trail (filtered to that connection or banker).
- **Today panel:** `/today` page shows recent signals; `humanSignal()` in `src/app/today/page.tsx` is the user-facing translation function — refer to it when adding a new signal_type that should surface to users.
- **Aggregate / flywheel:** `src/services/signals/aggregate.ts` runs Sundays.

## When you add a new signal_type

1. `await logSignal({ ... signalType: "your_new_signal", ... })` from the emitter.
2. If it should surface to the end-user on `/today`, add a case in `humanSignal()`.
3. If it should interrupt during live monitoring, add it to the `INTERESTING` list above (or whichever monitor implementation you're using).
4. If it should affect flywheel scoring, register it in `scoring_weights` (per the spec).

## Variants of the live tracker (for migration)

| Surface | Implementation |
| --- | --- |
| **Codex CLI** | Run the bash script above in a `tmux` pane or as a `launchd` agent on macOS. |
| **Telegram** | Wrap the jq output in a `curl` to the Telegram Bot API (already used by Sentinel + Architect — see `src/services/notifications/telegram.ts`). |
| **Slack** | Same shape, post to incoming-webhook URL. |
| **macOS notification** | Pipe each line through `terminal-notifier` or AppleScript `display notification`. |
| **Vercel logs** | Skip the poll entirely — every `logSignal` call also logs `console.warn` on failure; use `vercel logs --follow` for failures only. |
