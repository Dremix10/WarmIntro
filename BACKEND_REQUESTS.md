# Backend Requests

Running log of backend/infra changes surfaced by frontend design work.
**Owner:** cofounder. **Pair read:** `FRONTEND_HANDOFF.md`.

Format: `[Date] · [Request] — why, acceptance notes`

---

## P0 — blocks the pipeline narrative

### Outbound email send from Alma
- **Why:** today the student copies the draft and sends from their personal mail client; we can't reliably track whether it was sent or measure response time. "Mark as sent" is a self-report.
- **What to build:**
  - OAuth connection to the user's email (Gmail first, Outlook later) with `send` scope
  - Server-side send endpoint: `POST /api/outreach/send` with `{ draftId, recipient, body, subject? }`
  - Store the message-id so replies can be matched
- **Acceptance:** student clicks "Send" inside Alma, message goes out from their real address, message-id stored in DB.
- **Used by:** `/outreach/[id]` compose view.

### Inbound reply detection
- **Why:** the funnel math only works if we actually know when replies come in. Today there's no feedback loop.
- **What to build:**
  - Either (a) Gmail Push via Google Pub/Sub watching the inbox, or (b) IMAP polling ~5 min, or (c) shared forwarding address
  - Thread matching via `In-Reply-To` / `References` against stored message-ids
  - On match: advance that connection's `stage` from `sent → replied` automatically, emit event for notifications
- **Acceptance:** when an alum replies, the connection moves stage on the dashboard within ~5 min without user action.
- **Depends on:** outbound send endpoint.

### Notifications
- **Why:** the emotional lift of a reply is the core reward. The student must know it happened.
- **What to build:**
  - In-app notification center (bell in NavHeader, unread badge)
  - Optional email/push: "Maya from Linear replied" with preview
  - Trigger on: new reply, coffee booked, milestone unlocked, 5-day-silence nudge, weekly recap ready
- **Acceptance:** student gets a real-time notification the moment reply is detected.
- **Depends on:** reply detection.

---

## P0 — blocks new pages

### Warmth score persistence
- **Why:** the archipelago (`/network`), CRM size-by-warmth, and outreach warm-path narrative all rely on a numeric warmth 0–100 per connection. Currently computed ephemerally in `alumni-engine.ts` and thrown away.
- **What to build:**
  - Persist `warmth: number` on each `TrackedConnection` row
  - Recompute on stage change (so replies bump warmth)
  - Surface through `loadProfile` / `connections` endpoints
- **Acceptance:** `connection.warmth` is a stable numeric field every frontend can read.

### Quest engine
- **Why:** `/quests` relies on quest records persisting across sessions. Without this the page is decorative.
- **What to build:**
  - Tables: `quests` (id, user_id, title, why, target, progress, reward_xp, created_at, expires_at, status), `milestones` (id, user_id, title, note, xp, unlocked_at, fresh_until)
  - Weekly Monday cron: for each active user, generate 2–3 personalized quests based on pipeline state (Claude writes `title` + `why`, backend picks target from heuristics)
  - Endpoints: `GET /api/quests/active`, `POST /api/quests/:id/complete`, `POST /api/quests/:id/skip`
- **Acceptance:** `/quests` renders live data for the signed-in user; quest completion awards XP and logs a milestone.

### Milestone engine
- **Why:** `/quests` milestone feed + in-app celebration pop-ins need event-driven milestones.
- **What to build:**
  - Event listeners on funnel writes (first reply, 10/25/50/100 sent, first coffee, week streak, came-back-after-break)
  - On trigger, call Claude for a mentor-voice `note` and persist milestone row
  - Milestones surface via `GET /api/milestones/recent?limit=10`
- **Acceptance:** crossing a threshold produces a milestone row with an Alma-voice note within ~30 sec.

### Weekly recap generator
- **Why:** `/recap` is the Sunday letter — Alma's single highest-impact comms moment. Needs a generator.
- **What to build:**
  - Cron every Sunday 4pm user-local (or UTC fallback): for each active user, gather the week's pipeline data, company-by-company state, send-time patterns, response rates
  - Feed to Claude with a strict system prompt (short, second person, specific, no em-dashes, three quest suggestions)
  - Store result in `recaps` table; serve via `GET /api/recap/current`
- **Acceptance:** every Sunday the user has a new recap waiting at `/recap`.

