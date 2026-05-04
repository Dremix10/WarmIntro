# Open tasks (snapshot 2026-05-03)

The Claude task list (`TaskCreate`/`TaskList`) is local to Claude sessions and disappears when Claude is closed. This file is the migration snapshot for any AI agent (Codex, etc.) or human picking up the work.

Five tasks were pending at session close. **#75 and #76 are the freshest** — they came out of the 2026-05-02 Anya testing session.

---

## #75 — Add casual hedges to BASE_VOICE banned phrases

**Status:** Pending Dremix approval (asked 2026-05-02; he requested session summary before answering).

**Why:** Anya consistently skipped drafts containing "I have no idea", "weird", "if you have it?", "kinda", "sorta", "tbh" on `ar225@rice.edu`. Critic catches some at voiceMatch=6–7 but doesn't reject hard enough — so users override and send watered-down emails. For IB outreach specifically, casual hedges read as unprofessional; banking emails skew formal even from juniors.

**Action:** Add the phrases above to the banned-phrases list in `src/services/agents/correspondent.ts` `BASE_VOICE`. ~5-line edit, ~5 minutes.

**Re-ask Dremix at the start of the next session** before shipping.

---

## #76 — Anya-batch bug fixes — verification queue

**Status:** Shipped 2026-05-02 in commit `5ddec41`. Need user-confirmed walkthrough before counting them done.

**The five fixes:**

1. **Eye toggle on password fields** — `src/components/AuthForm.tsx` + `src/app/reset-password/page.tsx`. Click eye icon → password becomes visible; eye-off → masked. Both new-password and confirm fields on reset-password.

2. **Setup time picker = preset buttons** — `/setup` step asking for daily-thing time replaced native `<input type="time">` with four buttons (6 / 7 / 8 / 9 am). Active state styled. Explanatory line: "7 am is most common — emails land before bankers' first meeting."

3. **Welcome-email new-user redirect fix** — `/setup` `useEffect` now includes `session?.user?.id` in deps so it re-fires when auth resolves for new users. Done-screen condition widened from `gmailConnected === false` to `gmailConnected !== true` so the "unknown" tri-state shows UI.

4. **/pipeline data load fix** — `bankers` table has no `warmth_score` column; `warmth` lives on `connections`. Select corrected to: `id, banker_id, stage, updated_at, warmth, bankers(id, name, title, university, linkedin_url, email, firms(id, name, tier))`. Page now shows real data instead of empty state.

5. **/today CRM → Pipeline link** — sent-toast on `/today` now links to `/pipeline` (not `/crm`, which is a redirect now).

**Walk through as Anya would:** request-access → admin-approve → click welcome email → reset password (eye toggle) → /setup (preset times) → /today → send a draft → click pipeline link → see real connections list. If all five steps land cleanly, mark complete.

---

## #58 — Tester verification queue (earlier batch)

**Status:** Pending. 10 features shipped that Dremix needs to verify before counting them done. Walk through each in `/admin` or `/today`.

1. **Scout finding-rate** (`#49` + slug-match gate, `df06b51` → `3f48a33`) — open `/admin/drafts` after a draft fires. Look for `type=linkedin_profile`, `alumni_mention`, or non-LinkedIn slug-match URLs in expanded rows. Hit rate should be 1–5 findings/banker (vs 0–1 baseline).

2. **/admin/drafts prompt-iteration page** (`#57`, `2563e85`) — filter chips, expandable rows, "Copy for prompt tuning" button drops structured block to clipboard.

3. **Skip-with-reason → regenerate** (`#47`, `489077e`) — Skip button on `/today` opens modal with reason textarea + "Just skip" / "Skip and try again" buttons.

4. **Welcome email FROM swap** (`819b22d`) — sender on welcome / approve / reset / night-preview is `welcome@alma.careers`.

5. **Send-welcome admin button** (`5f156bb`) — `/admin` Users row has "Send welcome" button next to "Reset password". Confirms before sending. **Note:** send-welcome path mints a real `password_reset_tokens` row + logs `welcome_email_sent` signal. The test-welcome admin tool sends the same body but with a placeholder token — useful for previewing, not for actually onboarding.

6. **Summer-analyst deprioritization + Hunter re-verify** (`27fb59e`) — next Researcher run pushes SA titles below current full-time. Stale-summer (>270d) rows get verified via Hunter; undeliverables nullified. Look for `stale_summer_email_dropped` signal in `/admin` events.

7. **BASE_VOICE positive refactor + Architect agent** (`9dd5afe`) — every iter-0 critic_review since 03:00 UTC May 1 has been an approve at 8.25. Architect's first daily digest fires today at 16:00 UTC.

8. **Iteration cap drop 3 → 2** (`5a7b9a8`) — drafts now escalate to user after iter 1 instead of regressing on iter 2.

9. **Evangelos's gelo-touch UI** (`24b6637`) — `/setup` gets right-column MentorCompanion sidecar (sticky on desktop, stacks on mobile), step indicator strip, numbered trust dial. `/today` gets a "Sent to {first name}" paper-plane badge during the fade animation.

10. **/demo overhaul** (`aaf3bd2`) — fake Alex/Maya/Jordan bankers replaced with REAL bankers from DB. Verify by:
    - Upload your resume to `/demo` → see 3 real Brown/Rice/MIT alumni with clickable LinkedIn URLs
    - Click "sample run (Rice CS sophomore)" → see 3 real Rice bankers
    - Click a LinkedIn link from each card → confirm it's a real profile
    - Copy a draft → confirm the body uses real banker name/title/firm with same-school or firm anchor (no fake "Alex was a TMT analyst before VP" hooks)
    - For each banker shown, confirm their `anchorLine` quote (the italic "From their profile: ..." line) is something verifiable, not invented

---

## #28 — Day 4: YC application package

**Status:** Pending.

**Action:** Demo video (90 sec), founder story rewrite, real numbers, submission. Use `docs/superpowers/specs/2026-04-23-alma-ib-agent-design.md` Section 8 narrative as starting point, iterate with cofounder.

---

## #27 — 3-day signup push

**Status:** Pending.

**Action:** Drive 20–30 signups. Post to channels, DM target list, track activations. Daily check-in on signal/conversion. Polish issues that surface.

---

## How to update this file

When you complete one of the tasks above, **either** delete it from this file or move it under a "Completed since migration" section at the bottom. When you discover a new task, add it here so the snapshot stays accurate. The whole point of this file is to be the durable migration target for cross-session work; treat it like the `BACKEND_REQUESTS.md` running list.
