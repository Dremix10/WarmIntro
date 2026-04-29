// POST /api/auth/set-password — final step of the self-owned recovery flow.
// Validates a token from password_reset_tokens and sets the user's password
// via the Supabase admin API. Single-use: marks the token used_at on success.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logSignal } from "@/services/signals/log";

export const runtime = "nodejs";

interface Body { token?: string; password?: string }

export async function POST(request: Request) {
  const { token, password } = (await request.json()) as Body;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Auth service misconfigured" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Look up the token. Validate: not used, not expired.
  const { data: row, error: rowErr } = await admin
    .from("password_reset_tokens")
    .select("token, user_id, email, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();
  if (rowErr || !row) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 400 });
  }
  if (row.used_at) {
    return NextResponse.json({ error: "This link has already been used." }, { status: 400 });
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This link has expired. Request a fresh one." }, { status: 400 });
  }

  // Set the new password.
  const { error: updateErr } = await admin.auth.admin.updateUserById(row.user_id, { password });
  if (updateErr) {
    console.warn("[set-password] updateUserById failed", updateErr);
    return NextResponse.json({ error: "Couldn't set the new password. Try again." }, { status: 500 });
  }

  // Burn the token.
  await admin.from("password_reset_tokens").update({ used_at: new Date().toISOString() }).eq("token", token);

  await logSignal({
    userId: row.user_id,
    agent: "planner",
    signalType: "password_set",
    metadata: { email: row.email },
  });

  return NextResponse.json({ ok: true, email: row.email });
}
