// Single source of truth for the Resend FROM address. Configurable via
// ALMA_FROM_EMAIL so we can flip aliases (welcome@, hello@, founders@,
// noreply@) without redeploying.
//
// Default: "Alma <welcome@alma.careers>". Universities (Microsoft 365)
// filter `noreply@` more aggressively because Microsoft's reputation
// system penalizes one-way senders. `welcome@` is invitational, lands
// more reliably, and reads warmer to new users.
//
// All sending paths (approve, reset-password, night-preview) should
// import getFromAddress() instead of hardcoding the alias.

const DEFAULT_FROM = "Alma <welcome@alma.careers>";

export function getFromAddress(): string {
  const env = process.env.ALMA_FROM_EMAIL?.trim();
  return env && env.includes("@") ? env : DEFAULT_FROM;
}
