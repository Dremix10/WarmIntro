// GET /api/setup/firms — list all firms + groups for the onboarding bank picker.
// Augments firms with banker counts (total + same-school) so cards show real
// information instead of just tier names. Direct REST to avoid the
// @supabase/supabase-js admin-client silent-empty bug.

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "supabase_env_missing" }, { status: 500 });
  }

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  // ?university=Rice%20University adds a same-school count per firm
  const reqUrl = new URL(request.url);
  const university = reqUrl.searchParams.get("university") ?? "";

  const [firmsRes, groupsRes, bankersRes] = await Promise.all([
    fetch(`${url}/rest/v1/firms?select=id,name,tier,logo_url,domain,hq_city&order=tier.asc`, { headers }),
    fetch(`${url}/rest/v1/groups?select=id,firm_id,name,kind`, { headers }),
    fetch(`${url}/rest/v1/bankers?select=firm_id,university&limit=1000`, { headers }),
  ]);

  if (!firmsRes.ok) {
    return NextResponse.json(
      { error: "firms_fetch_failed", status: firmsRes.status, detail: await firmsRes.text() },
      { status: 500 }
    );
  }

  const firms = (await firmsRes.json()) as Array<{ id: string; name: string; tier: string; logo_url: string | null; domain: string; hq_city: string | null }>;
  const groups = groupsRes.ok ? await groupsRes.json() : [];
  const bankers = bankersRes.ok ? ((await bankersRes.json()) as Array<{ firm_id: string | null; university: string | null }>) : [];

  // Compute counts per firm
  const totalCount: Record<string, number> = {};
  const sameSchoolCount: Record<string, number> = {};
  for (const b of bankers) {
    if (!b.firm_id) continue;
    totalCount[b.firm_id] = (totalCount[b.firm_id] ?? 0) + 1;
    if (university && b.university === university) {
      sameSchoolCount[b.firm_id] = (sameSchoolCount[b.firm_id] ?? 0) + 1;
    }
  }

  const augmented = firms.map((f) => ({
    ...f,
    bankerCount: totalCount[f.id] ?? 0,
    sameSchoolCount: sameSchoolCount[f.id] ?? 0,
    groups: (groups as Array<{ firm_id: string; name: string; kind: string }>).filter((g) => g.firm_id === f.id).map((g) => ({ name: g.name, kind: g.kind })),
  }));

  return NextResponse.json({ firms: augmented, groups });
}
