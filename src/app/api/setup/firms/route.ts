// GET /api/setup/firms — list all firms + groups for the onboarding bank picker

import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function GET(request: Request) {
  const ctx = await getUser(request);
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: firms }, { data: groups }] = await Promise.all([
    ctx.supabase.from("firms").select("id, name, tier, logo_url, domain").order("tier", { ascending: true }),
    ctx.supabase.from("groups").select("id, firm_id, name, kind"),
  ]);

  return NextResponse.json({ firms: firms ?? [], groups: groups ?? [] });
}
