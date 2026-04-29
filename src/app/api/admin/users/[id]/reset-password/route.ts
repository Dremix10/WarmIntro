// POST /api/admin/users/[id]/reset-password — admin-triggered password reset for a user.
// Returns the recovery URL so the admin can copy it to the user (e.g. text it
// to a tester whose email is broken). Also fires the standard reset email.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.alma.careers";
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "misconfigured" }, { status: 500 });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch the user's email to feed generateLink
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(id);
  if (userErr || !userData.user?.email) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: userData.user.email,
    options: { redirectTo: `${siteUrl}/reset-password` },
  });
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });

  const actionLink = linkData.properties?.action_link;
  if (!actionLink) return NextResponse.json({ error: "no link generated" }, { status: 500 });

  // Best-effort email — same body as the user-initiated route. We return the
  // link in the response either way so the admin can paste it manually.
  // .trim() defends against trailing-newline env values (vercel env add via
  // echo bug — Resend rejects "Bearer key\n" as invalid API key).
  const resendKey = process.env.RESEND_API_KEY?.trim();
  let emailSent = false;
  if (resendKey) {
    const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;background:#EAE3D2;padding:48px 24px;color:#14182A;line-height:1.6"><div style="max-width:480px;margin:0 auto;background:white;border:1px solid #D9CFB5;border-radius:16px;padding:36px"><p style="font-size:24px;font-style:italic;color:#1B3B5F;margin:0 0 24px 0">alma</p><p style="font-size:18px;font-weight:500;margin:0 0 12px 0">Reset your password</p><p style="margin:0 0 16px 0">An admin issued you a new password-reset link. Good for one hour.</p><p style="margin:24px 0"><a href="${actionLink}" style="display:inline-block;background:#1B3B5F;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:500">Reset password</a></p><p style="margin:0 0 8px 0;font-size:12px;color:#5C6472">Or copy this link:</p><p style="margin:0;font-size:12px;word-break:break-all"><a href="${actionLink}" style="color:#2E5A88">${actionLink}</a></p></div></body></html>`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Alma <noreply@alma.careers>",
        to: [userData.user.email],
        subject: "Reset your Alma password (admin-triggered)",
        text: `Reset your password: ${actionLink}\n\nGood for one hour.`,
        html,
      }),
    });
    emailSent = r.ok;
  }

  return NextResponse.json({ ok: true, email: userData.user.email, actionLink, emailSent });
}
