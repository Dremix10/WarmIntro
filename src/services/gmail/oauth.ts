// Gmail OAuth — authorization URL, token exchange, refresh
// Scopes: send + readonly + modify (for label assignment)
// Testing mode for launch (≤100 users); public mode post-YC.

// Gmail scopes.
// - gmail.compose: save drafts to user's Gmail Drafts folder AND send. This is
//   a superset of gmail.send, so we use it instead of requesting both. It does
//   NOT grant read access to other email — only drafts Alma creates.
// - gmail.readonly: Watcher detects replies to emails Alma sent. We only ever
//   query for threads tied to message-ids Alma created, never unrelated email.
//   Scope granularity in Gmail is coarse, so code discipline is what matters —
//   every Gmail API call Alma makes is logged to `signals` for user audit.
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

export const GMAIL_SCOPES_STRING = GMAIL_SCOPES.join(" ");

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export function getAuthorizationUrl(state: string): string | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    console.warn("[gmail] missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_REDIRECT_URI");
    return null;
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPES_STRING);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent"); // force refresh_token issuance
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse | null> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    console.warn("[gmail] missing OAuth creds for token exchange");
    return null;
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    console.warn(`[gmail] token exchange failed ${res.status}`);
    return null;
  }
  return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date } | null> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: json.access_token,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
  };
}

// Simple token encryption using SUPABASE_SERVICE_ROLE_KEY as key material.
// For v1; can upgrade to Supabase Vault later.
function deriveKey(): Buffer | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.ALMA_CRON_SECRET;
  if (!secret) return null;
  const hasher = require("crypto").createHash("sha256");
  hasher.update(secret);
  return hasher.digest();
}

export function encryptToken(plaintext: string): string {
  const key = deriveKey();
  if (!key) return Buffer.from(plaintext, "utf8").toString("base64"); // fallback: unencrypted (dev)
  const crypto = require("crypto");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptToken(ciphertext: string): string {
  const key = deriveKey();
  if (!key) return Buffer.from(ciphertext, "base64").toString("utf8"); // fallback matches encryptToken fallback
  const crypto = require("crypto");
  const buf = Buffer.from(ciphertext, "base64");
  if (buf.length < 28) throw new Error("Ciphertext too short");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
