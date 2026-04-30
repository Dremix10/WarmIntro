// GET /api/admin/access-requests — list pilot_signups (the waitlist) for
// the admin UI. Joins against auth.users so the UI can flag rows where
// the user has already been onboarded (avoid double-approving).

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

interface AccessRequest {
  id: string;
  email: string;
  name: string | null;
  university: string | null;
  major: string | null;
  graduationYear: number | null;
  hasResume: boolean;
  createdAt: string;
  approved: boolean; // true if a user with this email exists in auth.users
}

export async function GET(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(ctx.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "misconfigured" }, { status: 500 });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error } = await admin
    .from("pilot_signups")
    .select("id, email, name, university, major, graduation_year, resume_text, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mark which signups already have an auth.users record. Bulk-list once and
  // build a set keyed on lowercased email — saves N round-trips vs per-row.
  const { data: usersList } = await admin.auth.admin.listUsers({ perPage: 200 });
  const onboarded = new Set((usersList?.users ?? []).map((u) => u.email?.toLowerCase()).filter(Boolean) as string[]);

  const requests: AccessRequest[] = (rows ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    university: r.university,
    major: r.major,
    graduationYear: r.graduation_year,
    hasResume: Boolean(r.resume_text && r.resume_text.length > 0),
    createdAt: r.created_at,
    approved: onboarded.has(r.email.toLowerCase()),
  }));

  return NextResponse.json({ requests });
}
