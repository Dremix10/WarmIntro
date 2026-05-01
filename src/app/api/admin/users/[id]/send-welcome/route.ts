// POST /api/admin/users/[id]/send-welcome — admin sends the welcome
// email to an existing auth.users row. Used for users created outside
// the approve flow (e.g. backdoor inserts, early cofounder accounts)
// who never got the welcome originally.
//
// Mints a fresh password_reset_tokens row (1h TTL) so the setup link
// in the email is real — clicking it lets them set a password even
// if they've never set one. If they already have a password, clicking
// just resets it; not destructive.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { getFromAddress } from "@/lib/email-from";
import { buildWelcomeEmail } from "@/lib/welcome-email";
import { logSignal } from "@/services/signals/log";

export const runtime = "nodejs";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alma.careers").trim();
const TOKEN_TTL_MIN = 60;

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? "dc118@rice.edu,evangelos_paraskeva@brown.edu")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(ctx.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  if (!resendKey) return NextResponse.json({ error: "RESEND_API_KEY not set" }, { status: 500 });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: target, error: lookupErr } = await admin.auth.admin.getUserById(id);
  if (lookupErr || !target?.user?.email) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  const email = target.user.email;

  // Pull a friendly first name from profiles if available — falls back
  // to "Hi" when we don't have it.
  const { data: profile } = await admin
    .from("profiles")
    .select("name")
    .eq("user_id", target.user.id)
    .maybeSingle();
  const greeting = profile?.name
    ? `Hi ${profile.name.split(" ")[0]}`
    : "Hi";

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000).toISOString();
  const { error: insertErr } = await admin.from("password_reset_tokens").insert({
    token,
    user_id: target.user.id,
    email: email.toLowerCase(),
    expires_at: expiresAt,
  });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const siteOrigin = SITE_URL.replace(/\/$/, "");
  const setupLink = `${siteOrigin}/reset-password?token=${token}`;
  const forgotPath = `${siteOrigin}/forgot-password`;
  const { subject, html, text } = buildWelcomeEmail({ greeting, setupLink, forgotPath });

  const replyTo = (process.env.ALMA_REPLY_TO_EMAIL ?? "founders@alma.careers").trim();

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: getFromAddress(),
      to: [email],
      reply_to: replyTo,
      subject,
      text,
      html,
    }),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    return NextResponse.json({ error: `Resend ${r.status}: ${detail.slice(0, 300)}` }, { status: 502 });
  }
  const sendBody = (await r.json().catch(() => ({}))) as { id?: string };

  await logSignal({
    userId: target.user.id,
    agent: "planner",
    signalType: "welcome_email_sent",
    metadata: {
      via: "admin_send_welcome",
      sender_admin: ctx.user.email,
      to: email,
      resend_id: sendBody.id ?? null,
      from: getFromAddress(),
    },
  });

  return NextResponse.json({
    ok: true,
    sentTo: email,
    setupLink,
    emailId: sendBody.id ?? null,
  });
}
