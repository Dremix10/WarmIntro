# Email deliverability — keeping Alma drafts out of spam

Two send paths, two threat models:

1. **Gmail OAuth send** (cold drafts to bankers, from the user's mailbox) — leverages Gmail's reputation, which is excellent. Spam risk is mostly about the *content* of the email and the *sender's behavior*, not domain config.
2. **Resend transactional** (password reset, night preview, from `noreply@alma.careers`) — uses our domain reputation, which is brand new. Spam risk is high until we build it.

This doc covers what's done and what to do next.

## What's already done in code

### Gmail send path (`src/services/gmail/send.ts`)
- **`Date:` header** added to every send. Spam filters flag mail without it.
- **`Content-Transfer-Encoding: 8bit`** so UTF-8 body bytes pass through without mojibake.
- **RFC 2047 encoded subject** when subject contains non-ASCII (em-dash, smart quotes, etc.). Otherwise downstream relays would mangle the bytes.
- **Stable `Message-ID:` per send** (`<alma-{userId}-{ts}-{rand}@mail.alma.app>`). Used for thread matching when the banker replies.

### Critic guardrails
The Critic + fact-checker reject drafts containing common spam-tells:
- "I hope this email finds you well", "reaching out to", em-dashes, "leverage / endeavor / synergy", "RE: " in fresh sends, etc.
- 80–150 words enforced (under 50 looks like a phish; over 200 reads as spam).
- Banned phrase list grew from cofounder feedback.

### Per-banker dedup
Unique constraint on `(user_id, banker_id)` for connections + `(user_id, banker_id, type)` partial unique on active drafts. Same banker can't get two cold emails from the same Alma user. Across users, no cap yet — see "Roadmap" below.

## What you (Dremix) need to set up — all DNS

### `alma.careers` DNS records — required for Resend deliverability
Resend dashboard → Domains → `alma.careers` shows what to add. Three records:

1. **SPF (TXT @)** — authorize Resend to send for our domain.
   `v=spf1 include:amazonses.com ~all`
2. **DKIM (CNAME records)** — Resend gives 2–3 CNAME entries pointing to keys hosted at amazonses.com.
3. **DMARC (TXT _dmarc)** — start with `p=none` so we can monitor without rejecting. Tighten later.
   `v=DMARC1; p=none; rua=mailto:dmarc@alma.careers; pct=100`

Verify in Resend after adding. DKIM usually validates in ~5 min; DMARC + SPF in ~30 min.

### Optional but high-value
- **`mail.alma.app` MX record** — we use this synthetic Message-ID hostname. Setting it up as a real receiving domain (even just an MX → /dev/null) marginally helps spam scores because filters lookup the host.
- **Custom Reply-To** — if a banker hits Reply, do they reply to the user's Gmail (current default) or to a custom inbox like `replies@alma.careers` we then forward? Custom inbox enables auto-categorization but adds plumbing. Defer.

## What still needs doing in code

### 1. HTML alternative on cold drafts
Currently we send `text/plain` only. Many filters score plain-text-only emails as suspicious (most legitimate businesses send `multipart/alternative`). Add a parallel HTML body that's just the plain body wrapped in light HTML.

### 2. List-Unsubscribe header on autopilot sends (Trust A)
RFC 8058 — gmail.com filters favor mail with this header. Even though our cold emails are 1:1 not bulk, including:
```
List-Unsubscribe: <mailto:unsubscribe@alma.careers?subject=Stop>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```
…boosts inbox placement. Only on autopilot sends; preview-veto and copilot don't need it (the user controls the send).

### 3. Per-banker fleet-wide soft-cap
*Roadmap.* Track across all Alma users how many emails landed in a given banker's inbox in the last 7 days. Above a threshold (3?), throttle further sends to that banker (force a wait day, lower priority for users with weakest fit). Implementing this also gives us the YC-pitch line "Alma doesn't get banker fatigue — bad outreach does."

### 4. Bounce handling
*Roadmap.* If Gmail returns a bounce notification, mark the banker's email `email_verified=false` and remove from candidate pool. Currently we'd just keep retrying.

### 5. Warm-up window
*Roadmap.* For new Alma users, throttle their first day to 1 send max, day 2 to 3 sends, day 3 to 5. Brand-new senders that immediately blast 5 emails get rate-limited or filtered. Gradual ramp builds reputation.

## Monitoring what works

- Watch the `signals` table for `draft_send_failed` rows. Gmail rejection bodies tell us if we're tripping spam (`5.7.0 Address blocked` etc.)
- Reply rate per send-time-bucket — if 7 AM bucket is dropping, the bucket is getting filtered. Surface in Sentinel.
- Add a "did this email reach the inbox?" pulse: 24 hours after send, if no Watcher reply seen AND no bounce, consider it inbox-delivered. Otherwise log as "filtered."