### Cohort aggregation
- **Why:** `/cohort` aggregates anonymous numbers across classmates. Needs a nightly rollup.
- **What to build:**
  - Nightly job: aggregate `sent`, `replies`, `coffees`, `referrals` by (school, class_year) for the past 7 days
  - Emit 3–8 anonymized signals per cohort (pick interesting events; strip identifying info)
  - Endpoint: `GET /api/cohort/summary?school=brown&classYear=2027`
- **Acceptance:** `/cohort` renders live numbers; signals are recent (<48h old) and never identify a specific student.

---

## P1 — polish / quality

### Email copywriting guardrails in Claude prompts
- **Why:** current drafts read as AI-written. The tells are em-dashes (—) and overly-formal cadence.
- **What to change:** in `src/services/outreach-writer.ts`, add to system prompt:
  - "Do not use em-dashes (—). Use commas, periods, or separate sentences."
  - "Write like a 20-year-old college junior messaging someone they admire. Casual but thoughtful. Short sentences ok."
  - "Avoid words a student wouldn't use: cognizant, leverage, endeavor, synergy, furthermore, accordingly, aforementioned."
  - "Contractions are fine. Starting a sentence with 'And' or 'But' is fine."
  - Post-generation regex: if `—` found, replace with `. ` or `, ` or regenerate.
- **Acceptance:** blind test of 20 generated drafts reads as student-written. Zero em-dashes.

### Email + contact discovery
- **Why:** `linkedin-search.ts` finds LinkedIn profiles but not emails. Can't send from Alma if we don't have the address.
- **What to build:**
  - Integrate an email-finder (Hunter.io, Apollo, RocketReach — compare hit-rate + price)
  - Fall back to `first.last@domain` with MX verification
  - Cache by (name + company) to avoid re-billing
- **Acceptance:** ≥70% of surfaced alumni have a verified email in the DB.

### Recommended industries + curated shortlist
- **Why:** `/profile` highlights 2 industries as "Alma's pick". `/companies` shows a shortlist of 6 with a "why" line. Both need a Claude pass using the parsed profile.
- **What to build:**
  - In `resume-parser.ts` or a new `profile-recommendations.ts`: after parse, call Claude with profile → emit `{ recommendedIndustries: string[], shortlistReasons: Record<companyId, string> }`
  - Store on the profile row
- **Acceptance:** newly-signed-up user sees 2 industries marked "Alma's pick" and 6 companies with specific one-sentence reasons.

### Pipeline trajectory history
- **Why:** `/pipeline` renders a 12-week actual-vs-target line chart. Needs weekly snapshots.
- **What to build:**
  - Weekly Sunday cron: snapshot `{ weekIso, sent, replies, coffees, referrals, interviews, offers }` per user to `pipeline_snapshots` table
  - Endpoint: `GET /api/pipeline/trajectory?weeks=12`
- **Acceptance:** chart shows smooth actual line up to this week + dashed target line through end of semester.

### Today's tasks generator
- **Why:** `/pipeline` Today panel shows 3 actionable tasks. Needs a daily generator.
- **What to build:**
  - Daily 7am user-local cron: for each user, generate 3 tasks based on pipeline state (fresh replies → draft reply; quiet > 5d → follow up; upcoming coffees → prep)
  - Store in `today_tasks` table with `date` + `user_id`; expire daily
- **Acceptance:** pipeline always shows 3 tasks per day, each linking to a specific action.

### Coach notes (weekly read)
- **Why:** the italic Fraunces Alma-voice quotes on `/pipeline`, `/crm`, `/network`. Currently hardcoded.
- **What to build:**
  - Weekly Monday cron: generate a 2–3 sentence weekly read per user via Claude, stored with user row
  - Regenerate on demand if pipeline changes materially mid-week
- **Acceptance:** each user sees a fresh mentor-voice read that references specific people/companies in their pipeline.

---

## P2 — roadmap (nice to have)

### Private accountability pods
2–3 classmates opt in to a shared goal and gentle nudges. Needs group invites + shared-goal tracking.

### Network graph export
Let students export their archipelago as a PNG to share or screenshot.

### Calendar integration
Coffee-booking creates a real calendar event (Google Calendar OAuth, already partially scoped).

### Mobile push via Expo or OneSignal
Once web push feels stale; out of scope for MVP.

---

## Completed
*(none yet — backend work begins tomorrow)*
