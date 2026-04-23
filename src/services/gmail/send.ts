// Send an email via Gmail API as an authenticated user
// Captures the Message-ID header for future reply-thread matching

import { getAdminClient } from "@/lib/supabase-admin";
import { decryptToken, refreshAccessToken, encryptToken } from "./oauth";

export interface GmailSendResult {
  sentMessageId: string; // RFC 822 Message-ID from headers
  gmailThreadId: string;
  gmailMessageId: string;
}

async function getAccessTokenForUser(userId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("gmail_refresh_token_encrypted, gmail_access_token_encrypted, gmail_token_expires_at")
    .eq("id", userId)
    .single();
  if (!profile?.gmail_refresh_token_encrypted) return null;

  const now = Date.now();
  const expiresAt = profile.gmail_token_expires_at ? new Date(profile.gmail_token_expires_at).getTime() : 0;

  if (profile.gmail_access_token_encrypted && expiresAt > now + 60_000) {
    try {
      return decryptToken(profile.gmail_access_token_encrypted);
    } catch (err) {
      console.warn("[gmail/send] access token decrypt failed, refreshing", err);
    }
  }

  // Refresh
  try {
    const refreshToken = decryptToken(profile.gmail_refresh_token_encrypted);
    const refreshed = await refreshAccessToken(refreshToken);
    if (!refreshed) return null;
    await admin
      .from("profiles")
      .update({
        gmail_access_token_encrypted: encryptToken(refreshed.accessToken),
        gmail_token_expires_at: refreshed.expiresAt.toISOString(),
      })
      .eq("id", userId);
    return refreshed.accessToken;
  } catch (err) {
    console.warn("[gmail/send] refresh failed", err);
    return null;
  }
}

function buildMime(opts: { from: string; to: string; subject: string; body: string; messageId: string }): string {
  const lines = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `Message-ID: ${opts.messageId}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    opts.body,
  ];
  return lines.join("\r\n");
}

export async function sendEmailAsUser(opts: {
  userId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
}): Promise<GmailSendResult | null> {
  const accessToken = await getAccessTokenForUser(opts.userId);
  if (!accessToken) {
    console.warn(`[gmail/send] no access token for user ${opts.userId} — Gmail not connected?`);
    return null;
  }

  const messageId = `<alma-${opts.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@mail.alma.app>`;

  const mime = buildMime({
    from: opts.fromEmail,
    to: opts.toEmail,
    subject: opts.subject,
    body: opts.body,
    messageId,
  });

  const base64url = Buffer.from(mime, "utf8").toString("base64url");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64url }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(`[gmail/send] send failed ${res.status}: ${text}`);
    return null;
  }

  const json = (await res.json()) as { id: string; threadId: string };
  return {
    sentMessageId: messageId,
    gmailMessageId: json.id,
    gmailThreadId: json.threadId,
  };
}

export async function saveToDrafts(opts: {
  userId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
}): Promise<{ draftId: string } | null> {
  const accessToken = await getAccessTokenForUser(opts.userId);
  if (!accessToken) return null;

  const mime = buildMime({
    from: opts.fromEmail,
    to: opts.toEmail,
    subject: opts.subject,
    body: opts.body,
    messageId: `<alma-draft-${Date.now()}@mail.alma.app>`,
  });
  const base64url = Buffer.from(mime, "utf8").toString("base64url");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw: base64url } }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { id: string };
  return { draftId: json.id };
}
