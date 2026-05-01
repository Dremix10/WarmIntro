// POST /api/admin/users/[id]/reset-password — admin issues a fresh reset
// link. Same flow as the user-initiated /api/auth/reset-password (our token
// table, our email, our /reset-password page) — just gated to admin emails
// and returns the link in the response so the admin can copy it manually if
// email delivery fails.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { getFromAddress } from "@/lib/email-from";
import { isAdmin } from "@/services/auth/admin";

export const runtime = "nodejs";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alma.careers").trim();
const TOKEN_TTL_MIN = 60;

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

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(id);
  if (userErr || !userData.user?.email) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }
  const email = userData.user.email.toLowerCase();

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000).toISOString();

  const { error: insertErr } = await admin.from("password_reset_tokens").insert({
    token,
    user_id: id,
    email,
    expires_at: expiresAt,
    ip: request.headers.get("x-real-ip") ?? null,
    user_agent: (request.headers.get("user-agent") ?? "").slice(0, 200) || null,
  });
  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const link = `${SITE_URL}/reset-password?token=${token}`;

  const resendKey = process.env.RESEND_API_KEY?.trim();
  let emailSent = false;
  if (resendKey) {
    const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#EAE3D2;padding:48px 24px;color:#14182A;line-height:1.6"><div style="max-width:480px;margin:0 auto;background:white;border:1px solid #D9CFB5;border-radius:16px;padding:36px"><p style="font-size:24px;font-style:italic;color:#1B3B5F;margin:0 0 24px 0">alma</p><p style="font-size:18px;font-weight:500;margin:0 0 12px 0">Reset your password</p><p style="margin:0 0 16px 0">An admin issued you a new password-reset link. Good for one hour.</p><p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#1B3B5F;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:500">Reset password</a></p><p style="margin:0 0 8px 0;font-size:12px;color:#5C6472">Or copy this link:</p><p style="margin:0;font-size:12px;word-break:break-all"><a href="${link}" style="color:#2E5A88">${link}</a></p></div></body></html>`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: getFromAddress(),
        to: [email],
        subject: "Reset your Alma password (admin-triggered)",
        text: `Reset your password: ${link}\n\nGood for one hour.`,
        html,
      }),
    });
    emailSent = r.ok;
  }

  return NextResponse.json({ ok: true, email, actionLink: link, emailSent });
}
