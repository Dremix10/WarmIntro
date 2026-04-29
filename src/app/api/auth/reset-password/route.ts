// POST /api/auth/reset-password — fully self-owned password recovery flow.
//
// Bypasses Supabase Auth's recovery entirely. We:
//   1. Look the user up by email via the admin API (or short-circuit if missing,
//      without leaking).
//   2. Mint a 32-byte random token, store it in `password_reset_tokens` with a
//      1-hour expiry.
//   3. Email the user via Resend with a link to /reset-password?token=<token>.
//
// /reset-password posts the token back to /api/auth/set-password which calls
// admin.updateUserById(). No Supabase template, no Site-URL config, no PKCE
// vs hash mismatch.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { logSignal } from "@/services/signals/log";

export const runtime = "nodejs";

const FROM_ADDRESS = "Alma <noreply@alma.careers>";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alma.careers").trim();
const TOKEN_TTL_MIN = 60;

// Per-email throttle: 1 reset/60s. Survives across requests in-memory only,
// fine for our scale; would upgrade to Redis when traffic warrants.
const PER_EMAIL_COOLDOWN_MS = 60_000;
const lastResetByEmail = new Map<string, number>();
function isThrottled(email: string): boolean {
  const last = lastResetByEmail.get(email);
  return !!last && Date.now() - last < PER_EMAIL_COOLDOWN_MS;
}
function recordReset(email: string): void {
  lastResetByEmail.set(email, Date.now());
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
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Auth service misconfigured" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Look the user up by email. We deliberately don't reveal whether they
  // exist — silent 200 either way.
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = list?.users.find((u) => (u.email ?? "").toLowerCase() === normalized);
  if (!user) {
    await logSignal({
      agent: "planner",
      signalType: "reset_password_unknown_email",
      metadata: { email: normalized },
    });
    return NextResponse.json({ ok: true });
  }

  // Mint our own token. 32 bytes hex = 64-char string, hard to brute force.
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000).toISOString();

  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = request.headers.get("user-agent") ?? null;

  const { error: insertErr } = await admin.from("password_reset_tokens").insert({
    token,
    user_id: user.id,
    email: normalized,
    expires_at: expiresAt,
    ip,
    user_agent: ua?.slice(0, 200) ?? null,
  });
  if (insertErr) {
    console.warn("[reset-password] insert token failed", insertErr);
    return NextResponse.json({ ok: true });
  }

  const link = `${SITE_URL}/reset-password?token=${token}`;

  // Send via Resend. Same template as before — link now points at OUR
  // page with OUR token, no Supabase verify in the chain.
  if (!resendKey) {
    console.log(`[reset-password] dev mode — would email ${normalized} link:\n${link}`);
    await logSignal({
      userId: user.id,
      agent: "planner",
      signalType: "reset_password_sent",
      metadata: { email: normalized, devMode: true },
    });
    return NextResponse.json({ ok: true });
  }

  const subject = "Reset your Alma password";
  const text = [
    "Hey,",
    "",
    "You asked to reset your Alma password. Click the link below — it's good for one hour.",
    "",
    link,
    "",
    "If you didn't ask for this, ignore this email. Your password won't change.",
    "",
    "— Alma",
    "https://www.alma.careers",
  ].join("\n");

  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#EAE3D2;padding:48px 24px;color:#14182A;line-height:1.6">
<div style="max-width:480px;margin:0 auto;background:white;border:1px solid #D9CFB5;border-radius:16px;padding:36px">
<p style="font-size:24px;font-style:italic;color:#1B3B5F;margin:0 0 24px 0">alma</p>
<p style="font-size:18px;font-weight:500;margin:0 0 12px 0">Reset your password</p>
<p style="margin:0 0 16px 0">You asked to reset your Alma password. Click the button below — it's good for one hour.</p>
<p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#1B3B5F;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:500">Reset password</a></p>
<p style="margin:0 0 8px 0;font-size:12px;color:#5C6472">Or copy this link into your browser:</p>
<p style="margin:0 0 24px 0;font-size:12px;word-break:break-all"><a href="${link}" style="color:#2E5A88">${link}</a></p>
<p style="margin:24px 0 0 0;font-size:12px;color:#5C6472;font-style:italic">If you didn't ask for this, ignore this email. Your password won't change.</p>
</div></body></html>`;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [normalized], subject, text, html }),
  });
  if (!resendRes.ok) {
    const body = await resendRes.text();
    console.warn(`[reset-password] resend ${resendRes.status}: ${body}`);
    await logSignal({
      userId: user.id,
      agent: "planner",
      signalType: "reset_password_failed",
      metadata: { email: normalized, status: resendRes.status, body: body.slice(0, 300) },
    });
    return NextResponse.json({ ok: true });
  }

  await logSignal({
    userId: user.id,
    agent: "planner",
    signalType: "reset_password_sent",
    metadata: { email: normalized },
  });
  return NextResponse.json({ ok: true });
}
