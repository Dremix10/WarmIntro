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
import { getFromAddress } from "@/lib/email-from";
import { buildWelcomeEmail } from "@/lib/welcome-email";
import { WELCOME_SETUP_TOKEN_TTL_LABEL, WELCOME_SETUP_TOKEN_TTL_MIN } from "@/lib/setup-token";
import { logSignal } from "@/services/signals/log";
import { isAdmin } from "@/services/auth/admin";
import type { TablesInsert } from "@/lib/db-helpers";

export const runtime = "nodejs";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alma.careers").trim();

function inferUniversity(email: string, requestedUniversity: string | null): string {
  const clean = requestedUniversity?.trim();
  if (clean) return clean;
  if (email.endsWith("@brown.edu")) return "Brown University";
  if (email.endsWith("@rice.edu")) return "Rice University";
  return "Unknown University";
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

  // This profile row is also the private-beta approval marker used by
  // src/proxy.ts. A verified school email alone is not enough to enter the app.
  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      name: row.name?.trim() || email.split("@")[0] || "Student",
      major: "Undeclared",
      graduation_year: new Date().getFullYear() + 3,
      university: inferUniversity(email, row.university),
      resume_text: "",
      updated_at: new Date().toISOString(),
    } satisfies TablesInsert<"profiles">,
    { onConflict: "id" }
  );
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  // Mint a password_reset_tokens row — same machinery as the user-initiated
  // /api/auth/reset-password flow, just admin-authored.
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + WELCOME_SETUP_TOKEN_TTL_MIN * 60 * 1000).toISOString();
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
  let resendId: string | null = null;
  let emailError: string | null = null;
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const greeting = row.name ? `Hi ${row.name.split(" ")[0]}` : "Hi";
    const siteOrigin = SITE_URL.replace(/\/$/, "");
    const forgotPath = `${siteOrigin}/forgot-password`;
    const { subject, html, text } = buildWelcomeEmail({ greeting, setupLink, forgotPath });
    // Reply-to: anyone who hits Reply should land somewhere a human reads.
    // Configurable via ALMA_REPLY_TO_EMAIL.
    const replyTo = (process.env.ALMA_REPLY_TO_EMAIL ?? "founders@alma.careers").trim();
    try {
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
      emailSent = r.ok;
      if (r.ok) {
        const j = (await r.json().catch(() => ({}))) as { id?: string };
        resendId = j.id ?? null;
      } else {
        emailError = `Resend ${r.status}: ${(await r.text().catch(() => "")).slice(0, 200)}`;
      }
    } catch (err) {
      emailSent = false;
      emailError = err instanceof Error ? err.message : String(err);
    }
  } else {
    emailError = "RESEND_API_KEY not set";
  }

  // Audit trail — without this signal, "did the welcome email actually
  // ship?" was unanswerable, which is exactly what bit us on the David
  // Weng approve. logSignal is fire-and-forget and never throws.
  await logSignal({
    userId,
    agent: "planner",
    signalType: emailSent ? "welcome_email_sent" : "welcome_email_failed",
    metadata: {
      via: "admin_approve",
      sender_admin: ctx.user.email,
      to: email,
      resend_id: resendId,
      from: getFromAddress(),
      error: emailError,
    },
  });

  // Telegram backup — admin can still copy the link if email delivery
  // failed or RESEND_API_KEY isn't set.
  void sendTelegram(
    `✅ Approved access\n\n` +
      `Email: ${email}\n` +
      `Name: ${row.name ?? "(not provided)"}\n` +
      `University: ${row.university ?? "(not provided)"}\n` +
      `Welcome email: ${emailSent ? "sent ✓" : "FAILED — forward manually"}\n\n` +
      `Setup link (good for ${WELCOME_SETUP_TOKEN_TTL_LABEL}):\n${setupLink}`
  );

  return NextResponse.json({ ok: true, email, setupLink, expiresAt, emailSent });
}
