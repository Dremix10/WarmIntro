// POST /api/admin/access-requests/cleanup-e2e — bulk-deletes pilot_signups
// rows whose email matches any synthetic-email pattern (e2e-/smoke-/@example.com).
// One click clears the backlog of CI smoke-test signups instead of clicking
// reject on each row.

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/services/auth/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(ctx.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "misconfigured" }, { status: 500 });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Postgres ILIKE on three synthetic patterns — must match the regex in
  // src/lib/synthetic-email.ts. Kept as ILIKE here because Supabase doesn't
  // do regex filtering in PostgREST and pulling the full table to filter
  // in JS would race with concurrent inserts.
  const { data: rows, error: selErr } = await admin
    .from("pilot_signups")
    .select("id, email")
    .or("email.ilike.e2e-%@%,email.ilike.smoke-%@%,email.ilike.%@example.com");
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  if (!rows || rows.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }

  const ids = rows.map((r) => r.id);
  const { error: delErr } = await admin.from("pilot_signups").delete().in("id", ids);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: ids.length });
}
