// POST /api/auth/reset-password — custom password-reset flow that bypasses
// Supabase Auth's email template entirely.
//
// Flow:
//   1. Generate a recovery link via the Supabase admin API (it does NOT
//      send the email — we do).
//   2. Send our own branded email through Resend with the link in plaintext
//      AND as an anchor.
//
// Why not use supabase.auth.resetPasswordForEmail? Because that hands the
// rendering to Supabase Auth's template, which (a) routes through Supabase's
// shared SMTP unless we configure custom SMTP server-side via the dashboard,
// and (b) the template variable {{ .ConfirmationURL }} renders blank when
// the Site URL isn't set just so. By pulling the link via admin.generateLink
// + sending via Resend ourselves, we control every byte of what the user
// sees.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logSignal } from "@/services/signals/log";

export const runtime = "nodejs";

const FROM_ADDRESS = "Alma <noreply@alma.careers>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alma.careers";

// Per-email throttle: same address can't trigger more than 1 reset every 60s.
// Stops the route from being a free email amplifier targeting any allowlisted
// student. Lives in memory (per-instance) — fine for a small fleet; upgrade
// to Redis if abuse is observed.
const PER_EMAIL_COOLDOWN_MS = 60_000;
const lastResetByEmail = new Map<string, number>();

function isThrottled(email: string): boolean {
  const last = lastResetByEmail.get(email);
  if (!last) return false;
  return Date.now() - last < PER_EMAIL_COOLDOWN_MS;
}
function recordReset(email: string): void {
  lastResetByEmail.set(email, Date.now());
  // Cap map size so it doesn't grow unbounded.
  if (lastResetByEmail.size > 5000) {
    const cutoff = Date.now() - PER_EMAIL_COOLDOWN_MS * 5;
    for (const [k, t] of lastResetByEmail) if (t < cutoff) lastResetByEmail.delete(k);
  }
}

export async function POST(request: Request) {
  const { email } = (await request.json()) as { email?: string };
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  const normalized = email.toLowerCase().trim();
  if (isThrottled(normalized)) {
    // Don't leak — return 200 so attackers can't probe rate-limit behavior.
    return NextResponse.json({ ok: true });
  }
  recordReset(normalized);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  // Defensive .trim() — Vercel `echo "..." | vercel env add` leaves a trailing
  // newline which Resend rejects with "API key is invalid". Safer to always
  // strip whitespace from auth tokens regardless of how they got stored.
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Auth service misconfigured" }, { status: 500 });
  }

  // Admin client — needed for generateLink. Never exposed to the browser.
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Generate the recovery link (does not send email).
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${SITE_URL}/reset-password`,
    },
  });
  if (error) {
    // Don't leak whether the email exists — return 200 either way.
    console.warn("[reset-password] generateLink error", error);
    return NextResponse.json({ ok: true });
  }

  const actionLink = data.properties?.action_link;
  if (!actionLink) {
    console.warn("[reset-password] no action_link returned", data);
    return NextResponse.json({ ok: true });
  }

  // Send via Resend. If RESEND_API_KEY is missing in dev, we log + 200
  // so the rest of the flow keeps working.
  if (!resendKey) {
    console.log(`[reset-password] dev mode — would email ${email} this link:\n${actionLink}`);
    return NextResponse.json({ ok: true });
  }

  const subject = "Reset your Alma password";
  const text = [
    `Hey,`,
    ``,
    `You asked to reset your Alma password. Click the link below — it's good for one hour.`,
    ``,
    actionLink,
    ``,
    `If you didn't ask for this, ignore this email. Your password won't change.`,
    ``,
    `— Alma`,
    `https://www.alma.careers`,
  ].join("\n");

  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#EAE3D2;padding:48px 24px;color:#14182A;line-height:1.6">
<div style="max-width:480px;margin:0 auto;background:white;border:1px solid #D9CFB5;border-radius:16px;padding:36px">
<p style="font-size:24px;font-style:italic;color:#1B3B5F;margin:0 0 24px 0">alma</p>
<p style="font-size:18px;font-weight:500;margin:0 0 12px 0">Reset your password</p>
<p style="margin:0 0 16px 0">You asked to reset your Alma password. Click the button below — it's good for one hour.</p>
<p style="margin:24px 0"><a href="${actionLink}" style="display:inline-block;background:#1B3B5F;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:500">Reset password</a></p>
<p style="margin:0 0 8px 0;font-size:12px;color:#5C6472">Or copy this link into your browser:</p>
<p style="margin:0 0 24px 0;font-size:12px;word-break:break-all"><a href="${actionLink}" style="color:#2E5A88">${actionLink}</a></p>
<p style="margin:24px 0 0 0;font-size:12px;color:#5C6472;font-style:italic">If you didn't ask for this, ignore this email. Your password won't change.</p>
</div></body></html>`;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [email],
      subject,
      text,
      html,
    }),
  });
  if (!resendRes.ok) {
    const body = await resendRes.text();
    console.warn(`[reset-password] resend error ${resendRes.status}: ${body}`);
    // Log to Supabase so we can audit failures across the fleet.
    await logSignal({
      agent: "planner",
      signalType: "reset_password_failed",
      metadata: { email, status: resendRes.status, body: body.slice(0, 300) },
    });
    // Still return 200 so we don't leak failure modes.
    return NextResponse.json({ ok: true });
  }

  await logSignal({
    agent: "planner",
    signalType: "reset_password_sent",
    metadata: { email },
  });
  return NextResponse.json({ ok: true });
}
