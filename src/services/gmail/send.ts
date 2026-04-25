// Send an email via Gmail API as an authenticated user
// Captures the Message-ID header for future reply-thread matching

import { getAccessTokenForUser } from "./tokens";

export interface GmailSendResult {
  sentMessageId: string; // RFC 822 Message-ID from headers
  gmailThreadId: string;
  gmailMessageId: string;
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
