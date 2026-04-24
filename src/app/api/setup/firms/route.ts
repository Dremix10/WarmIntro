// GET /api/setup/firms — list all firms + groups for the onboarding bank picker
// Uses direct Supabase REST (service-role) to avoid any @supabase/supabase-js
// RLS bypass weirdness in Edge runtime. Firms/groups are public reference data.

import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "supabase_env_missing" }, { status: 500 });
  }

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  const [firmsRes, groupsRes] = await Promise.all([
    fetch(`${url}/rest/v1/firms?select=id,name,tier,logo_url,domain&order=tier.asc`, { headers }),
    fetch(`${url}/rest/v1/groups?select=id,firm_id,name,kind`, { headers }),
  ]);

  if (!firmsRes.ok) {
    return NextResponse.json(
      { error: "firms_fetch_failed", status: firmsRes.status, detail: await firmsRes.text() },
      { status: 500 }
    );
  }

  const firms = await firmsRes.json();
  const groups = groupsRes.ok ? await groupsRes.json() : [];
  return NextResponse.json({ firms, groups });
}
