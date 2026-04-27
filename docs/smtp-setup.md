# Custom SMTP for Supabase Auth

Default Supabase auth emails ship from `noreply@mail.app.supabase.io` — slow, often hit spam, off-brand. This routes them through `noreply@alma.careers` instead. Forgot-password + email confirmation will then arrive in seconds and look like they're from us.

## Provider: Resend

Cheapest + fastest for a small project. 3,000 emails/month free, $20 for 50,000. We're well inside the free tier.

## Setup steps

### 1. Resend account + domain

1. Sign up: https://resend.com/signup
2. Add domain: Resend dashboard → Domains → Add Domain → `alma.careers`
3. Resend gives you 3 DNS records (1 SPF TXT, 1 DKIM TXT, 1 MX or DMARC). Add them in your DNS provider (Cloudflare / Hover / wherever you bought alma.careers).
4. Click "Verify" in Resend. DKIM usually validates in 5 minutes; full propagation up to an hour.
5. Once verified, generate an API key: Resend → API Keys → Create. Save it (shown once).

### 2. Configure Supabase

1. Supabase dashboard → Project Settings → Authentication → SMTP Settings → Enable Custom SMTP
2. Fill in:
   - Sender email: `noreply@alma.careers`
   - Sender name: `Alma`
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: *(your Resend API key)*
   - Minimum interval: 60 (default)
3. Save

### 3. Customize the email templates (optional but worth it)

Supabase → Authentication → Email Templates. Defaults work but read awkwardly. Swap each template's subject + body to use Alma's voice. Three to update:
- **Confirm signup** — sent on signup. We don't currently require confirmation, but if we ever turn it on, this is the email.
- **Magic link** — unused for now.
- **Reset password** — sent by `/forgot-password`. This is the one that's currently broken.

Suggested reset-password copy (Fraunces vibe):

> Subject: Reset your Alma password
>
> Hey,
>
> Click the link below to set a new password. It's good for one hour.
>
> {{ .ConfirmationURL }}
>
> If you didn't ask for this, ignore it — your password won't change.
>
> — Alma

### 4. Test

After Supabase saves the config, hit `/forgot-password`, enter your email, and check inbox + spam. Should arrive within 30 seconds from `noreply@alma.careers`.

## Why custom from-domain matters

- Forgot-password emails arrive immediately (vs. 1-5 min on Supabase's shared SMTP)
- Inbox placement, not spam — the supabase.io domain is shared by every dev and frequently flagged
- Brand trust on the most security-sensitive email a user gets

## When to revisit

- If we ever exceed 3k emails/month (= 100 users × 30 transactional emails) → upgrade to Resend $20 tier
- For outbound *campaign* emails (digests, weekly recap from Alma), this Resend setup also handles those — same domain reputation
