// Admin allowlist check — single source of truth for which emails can hit
// /api/admin/* routes. Was duplicated 12× across admin route handlers and
// drifting was inevitable; centralised in one file (refactor-plan.md
// Batch 3). Keep both the function AND the env-var name stable so existing
// Vercel deploys don't need a config change.
//
// ADMIN_EMAILS env var: comma-separated, case-insensitive. The default
// covers the two YC cofounders so a fresh local clone works without any
// env setup. Production should set ADMIN_EMAILS explicitly so adding /
// removing admins is a one-line config change, not a code deploy.

const DEFAULT_ADMINS = "dc118@rice.edu,evangelos_paraskeva@brown.edu";

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? DEFAULT_ADMINS)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
