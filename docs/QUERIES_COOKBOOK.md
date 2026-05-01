# Alma — SQL queries cookbook

Common queries we actually run when debugging. Copy-paste, change the
filters, run via Supabase SQL editor (or via the Supabase MCP if you
have it).

For schema reference see `docs/DATABASE_SCHEMA.md`.

> All queries assume the `public` schema. Service-role bypasses RLS,
> which is what the Supabase SQL editor uses by default.

## Triage

### Recent Critic rejects (last 36h, all users)
Useful for spotting recurring patterns in why drafts fail.

```sql
SELECT
  u.email AS tester,
  d.id AS draft_id,
  d.type,
  d.iteration_count,
  d.status AS final_status,
  cr.overall_score AS score,
  cr.scores,
  LEFT(cr.feedback, 400) AS feedback_excerpt,
  LEFT(d.subject, 80) AS subject,
  LEFT(d.body, 280) AS draft_excerpt,
  d.created_at::text AS draft_created
FROM critic_reviews cr
JOIN drafts d ON d.id = cr.draft_id
JOIN auth.users u ON u.id = d.user_id
WHERE cr.created_at > now() - interval '36 hours'
  AND cr.verdict = 'reject'
ORDER BY cr.created_at DESC
LIMIT 30;
```

### Activity per tester in last 36h

```sql
SELECT u.email,
       (SELECT COUNT(*) FROM drafts d WHERE d.user_id = u.id AND d.created_at > now() - interval '36 hours') AS drafts_36h,
       (SELECT COUNT(*) FROM drafts d WHERE d.user_id = u.id AND d.status = 'sent' AND d.sent_at > now() - interval '36 hours') AS sent_36h,
       (SELECT COUNT(*) FROM drafts d WHERE d.user_id = u.id AND d.status = 'rejected_unresolvable') AS escalated_now,
       (SELECT COUNT(*) FROM critic_reviews cr JOIN drafts d ON d.id = cr.draft_id WHERE d.user_id = u.id AND cr.created_at > now() - interval '36 hours' AND cr.verdict = 'reject') AS rejects_36h,
       (SELECT COUNT(*) FROM signals s WHERE s.user_id = u.id AND s.occurred_at > now() - interval '36 hours') AS signals_36h
FROM auth.users u
WHERE u.email IN ('ce53@rice.edu','evangelos_paraskeva@brown.edu','dc118@rice.edu','dremixc10@gmail.com');
```

### A specific draft's full iteration history
Use for "why did this draft escalate?" forensics.

```sql
SELECT iteration, critic_verdict, critic_score, LEFT(critic_feedback, 300) AS feedback,
       LEFT(body, 280) AS body_excerpt, created_at::text
FROM draft_iterations
WHERE draft_id = '<DRAFT_UUID>'
ORDER BY iteration ASC;
```

## Scout / Researcher

### Scout hit rate (drafted bankers vs bankers with findings)

```sql
SELECT
  COUNT(DISTINCT d.banker_id) AS bankers_drafted,
  COUNT(DISTINCT bf.banker_id) AS bankers_with_findings,
  ROUND(AVG(bf_count.cnt), 1) AS avg_findings_per_banker,
  COUNT(DISTINCT CASE WHEN bf_count.cnt = 0 OR bf_count.cnt IS NULL THEN d.banker_id END) AS bankers_with_zero_findings
FROM drafts d
LEFT JOIN banker_findings bf ON bf.banker_id = d.banker_id
LEFT JOIN (
  SELECT banker_id, COUNT(*) AS cnt FROM banker_findings GROUP BY banker_id
) bf_count ON bf_count.banker_id = d.banker_id
WHERE d.created_at > now() - interval '36 hours';
```

### Stale-summer-analyst rows that should be re-verified or dropped

```sql
SELECT id, name, title, firm_id, email, email_verified,
       updated_at::text, age(now(), updated_at) AS age_since_updated
FROM bankers
WHERE (LOWER(title) ~ 'summer\s+analyst|summer\s+intern|\bintern\b')
  AND email IS NOT NULL
  AND updated_at < now() - interval '270 days'
ORDER BY updated_at ASC
LIMIT 20;
```

### Signals showing Scout being run

```sql
SELECT signal_type, occurred_at::text, metadata
FROM signals
WHERE agent = 'scout'
  AND occurred_at > now() - interval '24 hours'
ORDER BY occurred_at DESC
LIMIT 30;
```

## Spend / cost

### Per-user Anthropic spend in last 24h
Used by Sentinel for the `$5/24h` alert.

```sql
SELECT user_id, SUM(cost_usd) AS spend_usd, COUNT(*) AS calls
FROM claude_usage
WHERE occurred_at > now() - interval '24 hours'
GROUP BY user_id
ORDER BY spend_usd DESC;
```

### Per-agent + per-model breakdown last 7d

```sql
SELECT agent, model,
       COUNT(*) AS calls,
       SUM(input_tokens) AS in_tokens,
       SUM(output_tokens) AS out_tokens,
       ROUND(SUM(cost_usd)::numeric, 2) AS spend_usd
FROM claude_usage
WHERE occurred_at > now() - interval '7 days'
GROUP BY agent, model
ORDER BY spend_usd DESC;
```

