// POST /api/admin/users/[id]/send-welcome — admin sends the welcome
// email to an existing auth.users row. Used for users created outside
// the approve flow (e.g. backdoor inserts, early cofounder accounts)
// who never got the welcome originally.
//
// Mints a fresh password_reset_tokens row (48h TTL) so the setup link
// in the email is real — clicking it lets them set a password even
// if they've never set one. If they already have a password, clicking
// just resets it; not destructive.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { getFromAddress } from "@/lib/email-from";
import { buildWelcomeEmail } from "@/lib/welcome-email";
import { WELCOME_SETUP_TOKEN_TTL_MIN } from "@/lib/setup-token";
import { logSignal } from "@/services/signals/log";
import { isAdmin } from "@/services/auth/admin";
import type { TablesInsert } from "@/lib/db-helpers";

export const runtime = "nodejs";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alma.careers").trim();

function inferUniversity(email: string): string {
  if (email.endsWith("@brown.edu")) return "Brown University";
  if (email.endsWith("@rice.edu")) return "Rice University";
  return "Unknown University";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(ctx.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Optional body: { skipIfPasswordSet?: boolean, updateNote?: string }.
  // - skipIfPasswordSet=true: bail out (with reason) if the user already
  //   completed password_set. Used for "resend after a deliverability fix"
  //   so we don't spam users who already got in cleanly via the first email.
  // - updateNote: shown as a banner above the CTA + appends "(updated link)"
  //   to the subject so the recipient understands why a second email is
  //   arriving. See src/lib/welcome-email.ts.
  const body = (await request.json().catch(() => ({}))) as {
    skipIfPasswordSet?: boolean;
    updateNote?: string;
  };

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
  const email = target.user.email.trim().toLowerCase();

  // Skip-if-password-set check
  if (body.skipIfPasswordSet) {
    const { data: priorSets } = await admin
      .from("signals")
      .select("id")
      .eq("user_id", target.user.id)
      .eq("signal_type", "password_set")
      .limit(1);
    if (priorSets && priorSets.length > 0) {
      return NextResponse.json({
        ok: true,
        skipped: "already_password_set",
        sentTo: email,
      });
    }
  }

  // Pull a friendly first name from profiles if available. Also make sure
  // existing auth-only users get the approval marker used by src/proxy.ts.
  const { data: profile } = await admin
    .from("profiles")
    .select("name, major, graduation_year, university, resume_text")
    .eq("id", target.user.id)
    .maybeSingle();
  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: target.user.id,
      email,
      name: profile?.name ?? email.split("@")[0] ?? "Student",
      major: profile?.major ?? "Undeclared",
      graduation_year: profile?.graduation_year ?? new Date().getFullYear() + 3,
      university: profile?.university ?? inferUniversity(email),
      resume_text: profile?.resume_text ?? "",
      updated_at: new Date().toISOString(),
    } satisfies TablesInsert<"profiles">,
    { onConflict: "id" }
  );
  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }
  const greeting = profile?.name
    ? `Hi ${profile.name.split(" ")[0]}`
    : "Hi";

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + WELCOME_SETUP_TOKEN_TTL_MIN * 60 * 1000).toISOString();
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
  const { subject, html, text } = buildWelcomeEmail({
    greeting,
    setupLink,
    forgotPath,
    updateNote: body.updateNote,
  });

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
