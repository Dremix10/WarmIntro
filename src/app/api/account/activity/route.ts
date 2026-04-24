// GET /api/account/activity — every Gmail touch Alma made on behalf of the current user
// Used by /account/privacy for audit/transparency

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function GET(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Pull drafts sent (outbound), signals from Watcher (inbound detection), connections (threads advanced)
  const [{ data: sent }, { data: watcherSignals }, { data: gmailSignals }] = await Promise.all([
    ctx.supabase
      .from("drafts")
      .select("id, banker_id, subject, body, sent_at, sent_message_id, bankers(name, title, firms(name))")
      .eq("user_id", ctx.user.id)
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(200),
    ctx.supabase
      .from("signals")
      .select("id, signal_type, metadata, occurred_at, banker_id, draft_id")
      .eq("user_id", ctx.user.id)
      .eq("agent", "watcher")
      .order("occurred_at", { ascending: false })
      .limit(200),
    ctx.supabase
      .from("signals")
      .select("id, signal_type, metadata, occurred_at")
      .eq("user_id", ctx.user.id)
      .in("signal_type", ["night_preview_sent", "night_preview_override_applied"])
      .order("occurred_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    sent: sent ?? [],
    watcher: watcherSignals ?? [],
    almaEmails: gmailSignals ?? [],
  });
}