## Onboarding & users

### Users created outside the approve flow (no welcome email ever fired)
Same query that surfaced ce53's missing welcome.

```sql
SELECT u.email, u.created_at::text AS auth_created,
       (SELECT created_at FROM pilot_signups ps WHERE LOWER(ps.email) = LOWER(u.email)) AS pilot_signup_at,
       (SELECT MIN(occurred_at) FROM signals s WHERE s.user_id = u.id AND s.signal_type = 'welcome_email_sent') AS welcome_sent_at
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM signals s WHERE s.user_id = u.id AND s.signal_type = 'welcome_email_sent')
ORDER BY u.created_at DESC
LIMIT 20;
```

### Users with a profile but zero drafts ever (stuck in setup?)

```sql
SELECT p.id, p.name, p.university, u.email,
       (SELECT MAX(occurred_at) FROM signals s WHERE s.user_id = p.id) AS last_signal_at
FROM profiles p
JOIN auth.users u ON u.id = p.id
WHERE NOT EXISTS (SELECT 1 FROM drafts d WHERE d.user_id = p.id)
ORDER BY p.created_at DESC;
```

## Pipeline / connections

### Each user's funnel snapshot

```sql
SELECT u.email,
       SUM(CASE WHEN c.stage = 'sent' THEN 1 ELSE 0 END) AS sent,
       SUM(CASE WHEN c.stage = 'replied' THEN 1 ELSE 0 END) AS replied,
       SUM(CASE WHEN c.stage = 'coffee' THEN 1 ELSE 0 END) AS coffee,
       SUM(CASE WHEN c.stage = 'referral' THEN 1 ELSE 0 END) AS referral,
       SUM(CASE WHEN c.stage IN ('first_round','superday','offer') THEN 1 ELSE 0 END) AS later_stage
FROM connections c
JOIN auth.users u ON u.id = c.user_id
GROUP BY u.email
ORDER BY sent DESC;
```

### Bankers who've replied (across all users)
Useful for response-rate flywheel.

```sql
SELECT b.id, b.name, b.title, f.name AS firm, COUNT(DISTINCT s.user_id) AS users_who_got_reply
FROM signals s
JOIN bankers b ON b.id = s.banker_id
LEFT JOIN firms f ON f.id = b.firm_id
WHERE s.signal_type = 'reply_received'
GROUP BY b.id, b.name, b.title, f.name
ORDER BY users_who_got_reply DESC;
```

## Admin / waitlist

### Pending waitlist (not yet approved)

```sql
SELECT ps.id, ps.email, ps.name, ps.university, ps.created_at::text
FROM pilot_signups ps
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE LOWER(u.email) = LOWER(ps.email))
ORDER BY ps.created_at DESC;
```

### E2E test signups (the cleanup target)

```sql
SELECT email, created_at::text
FROM pilot_signups
WHERE email ILIKE 'e2e-%@%'
ORDER BY created_at DESC;
```

## Errors / health

### Failed agent runs in last hour

```sql
SELECT agent, error, started_at::text, duration_ms
FROM agent_runs
WHERE error IS NOT NULL
  AND started_at > now() - interval '1 hour'
ORDER BY started_at DESC
LIMIT 30;
```

### Drafts stuck in pending_critic for >5 minutes (Critic broken?)

```sql
SELECT id, user_id, banker_id, created_at::text, age(now(), created_at) AS age
FROM drafts
WHERE status = 'pending_critic'
  AND created_at < now() - interval '5 minutes'
ORDER BY created_at ASC;
```

## Patterns that often come up

### Find which banker sent the auto-reply email Evangelos got

```sql
SELECT d.id, d.subject, d.sent_at::text, b.name, b.title, b.email, f.name AS firm
FROM drafts d
JOIN bankers b ON b.id = d.banker_id
LEFT JOIN firms f ON f.id = b.firm_id
JOIN auth.users u ON u.id = d.user_id
WHERE u.email = 'evangelos_paraskeva@brown.edu'
  AND d.status = 'sent'
  AND d.sent_at > now() - interval '6 hours'
  AND (LOWER(f.name) LIKE '%pjt%' OR LOWER(b.email) LIKE '%pjt%')
ORDER BY d.sent_at DESC;
```

### Mark a banker's email as dead (single)

```sql
UPDATE bankers
SET email = NULL, email_verified = false, updated_at = now()
WHERE id = '<BANKER_UUID>'
RETURNING id, name, email;
```

### Mark a feedback row as resolved

```sql
UPDATE feedback
SET resolved_at = now()
WHERE id = '<FEEDBACK_UUID>';
```

## Don't do this

- **Don't `DELETE FROM drafts WHERE ...` without a user filter** — RLS is bypassed via service-role and you'll wipe across all users.
- **Don't `UPDATE bankers SET email = '...' WHERE name = ...`** — names aren't unique, you'll overwrite the wrong person. Always use `id`.
- **Don't query `signals` without an indexed filter** — at 872+ rows and growing this is fine today, but at 100k+ a `WHERE metadata->>'foo' = ...` will table-scan.
- **Don't truncate `agent_runs` / `signals` / `claude_usage`** to "save space" — these are the flywheel inputs. Trim only with a date filter and a known reason.
