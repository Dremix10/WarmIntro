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

  // Telegram with the link — admin can copy on mobile + forward to the
  // user. Plain text (no Markdown) so the URL doesn't get parsed weird.
  void sendTelegram(
    `✅ Approved access\n\n` +
      `Email: ${email}\n` +
      `Name: ${row.name ?? "(not provided)"}\n` +
      `University: ${row.university ?? "(not provided)"}\n\n` +
      `Setup link (good for ${TOKEN_TTL_MIN} min):\n${setupLink}\n\n` +
      `Forward this to the user. They'll set a password and land on /today.`
  );

  return NextResponse.json({ ok: true, email, setupLink, expiresAt });
}
