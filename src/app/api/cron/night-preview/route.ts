// Cron: every 30 minutes — send night-preview emails to users whose 9 PM local time has arrived
// Body summarizes tomorrow's drafts + plain-English reply instructions.
//
// Sends via RESEND from noreply@alma.careers, NOT through the user's own
// Gmail. Sending these from the user's mailbox to themselves is confusing
// (sender == recipient), uses a Gmail send-credit, and forces us through
// the user's mail formatting which mangled the em-dash subject for the
// cofounder's first preview.

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

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

    const body = await buildPreviewBody(t.user_id);
    if (!body) continue;

    const { data: profile } = await admin
      .from("profiles")
      .select("email, name, gmail_email")
      .eq("id", t.user_id)
      .single();
    // Prefer the user's signup email (always present); fall back to gmail_email
    const recipient = profile?.email ?? profile?.gmail_email;
    if (!recipient) continue;

    const ok = await sendNightPreview({
      to: recipient,
      firstName: (profile?.name ?? "").split(" ")[0] || null,
      draftCount: body.draftCount,
      bankerLines: body.bankerLines,
    });
    if (ok) {
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

// Send via Resend with branded HTML + plaintext alternative. Plain "—" stays
// in plaintext (UTF-8 throughout); HTML body is what most clients render.
async function sendNightPreview(opts: {
  to: string;
  firstName: string | null;
  draftCount: number;
  bankerLines: Array<{ name: string; title: string; firm: string; type: string }>;
}): Promise<boolean> {
  // .trim() defends against a trailing newline that vercel env add via echo
  // bakes in (Resend then rejects the Bearer header as "invalid API key").
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) {
    console.warn("[night-preview] RESEND_API_KEY missing — skipping send");
    return false;
  }

  const greeting = opts.firstName ? `Hey ${opts.firstName},` : "Hey,";
  const subject = `Tomorrow: ${opts.draftCount} draft${opts.draftCount === 1 ? "" : "s"} ready`;

  const lineRows = opts.bankerLines
    .map((l) => `<tr><td style="padding:6px 0;border-bottom:1px solid #EAE3D2;font-size:14px"><strong>${escapeHtml(l.name)}</strong> · <span style="color:#5C6472">${escapeHtml(l.title)} at ${escapeHtml(l.firm)}</span></td></tr>`)
    .join("");

  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#EAE3D2;padding:48px 24px;color:#14182A;line-height:1.6;margin:0">
<div style="max-width:520px;margin:0 auto;background:white;border:1px solid #D9CFB5;border-radius:16px;padding:36px">
  <p style="font-size:22px;font-style:italic;color:#1B3B5F;margin:0 0 20px 0">alma</p>
  <p style="font-size:16px;margin:0 0 12px 0">${greeting}</p>
  <p style="margin:0 0 20px 0">Tomorrow's queue is ready. ${opts.draftCount} draft${opts.draftCount === 1 ? "" : "s"} waiting on you.</p>
  <table style="width:100%;border-collapse:collapse;margin:0 0 24px 0">${lineRows}</table>
  <p style="margin:0 0 12px 0">Sending at your preferred time unless you tell me otherwise. Open <a href="https://www.alma.careers/today" style="color:#2E5A88">your queue</a> to review.</p>
  <p style="margin:24px 0 4px 0;font-size:12px;color:#5C6472">Reply with one of:</p>
  <ul style="margin:0 0 0 0;padding-left:18px;font-size:12px;color:#5C6472;line-height:1.8">
    <li><strong>PREVIEW</strong> — send the queue to me 30 min before</li>
    <li><strong>LATER 10</strong> — push tomorrow's send to 10 AM</li>
    <li><strong>SKIP</strong> — no sending tomorrow</li>
    <li><strong>MORE 3</strong> — add 3 more drafts</li>
  </ul>
  <p style="margin:28px 0 0 0;font-size:12px;font-style:italic;color:#5C6472">— Alma</p>
</div></body></html>`;

  const lineText = opts.bankerLines
    .map((l) => `  - ${l.name} - ${l.title} at ${l.firm}`)
    .join("\n");
  const text = `${greeting}

Tomorrow's queue is ready. ${opts.draftCount} drafts waiting:

${lineText}

Sending at your preferred time unless you tell me otherwise. Open your queue:
https://www.alma.careers/today

Reply with:
  PREVIEW   send the queue to me 30 min before
  LATER 10  push tomorrow's send to 10 AM
  SKIP      no sending tomorrow
  MORE 3    add 3 more drafts

- Alma`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      from: "Alma <noreply@alma.careers>",
      to: [opts.to],
      subject,
      text,
      html,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.warn(`[night-preview] resend ${res.status}: ${errBody.slice(0, 200)}`);
    return false;
  }
  return true;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  ));
}

async function buildPreviewBody(userId: string): Promise<{ draftCount: number; bankerLines: Array<{ name: string; title: string; firm: string; type: string }> } | null> {
  const admin = getAdminClient();
  const { data: drafts } = await admin
    .from("drafts")
    .select("id, type, subject, bankers(name, title, firm_id, firms(name))")
    .eq("user_id", userId)
    .in("status", ["approved", "pending_critic", "needs_revision"])
    .is("sent_at", null)
    .limit(10);

  if (!drafts || drafts.length === 0) return null;

  // Strip "X at FirmName" from the title if it already includes the firm —
  // some Serper-discovered titles are full LinkedIn snippets like
  // "Investment Banking Analyst at Morgan Stanley", so we'd render
  // "Investment Banking Analyst at Morgan Stanley at Morgan Stanley"
  // without this guard.
  function cleanTitle(title: string | null | undefined, firm: string | null | undefined): string {
    if (!title) return "";
    const t = title.trim();
    if (firm && t.toLowerCase().endsWith(` at ${firm.toLowerCase()}`)) {
      return t.slice(0, t.length - ` at ${firm}`.length).trim();
    }
    return t;
  }

  const bankerLines = drafts.slice(0, 8).map((d) => {
    const banker = (d as unknown as { bankers?: { name?: string; title?: string; firms?: { name?: string } } }).bankers;
    const firmName = banker?.firms?.name ?? "your target firm";
    return {
      name: banker?.name ?? "Unknown",
      title: cleanTitle(banker?.title, firmName) || "Investment Banking",
      firm: firmName,
      type: d.type ?? "cold",
    };
  });

  return { draftCount: drafts.length, bankerLines };
}
