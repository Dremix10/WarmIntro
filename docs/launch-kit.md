# Alma launch kit — 3-day push to 25-30 signups

> **Goal:** 25+ signups, 8-12 activations, 1-3 booked coffees by Apr 30 (YC submission day).
> **Audience:** rising sophomores at Rice + Brown targeting SA2028 IB recruiting.
> **Pitch in one line:** "I built an AI agent that runs your IB networking — finds bankers, writes the cold emails, tracks replies. Looking for 5 testers from [Rice/Brown]."

---

## Channel 1 — Rice + Brown finance club Slack/GroupMe/Discord

**Audience:** people who are ALREADY trying to do IB networking. Highest-intent group.

**Where:** Rice Finance Club, Owls on Wall Street, Brown Finance Club, Brown Investment Group.

### DM template (one per club, one of you posts to each)

```
Hey — sorry for the random drop. I've been building something with my cofounder
(Demetris @ Rice / Evangelos @ Brown) for the last 3 weeks: an AI agent that
runs the IB networking grind for you. You upload your resume, pick your target
banks, it finds bankers worth emailing, drafts the cold emails in your voice,
and tracks replies. The whole loop, automated, send-from-your-Gmail.

We're opening it to ~10 testers from [Rice/Brown] this week. If anyone's
gunning for SA2028 and wants in: alma.careers/demo. Drop your email there
and I'll send you an invite tonight.

Honest expectations: still rough, you'd be a real beta tester. But the loop
works — first cold email I sent through it landed a coffee with an MS TMT VP
last week.
```

### Variant — for general all-club channel (more concise)

```
Built an AI for IB networking. Drafts cold emails to bankers, tracks replies,
runs while you're in class. Looking for sophomore beta testers. alma.careers/demo
```

### Personal note for posting

- Post in the off-hours when channel is quietest (right before bed or first thing
  AM) so it sits at the top.
- Reply to your own post 30 min later with a screenshot of `/today` showing real
  drafts. Social proof.
- Don't oversell. The honest framing converts better than hype.

---

## Channel 2 — Sidechat / Yik Yak

**Audience:** broader undergrad pool. Lower intent, higher reach.

### Post

```
sophomore IB friends — built an AI that does your networking calls for you.
finds bankers, writes the emails, tracks who replies. opening to a few rice/brown
testers this week. dm if interested. (alma.careers/demo)
```

Posted from sidechat = anonymous, but one of you should follow up to DMs.

---

## Channel 3 — Direct DMs to known sophomores

**Audience:** highest-conversion, slowest-scaling. 30 personal DMs across
your two networks.

### Identifying the list (do this first)

- Pull your finance-club roster (you both have admin access)
- Filter to '28 (rising sophomores)
- Annotate: who's gunning for IB, who's been complaining about networking
- Sort: most-active networker first

### DM template

```
Hey [Name] —

Working on something with [Demetris/Evangelos] you'd probably actually use:
an AI agent that runs IB networking for you. It finds the bankers, drafts
the call requests in your voice, sends them from your Gmail, and tracks
replies. So you do less of the spreadsheet-and-stress part of recruiting.

Opening to ~10 testers from [Rice/Brown] this week. Want a slot?

alma.careers/demo — drop your email and I'll send you the beta invite tonight.
```

### Reply hook for "what's the catch"

```
No catch — it's free for the 2026 cycle. We need ~20 real students using it
to apply to YC next week. You give us feedback, we give you 100 networking
calls automated through superday. Fair trade.
```

---

## Channel 4 — LinkedIn (you + cofounder, personal posts)

