// GET /api/admin/users/[id]/resume — admin pulls the raw resume text for a
// user. Returns plain text so the admin can copy/paste or save as .txt.
// Admin-gated by ADMIN_EMAILS allowlist (same gate as reset-password).

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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { data, error } = await admin
    .from("profiles")
    .select("name, email, resume_text, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });

  const resumeText = data.resume_text ?? "";
  if (!resumeText) return NextResponse.json({ error: "no resume on file" }, { status: 404 });

  // Build a download-friendly filename from the user's name (or fall back to id).
  const safeName = (data.name ?? "user").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
  const filename = `resume_${safeName}_${id.slice(0, 8)}.txt`;

  return new NextResponse(resumeText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
