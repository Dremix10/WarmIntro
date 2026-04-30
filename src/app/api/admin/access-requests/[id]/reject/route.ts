// POST /api/admin/access-requests/[id]/reject — admin rejects a waitlist
// row. Hard-deletes the pilot_signups row so it disappears from the
// /admin queue. No email is sent, no auth.users row is created.
//
// Used to clean up CI/e2e smoke-test signups (e2e-<rand>@brown.edu) that
// pile up on every push, plus any real applicants the admin doesn't want
// to admit.

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "misconfigured" }, { status: 500 });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: row } = await admin
    .from("pilot_signups")
    .select("id, email")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "waitlist row not found" }, { status: 404 });

  const { error: deleteErr } = await admin.from("pilot_signups").delete().eq("id", id);
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, rejectedEmail: row.email });
}
