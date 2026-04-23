// Cron: every 30 minutes — send night-preview emails to users whose 9 PM local time has arrived
// Body summarizes tomorrow's drafts + plain-English reply instructions (PREVIEW / LATER XX / SKIP / MORE N)

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { sendEmailAsUser } from "@/services/gmail/send";

export const runtime = "nodejs";
export const maxDuration = 60;

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.ALMA_CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("Authorization") === `Bearer ${secret}`;
}

function minutesIntoDay(date: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(date);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    return hour * 60 + minute;
  } catch {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }
}

const TARGET_HOUR = 21; // 9 PM local
const WINDOW_MIN = 30;

export async function POST(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return handle();
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return handle();
}

async function handle() {
  const admin = getAdminClient();
  const now = new Date();

  const { data: trustRows } = await admin
    .from("trust_levels")
    .select("user_id, preferred_timezone, night_preview_enabled")
    .eq("night_preview_enabled", true);

  let sent = 0;
  for (const t of trustRows ?? []) {
    const tz = t.preferred_timezone ?? "America/New_York";
    const nowMin = minutesIntoDay(now, tz);
    const targetMin = TARGET_HOUR * 60;
    if (Math.abs(nowMin - targetMin) > WINDOW_MIN) continue;

    // Check if we already sent tonight
    const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
    const { data: existing } = await admin
      .from("signals")
      .select("id")
      .eq("user_id", t.user_id)
      .eq("signal_type", "night_preview_sent")
      .gte("occurred_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    // Build preview body
    const body = await buildPreviewBody(t.user_id);
    if (!body) continue;

    const { data: profile } = await admin
      .from("profiles")
      .select("gmail_email, name")
      .eq("id", t.user_id)
      .single();
    if (!profile?.gmail_email) continue;

    const result = await sendEmailAsUser({
      userId: t.user_id,
      fromEmail: "alma@alma.app",
      toEmail: profile.gmail_email,
      subject: `Tomorrow — ${body.draftCount} drafts ready`,
      body: body.text,
    });
    if (result) {
      await admin.from("signals").insert({
        user_id: t.user_id,
        agent: "planner",
        signal_type: "night_preview_sent",
        metadata: { date: todayKey, draftCount: body.draftCount },
      });
      sent++;
    }
  }

  return NextResponse.json({ sent, considered: (trustRows ?? []).length });
}

async function buildPreviewBody(userId: string): Promise<{ text: string; draftCount: number } | null> {
  const admin = getAdminClient();
  const { data: drafts } = await admin
    .from("drafts")
    .select("id, type, subject, bankers(name, title, firm_id, firms(name))")
    .eq("user_id", userId)
    .in("status", ["approved", "pending_critic", "needs_revision"])
    .is("sent_at", null)
    .limit(10);

  if (!drafts || drafts.length === 0) return null;

  const lines = drafts.slice(0, 8).map((d) => {
    const banker = (d as unknown as { bankers?: { name?: string; title?: string; firms?: { name?: string } } }).bankers;
    const firm = banker?.firms?.name ?? "target firm";
    return `  ${d.type === "cold" ? "•" : d.type === "followup" ? "↺" : "↪"} ${banker?.title ?? ""} at ${firm}`;
  });

  const text = `Tomorrow's queue is ready.

${drafts.length} draft${drafts.length === 1 ? "" : "s"} waiting:

${lines.join("\n")}

Sending at your preferred time tomorrow unless you tell me otherwise.

Reply with:
  PREVIEW   — send the queue to you first, half an hour before
  LATER 10  — push tomorrow's send to 10 AM (or any hour)
  SKIP      — no sending tomorrow
  MORE 3    — add 3 more drafts to tomorrow's queue
  or just tell me in plain English

— Alma`;

  return { text, draftCount: drafts.length };
}
