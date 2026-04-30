// GET /api/admin/users — admin-only roster of every Alma user with status flags.
//
// Auth: only emails listed in ADMIN_EMAILS env var (comma-separated) can hit this.
// Returns: every auth.users row joined to profiles, with action counts so the
// admin dashboard can show who's stuck where in the funnel.

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

export async function GET(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isAdmin(ctx.user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "misconfigured" }, { status: 500 });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // List every auth user (admin endpoint)
  const { data: authData, error: authErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  const userIds = authData.users.map((u) => u.id);

  // Profiles with full state
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, name, email, university, major, graduation_year, target_firms, target_groups, story_one_liner, gmail_email, gmail_connected_at, resume_text, updated_at")
    .in("id", userIds);

  // Counts of drafts (pending/sent) per user
  const { data: draftRows } = await admin
    .from("drafts")
    .select("user_id, status, sent_at")
    .in("user_id", userIds);

  const draftStats: Record<string, { pending: number; sent: number }> = {};
  for (const d of draftRows ?? []) {
    if (!draftStats[d.user_id]) draftStats[d.user_id] = { pending: 0, sent: 0 };
    if (d.sent_at) draftStats[d.user_id].sent++;
    else draftStats[d.user_id].pending++;
  }

  const { data: connRows } = await admin
    .from("connections")
    .select("user_id, stage")
    .in("user_id", userIds);
  const connStats: Record<string, number> = {};
  for (const c of connRows ?? []) connStats[c.user_id] = (connStats[c.user_id] ?? 0) + 1;

  // Per-user Anthropic spend, last 24h. Aggregating client-side because
  // Supabase JS doesn't expose group-by directly. cost_usd is tiny per
  // row but we have a sane upper bound (~hundreds of rows/user/day).
  const { data: usageRows } = await admin
    .from("claude_usage")
    .select("user_id, cost_usd, occurred_at")
    .in("user_id", userIds)
    .gte("occurred_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  const cost24h: Record<string, number> = {};
  for (const r of usageRows ?? []) {
    if (!r.user_id) continue;
    cost24h[r.user_id] = (cost24h[r.user_id] ?? 0) + Number(r.cost_usd ?? 0);
  }

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const users = authData.users.map((u) => {
    const p = profileById.get(u.id);
    const stats = draftStats[u.id] ?? { pending: 0, sent: 0 };
    return {
      id: u.id,
      authEmail: u.email,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      emailConfirmed: !!u.email_confirmed_at,
      profile: p
        ? {
            name: p.name,
            university: p.university,
            major: p.major,
            graduationYear: p.graduation_year,
            targetFirmCount: (p.target_firms ?? []).length,
            targetGroups: p.target_groups ?? [],
            hasResume: Boolean(p.resume_text && p.resume_text.length > 0),
            resumeChars: (p.resume_text ?? "").length,
            storyOneLiner: p.story_one_liner,
            gmailEmail: p.gmail_email,
            gmailConnected: Boolean(p.gmail_connected_at),
            updatedAt: p.updated_at,
          }
        : null,
      drafts: stats,
      connections: connStats[u.id] ?? 0,
      cost24hUsd: Number((cost24h[u.id] ?? 0).toFixed(4)),
    };
  });

  // Sort: most-recently-active first
  users.sort((a, b) => {
    const at = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
    const bt = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
    return bt - at;
  });

  return NextResponse.json({ users });
}
