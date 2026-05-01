// Recognises synthetic / CI-script email addresses so we can suppress
// Telegram alerts, transactional emails, and Anthropic spend on them.
//
// Patterns:
//   e2e-<ts>-<rand>@<any>     scripts/e2e-user-journey.sh signs up real users
//   smoke-<ts>-<rand>@<any>   scripts/smoke.sh smoke-test signups
//   *@example.com             RFC-2606 reserved domain — never a real user
//
// Centralised because four different code paths (pilot-signup Telegram,
// planner slow-run Telegram, auth reset-password Resend, admin cleanup
// button) all need the same "is this synthetic?" check, and they were
// drifting out of sync.

const SYNTHETIC_PATTERN = /^(?:e2e|smoke)-\d+(?:-\d+)?@|@example\.com$/i;

export function isSyntheticEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SYNTHETIC_PATTERN.test(email.trim());
}
