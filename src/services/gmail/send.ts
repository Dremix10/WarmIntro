// Send an email via Gmail API as an authenticated user
// Captures the Message-ID header for future reply-thread matching

import { getAccessTokenForUser } from "./tokens";

export interface GmailSendResult {
  sentMessageId: string; // RFC 822 Message-ID from headers
  gmailThreadId: string;
  gmailMessageId: string;
}

// RFC 2047 encoded-word for non-ASCII subjects. Gmail's send API accepts UTF-8
// in the raw MIME but downstream relays sometimes mangle it (mojibake risk).
// Encoding the subject as `=?UTF-8?B?<base64>?=` is the safe path.
function encodeSubject(subject: string): string {
  // ASCII-only? leave it alone.
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

function buildMime(opts: { from: string; to: string; subject: string; body: string; messageId: string }): string {
  // Date header improves deliverability. Some spam filters flag mail without it.
  const dateHeader = new Date().toUTCString();
  const lines = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${encodeSubject(opts.subject)}`,
    `Message-ID: ${opts.messageId}`,
    `Date: ${dateHeader}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    opts.body,
  ];
  return lines.join("\r\n");
}

export interface GmailSendError {
  reason: "no_access_token" | "gmail_rejected" | "exception";
  status?: number;
  body?: string;
  message?: string;
}

export async function sendEmailAsUser(opts: {
  userId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  body: string;
}): Promise<GmailSendResult | { error: GmailSendError }> {
  const accessToken = await getAccessTokenForUser(opts.userId);
  if (!accessToken) {
    console.warn(`[gmail/send] no access token for user ${opts.userId} — Gmail not connected? (or refresh failed)`);
    return { error: { reason: "no_access_token", message: "Could not obtain Gmail access token. Refresh-token decryption or Google refresh call failed." } };
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

  try {
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
      return { error: { reason: "gmail_rejected", status: res.status, body: text.slice(0, 500) } };
    }

    const json = (await res.json()) as { id: string; threadId: string };
    return {
      sentMessageId: messageId,
      gmailMessageId: json.id,
      gmailThreadId: json.threadId,
    };
  } catch (err) {
    console.warn(`[gmail/send] exception during send`, err);
    return { error: { reason: "exception", message: String(err).slice(0, 500) } };
  }
}

export function isGmailSendSuccess(r: GmailSendResult | { error: GmailSendError }): r is GmailSendResult {
  return "sentMessageId" in r;
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
