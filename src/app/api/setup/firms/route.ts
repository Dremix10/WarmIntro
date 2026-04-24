// GET /api/setup/firms — list all firms + groups for the onboarding bank picker
// Uses admin client since firms/groups are public reference data and the
// private-beta gate middleware already keeps non-testers out.

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const admin = getAdminClient();
  const [{ data: firms, error: firmsErr }, { data: groups }] = await Promise.all([
    admin.from("firms").select("id, name, tier, logo_url, domain").order("tier", { ascending: true }),
    admin.from("groups").select("id, firm_id, name, kind"),
  ]);

  if (firmsErr) return NextResponse.json({ error: firmsErr.message }, { status: 500 });
  return NextResponse.json({ firms: firms ?? [], groups: groups ?? [] });
}
