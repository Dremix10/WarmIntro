import { getAdminClient } from "@/lib/supabase-admin";
import type { GmailThreadHeaders } from "./send";

interface ConnectionThreadRow {
  thread_id: string | null;
  last_send_message_id: string | null;
}

export async function getGmailThreadHeadersForConnection(opts: {
  userId: string;
  connectionId?: string | null;
  bankerId?: string | null;
}): Promise<GmailThreadHeaders> {
  const admin = getAdminClient();
  let row: ConnectionThreadRow | null = null;

  if (opts.connectionId) {
    const { data } = await admin
      .from("connections")
      .select("thread_id, last_send_message_id")
      .eq("id", opts.connectionId)
      .eq("user_id", opts.userId)
      .maybeSingle();
    row = data;
  }

  if (!row && opts.bankerId) {
    const { data } = await admin
      .from("connections")
      .select("thread_id, last_send_message_id")
      .eq("user_id", opts.userId)
      .eq("banker_id", opts.bankerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    row = data;
  }

  if (!row?.thread_id || !row.last_send_message_id) return {};
  return {
    threadId: row.thread_id,
    inReplyTo: row.last_send_message_id,
    references: row.last_send_message_id,
  };
}
