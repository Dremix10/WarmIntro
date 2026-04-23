// Match an inbound message to one of our sent drafts by Message-ID / References / In-Reply-To

import { getAdminClient } from "@/lib/supabase-admin";
import type { InboxMessage } from "./poll";

export interface ThreadMatch {
  draftId: string;
  connectionId?: string;
  bankerId?: string;
  userId: string;
  originalSentMessageId: string;
}

export async function matchInboundToSentDraft(inbound: InboxMessage, userId: string): Promise<ThreadMatch | null> {
  const candidates = new Set<string>();
  if (inbound.inReplyTo) candidates.add(inbound.inReplyTo.trim());
  if (inbound.references) {
    for (const ref of inbound.references) candidates.add(ref.trim());
  }
  if (candidates.size === 0) return null;

  const admin = getAdminClient();
  const { data: matched } = await admin
    .from("drafts")
    .select("id, connection_id, banker_id, user_id, sent_message_id")
    .eq("user_id", userId)
    .in("sent_message_id", Array.from(candidates))
    .limit(1)
    .maybeSingle();

  if (!matched?.sent_message_id) return null;

  return {
    draftId: matched.id,
    connectionId: matched.connection_id ?? undefined,
    bankerId: matched.banker_id ?? undefined,
    userId: matched.user_id,
    originalSentMessageId: matched.sent_message_id,
  };
}
