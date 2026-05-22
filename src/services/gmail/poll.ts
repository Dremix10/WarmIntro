// Poll Gmail for new messages since a timestamp, scoped to threads we've sent
// Used by Watcher agent to detect replies

import { getAccessTokenForUser } from "./tokens";

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ body?: { data?: string }; mimeType?: string }>;
  };
  internalDate?: string;
}

export interface InboxMessage {
  gmailMessageId: string;
  gmailThreadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string[];
  receivedAt: Date;
  snippet?: string;
}

function decodePart(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

function extractBody(msg: GmailMessage): string {
  if (msg.payload?.body?.data) return decodePart(msg.payload.body.data);
  const textPart = msg.payload?.parts?.find((p) => p.mimeType === "text/plain" && p.body?.data);
  if (textPart?.body?.data) return decodePart(textPart.body.data);
  const htmlPart = msg.payload?.parts?.find((p) => p.mimeType === "text/html" && p.body?.data);
  if (htmlPart?.body?.data) return decodePart(htmlPart.body.data).replace(/<[^>]+>/g, "");
  return msg.snippet ?? "";
}

function header(msg: GmailMessage, name: string): string | undefined {
  return msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

/**
 * Poll Gmail for messages newer than `sinceTimestamp` (Unix seconds).
 * Returns parsed InboxMessage list.
 */
export async function pollInbox(userId: string, sinceTimestamp: number, maxMessages = 25): Promise<InboxMessage[]> {
  const accessToken = await getAccessTokenForUser(userId);
  if (!accessToken) return [];

  const query = `in:inbox after:${sinceTimestamp}`;
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("q", query);
  listUrl.searchParams.set("maxResults", String(maxMessages));

  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) return [];

  const listJson = (await listRes.json()) as { messages?: Array<{ id: string; threadId: string }> };
  if (!listJson.messages || listJson.messages.length === 0) return [];

  const messages = await Promise.all(
    listJson.messages.map(async (m): Promise<InboxMessage | null> => {
      const detailRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!detailRes.ok) return null;
      const msg = (await detailRes.json()) as GmailMessage;
      const inReplyTo = header(msg, "In-Reply-To");
      const referencesHeader = header(msg, "References");
      const out: InboxMessage = {
        gmailMessageId: msg.id,
        gmailThreadId: msg.threadId,
        from: header(msg, "From") ?? "",
        to: header(msg, "To") ?? "",
        subject: header(msg, "Subject") ?? "",
        body: extractBody(msg),
        inReplyTo,
        references: referencesHeader?.split(/\s+/).filter(Boolean),
        receivedAt: new Date(parseInt(msg.internalDate ?? "0", 10)),
        snippet: msg.snippet,
      };
      return out;
    })
  );

  return messages.filter((m): m is InboxMessage => m !== null);
}