**Audience:** parents, professors, school administrators (won't sign up but might share).

### Post

```
For the last three weeks, [cofounder] and I have been building what we wish
existed when we started recruiting — an AI agent that runs the networking
grind for IB-bound college sophomores.

It reads your resume, finds bankers at every BB and EB whose path you should
study, drafts the call requests in your voice (no AI tells), sends them from
your Gmail, and tracks every reply through superday.

We're opening the beta to Rice and Brown sophomores this week. If you know
someone who'd benefit, send them: alma.careers/demo

Founders: a Rice student and a Brown student — built for our own classes
first.
```

---

## Channel 5 — Twitter / X (one cofounder, optional)

If either of you has a Twitter presence:

```
shipped: alma.careers — the AI that runs IB recruiting networking for sophomores.

reads resume → finds bankers → drafts cold emails in your voice → sends from
your gmail → tracks replies through superday.

opening to rice + brown sophomores this week. (1/3)
```

Thread continuation = walk through the agent system (Researcher / Correspondent
/ Critic / Watcher / Curator) with screenshots from `/agents`.

---

## Daily ops while we drive signups

### Morning sweep (you, 9am ET)

Check `pilot_signups` table for overnight signups. For each new email:

1. Send a personal welcome DM/email within 2 hours: "You're in. Sign in at
   alma.careers/login with the password I'll send when you reply."
2. Reset their Supabase password to something memorable (I can do this from
   the admin API).
3. Note their school + flag if they hit any onboarding bug.

### Midday sweep (1pm ET)

- Anyone signed up but stuck at /setup? DM them.
- Anyone connected Gmail but no drafts surfaced? DM them.
- Anyone with approved drafts they haven't sent? Encourage.

### Evening sweep (8pm ET)

- Total signups today vs target
- Activation rate (signups → completed setup → first send)
- What broke today
- What to push tomorrow

### Telegram alerts (already wired)

You'll get a Telegram ping if any agent errors > 5/hr or Hunter credits drop
below 20%.

---

## Tracking dashboard (run these queries when you want a pulse)

```sql
-- Today's funnel
SELECT
  (SELECT COUNT(*) FROM pilot_signups WHERE created_at::date = CURRENT_DATE) AS signed_up_today,
  (SELECT COUNT(*) FROM auth.users WHERE created_at::date = CURRENT_DATE) AS accounts_today,
  (SELECT COUNT(*) FROM profiles WHERE array_length(target_firms,1) > 0 AND updated_at::date = CURRENT_DATE) AS completed_setup_today,
  (SELECT COUNT(*) FROM profiles WHERE gmail_connected_at::date = CURRENT_DATE) AS gmail_connected_today,
  (SELECT COUNT(*) FROM drafts WHERE sent_at::date = CURRENT_DATE) AS sent_today,
  (SELECT COUNT(*) FROM signals WHERE signal_type = 'reply_received' AND occurred_at::date = CURRENT_DATE) AS replies_today;

-- Cumulative
SELECT
  (SELECT COUNT(*) FROM pilot_signups) AS waitlist,
  (SELECT COUNT(*) FROM auth.users) AS accounts,
  (SELECT COUNT(*) FROM profiles WHERE array_length(target_firms,1) > 0) AS active_users,
  (SELECT COUNT(*) FROM drafts WHERE sent_at IS NOT NULL) AS emails_sent,
  (SELECT COUNT(DISTINCT user_id) FROM signals WHERE signal_type = 'reply_received') AS users_with_replies;
```

I'll run these on demand when you ping me.

---

## YC application — assembling on day 4

The application asks for:
- **Company name + URL:** Alma — alma.careers
- **One-liner:** *"AI agent that runs IB networking for college sophomores."*
- **Founders:** Demetris Chrysostomou (Rice '28) & Evangelos Paraskeva (Brown '28)
- **Why now:** IB recruiting starts 2 years earlier than it did a decade ago. Sophomores are drowning. Generic AI tools (ChatGPT, automation services) don't understand the specific recruiting calendar, banker-by-banker context, or trust signals that matter. We built a niche-deep system.
- **Why this team:** We're literally the customer. Two finance-club kids at the schools we're selling into.
- **Traction (filled in day 4):** [signups] users, [sends] emails sent, [replies] replies tracked through Watcher. 1 published `flywheel_release` showing measurable learning.
- **Demo video:** 90 seconds. Screen recording of `/setup` → `/today` → approve a draft → live response from Watcher detecting reply. Voiceover by either you or cofounder.

I'll produce a draft of all of this on day 4 once we have the numbers.

---

## What to do RIGHT NOW

1. You: finish the Gmail send test (open `/today`, click "Run Alma now", approve a draft, send to your personal email).
2. Cofounder: same flow on his account.
3. When both work: I flip `TESTING_GATE_ENABLED=false` on Vercel.
4. Post to channels above (start with the highest-intent one — your finance club).
5. DM your top-10 personal list.

I'll stay watching DB + Vercel logs while you do this. Ping me with anything broken.
