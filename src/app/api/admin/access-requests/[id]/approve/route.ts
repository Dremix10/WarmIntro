// POST /api/admin/access-requests/[id]/approve — admin approves a waitlist
// row. Creates the auth.users record (or reuses one if email already exists),
// mints a password_reset_tokens row, fires a Telegram alert with the setup
// link so the admin can copy it on mobile, and returns the link in the
// response so the /admin UI can also surface it.
//
// `id` here is the pilot_signups row id, NOT a user id.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { sendTelegram } from "@/lib/telegram";

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
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "misconfigured" }, { status: 500 });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Read the waitlist row
  const { data: row, error: rowErr } = await admin
    .from("pilot_signups")
    .select("id, email, name, university")
    .eq("id", id)
    .maybeSingle();
  if (rowErr || !row) {
    return NextResponse.json({ error: "waitlist row not found" }, { status: 404 });
  }
  const email = row.email.trim().toLowerCase();

  // Try to create the user. If they already exist (rare — signup is closed
  // now, but possible if they were created via the admin dashboard or
  // before we closed the bypass), fall through and mint a token for the
  // existing user.
  let userId: string | null = null;
  const { data: createData, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (createData?.user) {
    userId = createData.user.id;
  } else if (createErr && /already.*registered|already.*exists|duplicate/i.test(createErr.message)) {
    // User already exists — look them up by email so we can still mint a
    // reset token. Supabase admin doesn't have getUserByEmail, so we list
    // and filter. Capped to 200 since we have ~10s of users right now.
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    const match = list?.users.find((u) => u.email?.toLowerCase() === email);
    if (match) userId = match.id;
  }

  if (!userId) {
    return NextResponse.json(
      { error: createErr?.message ?? "couldn't create or find user" },
      { status: 500 }
    );
  }

  // Mint a password_reset_tokens row — same machinery as the user-initiated
  // /api/auth/reset-password flow, just admin-authored.
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000).toISOString();
  const { error: insertErr } = await admin.from("password_reset_tokens").insert({
    token,
    user_id: userId,
    email,
    expires_at: expiresAt,
    ip: request.headers.get("x-real-ip") ?? null,
    user_agent: (request.headers.get("user-agent") ?? "").slice(0, 200) || null,
  });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  const setupLink = `${SITE_URL}/reset-password?token=${token}`;

  // Send the welcome email directly to the user via Resend so the admin
  // doesn't have to forward by hand. Failure is non-blocking — admin still
  // has the link via Telegram + the API response.
  let emailSent = false;
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const greeting = row.name ? `Hi ${row.name.split(" ")[0]}` : "Hi";
    const siteOrigin = SITE_URL.replace(/\/$/, "");
    const forgotPath = `${siteOrigin}/forgot-password`;
    const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#EAE3D2;padding:48px 24px;color:#14182A;line-height:1.6"><div style="max-width:520px;margin:0 auto;background:white;border:1px solid #D9CFB5;border-radius:16px;padding:36px"><p style="font-size:24px;font-style:italic;color:#1B3B5F;margin:0 0 24px 0">alma</p><p style="font-size:18px;font-weight:500;margin:0 0 12px 0">${greeting} — you&rsquo;re in.</p><p style="margin:0 0 18px 0">Your access to Alma&rsquo;s closed beta is approved. Click below to set a password and finish onboarding right inside the app.</p><p style="margin:24px 0;text-align:center"><a href="${setupLink}" style="display:inline-block;background:#1B3B5F;color:white;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600">Set up my account →</a></p><p style="margin:0 0 8px 0;font-size:13px;color:#5C6472">The link is good for one hour. Once you&rsquo;re in, Alma walks you through resume upload and firm picks — about three minutes.</p><p style="margin:0 0 18px 0;font-size:13px;color:#5C6472">Missed the window? Head to <a href="${forgotPath}" style="color:#2E5A88">${forgotPath}</a> and we&rsquo;ll send a fresh one.</p><hr style="border:0;border-top:1px solid #D9CFB5;margin:28px 0"><p style="margin:0 0 14px 0;font-size:14px"><strong>Founding-user perk:</strong> the full 2026 recruiting cycle is free for you. We&rsquo;ll roll out paid tiers after launch — you&rsquo;re grandfathered.</p><p style="margin:0 0 14px 0;font-size:14px">Some rough edges are expected — we&rsquo;re shipping fixes daily. Hit the floating <strong>Feedback</strong> button inside the app once you&rsquo;re signed in. We read everything.</p><p style="margin:24px 0 0 0;font-size:13px;color:#5C6472">— Demetris, Evangelos, Christos, Theofanis<br>4 students at Rice, Brown, and MIT, in the IB cycle right now too.</p></div></body></html>`;
    const textBody = `${greeting} — you're in.\n\nYour access to Alma's closed beta is approved. Set a password here:\n${setupLink}\n\nGood for one hour. Once you're in, Alma walks you through resume upload and firm picks (~3 min).\n\nMissed the window? Head to ${forgotPath} and we'll send a fresh one.\n\nFounding-user perk: the full 2026 recruiting cycle is free for you. We'll roll out paid tiers after launch — you're grandfathered.\n\nSome rough edges are expected — we're shipping fixes daily. Use the Feedback button inside the app to flag anything.\n\n— Demetris, Evangelos, Christos, Theofanis\n4 students at Rice, Brown, and MIT, in the IB cycle right now too.`;
    // Reply-to: the email is sent from a noreply address but we want
    // anyone who hits Reply to land somewhere a human reads. Configurable
    // via ALMA_REPLY_TO_EMAIL; default points to the founders inbox.
    const replyTo = (process.env.ALMA_REPLY_TO_EMAIL ?? "founders@alma.careers").trim();
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Alma <noreply@alma.careers>",
          to: [email],
          reply_to: replyTo,
          subject: "You're in — Alma is yours",
          text: textBody,
          html,
        }),
      });
      emailSent = r.ok;
    } catch {
      emailSent = false;
    }
  }

  // Telegram backup — admin can still copy the link if email delivery
  // failed or RESEND_API_KEY isn't set.
  void sendTelegram(
    `✅ Approved access\n\n` +
      `Email: ${email}\n` +
      `Name: ${row.name ?? "(not provided)"}\n` +
      `University: ${row.university ?? "(not provided)"}\n` +
      `Welcome email: ${emailSent ? "sent ✓" : "FAILED — forward manually"}\n\n` +
      `Setup link (good for ${TOKEN_TTL_MIN} min):\n${setupLink}`
  );

  return NextResponse.json({ ok: true, email, setupLink, expiresAt, emailSent });
}
