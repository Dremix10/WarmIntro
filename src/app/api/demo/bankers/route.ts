// POST /api/demo/bankers — public endpoint that returns 3 real bankers
// from our DB matched against the demo user's parsed profile. Replaces
// the hardcoded Alex/Maya/Jordan fake-bankers that two real testers
// bounced on (no LinkedIn URLs, invented hooks → obvious fakeness →
// loss of trust).
//
// No auth required — /demo is the lead-magnet surface and the user
// hasn't signed up yet. Body is just the parsed profile from
// /api/parse-resume; we use university to filter for same-school
// alumni when possible.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

interface DemoBanker {
  id: string;
  name: string;
  firstName: string;
  title: string;
  firm: string;
  firmTier: "BB" | "EB" | "MM" | "Other";
  university: string | null;
  linkedinUrl: string | null;
  group: string | null;
  // One short factual line about the banker, drawn from banker_findings
  // when available — gives the demo email a real anchor instead of an
  // invented hook.
  anchorLine: string | null;
}

interface BankerRow {
  id: string;
  firm_id: string | null;
  group_id: string | null;
  name: string;
  title: string;
  university: string | null;
  linkedin_url: string | null;
  email: string | null;
}

interface FirmRow { id: string; name: string; tier: string }
interface GroupRow { id: string; name: string }
interface FindingRow { banker_id: string; title: string | null; snippet: string | null; source_type: string }

const TIER_MAP: Record<string, "BB" | "EB" | "MM" | "Other"> = {
  bulge_bracket: "BB",
  elite_boutique: "EB",
  middle_market: "MM",
};

function pickAnchorLine(findings: FindingRow[], bankerName: string): string | null {
  // Prefer alumni_mention (school newsroom, conferences), then
  // linkedin_post (real activity), then linkedin_profile snippet.
  const order = ["alumni_mention", "linkedin_post", "press_mention", "deal_announcement", "linkedin_profile", "other"];
  const sorted = [...findings].sort((a, b) => order.indexOf(a.source_type) - order.indexOf(b.source_type));
  for (const f of sorted) {
    const s = (f.snippet ?? "").trim();
    if (!s) continue;
    // Drop the snippet down to a single sentence ending at the first
    // period. If it starts with the banker's name, trim that since the
    // demo email already names them.
    const firstSentence = s.split(/(?<=\.)\s+/)[0]?.slice(0, 200) ?? s.slice(0, 200);
    if (firstSentence.toLowerCase().startsWith(bankerName.toLowerCase())) {
      // "Asha Williams · Associate at Morgan Stanley · ..." → drop the prefix
      const tail = firstSentence.slice(bankerName.length).replace(/^[\s·,—\-]+/, "");
      if (tail.length > 10) return tail;
    }
    return firstSentence;
  }
  return null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    university?: string;
    name?: string;
    major?: string;
  };
  const userUni = (body.university ?? "").trim().toLowerCase();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Pull every banker with an email + LinkedIn URL — that's our "real, can-be-contacted" floor.
  const { data: bankers } = await admin
    .from("bankers")
    .select("id, firm_id, group_id, name, title, university, linkedin_url, email")
    .not("email", "is", null)
    .not("linkedin_url", "is", null)
    .limit(120);
  const all = (bankers ?? []) as BankerRow[];

  // Same-school first, then everyone else. Within each pool, prefer
  // analysts / associates (junior bankers reply more often → demo feels
  // more aspirational and realistic).
  const sameSchool = all.filter(
    (b) => b.university && userUni && b.university.toLowerCase().includes(userUni.split(" ")[0])
  );
  const others = all.filter((b) => !sameSchool.includes(b));
  const titleScore = (t: string) => {
    const lower = t.toLowerCase();
    if (lower.includes("analyst")) return 0;
    if (lower.includes("associate")) return 1;
    if (lower.includes("vice president") || lower.includes(" vp")) return 2;
    return 3;
  };
  sameSchool.sort((a, b) => titleScore(a.title) - titleScore(b.title));
  others.sort((a, b) => titleScore(a.title) - titleScore(b.title));

  // Take up to 3, biasing toward same-school. If we have <3 same-school,
  // fill from others — but cap others at 1 per firm so the trio reads
  // as variety.
  const picked: BankerRow[] = [];
  for (const b of sameSchool) {
    if (picked.length >= 3) break;
    picked.push(b);
  }
  const seenFirms = new Set(picked.map((b) => b.firm_id ?? ""));
  for (const b of others) {
    if (picked.length >= 3) break;
    const key = b.firm_id ?? "";
    if (seenFirms.has(key)) continue;
    seenFirms.add(key);
    picked.push(b);
  }
  if (picked.length === 0) {
    return NextResponse.json({ bankers: [] });
  }

  // Hydrate firms + groups + findings in one trip each.
  const firmIds = Array.from(new Set(picked.map((b) => b.firm_id).filter((x): x is string => !!x)));
  const groupIds = Array.from(new Set(picked.map((b) => b.group_id).filter((x): x is string => !!x)));
  const bankerIds = picked.map((b) => b.id);

  const [firmsRes, groupsRes, findingsRes] = await Promise.all([
    firmIds.length > 0
      ? admin.from("firms").select("id, name, tier").in("id", firmIds)
      : Promise.resolve({ data: [] as FirmRow[] }),
    groupIds.length > 0
      ? admin.from("groups").select("id, name").in("id", groupIds)
      : Promise.resolve({ data: [] as GroupRow[] }),
    admin
      .from("banker_findings")
      .select("banker_id, title, snippet, source_type")
      .in("banker_id", bankerIds)
      .limit(50),
  ]);
  const firmById = new Map<string, FirmRow>();
  for (const f of (firmsRes.data ?? []) as FirmRow[]) firmById.set(f.id, f);
  const groupById = new Map<string, GroupRow>();
  for (const g of (groupsRes.data ?? []) as GroupRow[]) groupById.set(g.id, g);
  const findingsByBanker = new Map<string, FindingRow[]>();
  for (const f of (findingsRes.data ?? []) as FindingRow[]) {
    const arr = findingsByBanker.get(f.banker_id) ?? [];
    arr.push(f);
    findingsByBanker.set(f.banker_id, arr);
  }

  const out: DemoBanker[] = picked.map((b) => {
    const firm = b.firm_id ? firmById.get(b.firm_id) : undefined;
    const group = b.group_id ? groupById.get(b.group_id) : undefined;
    const findings = findingsByBanker.get(b.id) ?? [];
    return {
      id: b.id,
      name: b.name,
      firstName: b.name.split(/\s+/)[0],
      title: b.title,
      firm: firm?.name ?? "(unknown firm)",
      firmTier: firm ? TIER_MAP[firm.tier] ?? "Other" : "Other",
      university: b.university,
      linkedinUrl: b.linkedin_url,
      group: group?.name ?? null,
      anchorLine: pickAnchorLine(findings, b.name),
    };
  });

  return NextResponse.json({ bankers: out });
}
