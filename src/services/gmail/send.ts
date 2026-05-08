// Send an email via Gmail API as an authenticated user
// Captures the Message-ID header for future reply-thread matching

import { getAccessTokenForUser } from "./tokens";
import { sanitizeEmailSubject } from "@/services/guardrails";

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

export interface GmailThreadHeaders {
  threadId?: string | null;
  inReplyTo?: string | null;
  references?: string[] | string | null;
}

function referenceHeaderValue(references: GmailThreadHeaders["references"], inReplyTo?: string | null): string | null {
  const refs = Array.isArray(references)
    ? references
    : typeof references === "string"
      ? references.split(/\s+/)
      : [];
  if (inReplyTo) refs.push(inReplyTo);
  const unique = Array.from(new Set(refs.map((r) => r.trim()).filter(Boolean)));
  return unique.length > 0 ? unique.join(" ") : null;
}

function buildMime(opts: { from: string; to: string; subject: string; body: string; messageId: string } & GmailThreadHeaders): string {
  // Date header improves deliverability. Some spam filters flag mail without it.
  const dateHeader = new Date().toUTCString();
  const subject = sanitizeEmailSubject(opts.subject);
  const references = referenceHeaderValue(opts.references, opts.inReplyTo);
  const lines = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${encodeSubject(subject)}`,
    `Message-ID: ${opts.messageId}`,
    ...(opts.inReplyTo ? [`In-Reply-To: ${opts.inReplyTo}`] : []),
    ...(references ? [`References: ${references}`] : []),
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
} & GmailThreadHeaders): Promise<GmailSendResult | { error: GmailSendError }> {
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
    threadId: opts.threadId,
    inReplyTo: opts.inReplyTo,
    references: opts.references,
  });

  const base64url = Buffer.from(mime, "utf8").toString("base64url");

  const payloadWithThread = { raw: base64url, ...(opts.threadId ? { threadId: opts.threadId } : {}) };
  const sendPayload = async (payload: { raw: string; threadId?: string }) => {
    return fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  };

  try {
    let res = await sendPayload(payloadWithThread);
    if (res.status === 404 && opts.threadId) {
      res = await sendPayload({ raw: base64url });
    }

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
  // Optional: update an existing draft instead of creating a new one.
  // When set, we PUT to drafts/<id> instead of POSTing — preserves the
  // Gmail UI position so the user can refresh and see the new content
  // in place without a duplicate appearing.
  existingDraftId?: string;
} & GmailThreadHeaders): Promise<{ draftId: string } | null> {
  const accessToken = await getAccessTokenForUser(opts.userId);
  if (!accessToken) return null;

  const mime = buildMime({
    from: opts.fromEmail,
    to: opts.toEmail,
    subject: opts.subject,
    body: opts.body,
    messageId: `<alma-draft-${Date.now()}@mail.alma.app>`,
    threadId: opts.threadId,
    inReplyTo: opts.inReplyTo,
    references: opts.references,
  });
  const base64url = Buffer.from(mime, "utf8").toString("base64url");

  const url = opts.existingDraftId
    ? `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${opts.existingDraftId}`
    : "https://gmail.googleapis.com/gmail/v1/users/me/drafts";
  const draftPayload = (includeThreadId: boolean) => ({
    message: { raw: base64url, ...(includeThreadId && opts.threadId ? { threadId: opts.threadId } : {}) },
  });
  const sendDraftPayload = (includeThreadId: boolean) =>
    fetch(url, {
      method: opts.existingDraftId ? "PUT" : "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(draftPayload(includeThreadId)),
    });
  let res = await sendDraftPayload(Boolean(opts.threadId));
  if (res.status === 404 && opts.threadId) {
    res = await sendDraftPayload(false);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn(`[gmail/saveToDrafts] failed ${res.status}: ${text.slice(0, 200)}`);
    return null;
  }
  const json = (await res.json()) as { id: string };
  return { draftId: json.id };
}

// Convert an existing Gmail draft to a sent message. Atomic — Gmail
// removes the draft and creates the sent message in one call. Used when
// the /today UI's "Auto-send via Gmail" fires AND we have a stored
// gmail_draft_id, so the user's Drafts folder doesn't end up with a
// stale duplicate after we send.
export async function sendGmailDraft(opts: {
  userId: string;
  gmailDraftId: string;
}): Promise<GmailSendResult | { error: GmailSendError }> {
  const accessToken = await getAccessTokenForUser(opts.userId);
  if (!accessToken) {
    return { error: { reason: "no_access_token", message: "Could not obtain Gmail access token." } };
  }
  try {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: opts.gmailDraftId }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[gmail/sendGmailDraft] failed ${res.status}: ${text}`);
      return { error: { reason: "gmail_rejected", status: res.status, body: text.slice(0, 500) } };
    }
    const json = (await res.json()) as { id: string; threadId: string };
    // The API does not return the RFC 822 Message-ID. Fetch the message to
    // get headers — needed for reply-thread matching down the line.
    let messageIdHeader = "";
    try {
      const headersRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${json.id}?format=metadata&metadataHeaders=Message-ID`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (headersRes.ok) {
        const meta = (await headersRes.json()) as { payload?: { headers?: Array<{ name: string; value: string }> } };
        const h = meta.payload?.headers?.find((x) => x.name.toLowerCase() === "message-id");
        if (h) messageIdHeader = h.value;
      }
    } catch {
      /* fallback: messageIdHeader remains empty, downstream code tolerates */
    }
    return {
      sentMessageId: messageIdHeader || `<alma-sent-${json.id}@mail.alma.app>`,
      gmailMessageId: json.id,
      gmailThreadId: json.threadId,
    };
  } catch (err) {
    return { error: { reason: "exception", message: String(err).slice(0, 500) } };
  }
}

// Delete a Gmail draft. Used when our DB draft gets skipped/deleted on
// the user's request — keeps the Gmail Drafts folder in sync.
export async function deleteGmailDraft(opts: {
  userId: string;
  gmailDraftId: string;
}): Promise<boolean> {
  const accessToken = await getAccessTokenForUser(opts.userId);
  if (!accessToken) return false;
  try {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts/${opts.gmailDraftId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
