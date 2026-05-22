import { supabase } from "@/lib/supabase-browser";
import type { DeckBanker, FirmTier, UserContext } from "./types";

type FirmJoin = { id: string; name: string; tier: FirmTier | null } | null;
type BankerJoin = {
  id: string;
  name: string;
  title: string | null;
  seniority: string | null;
  grad_year: number | null;
  university: string | null;
  firms: FirmJoin;
};
type ConnRow = {
  id: string;
  stage: string;
  warmth: number | null;
  bankers: BankerJoin | null;
};
type ProfileRow = {
  university: string | null;
  graduation_year: number | null;
};

const CONNECTION_SELECT =
  "id, stage, warmth, bankers(id, name, title, seniority, grad_year, university, firms(id, name, tier))";

export async function loadDeckBankers(
  userId: string,
): Promise<{ bankers: DeckBanker[]; userContext: UserContext }> {
  const [profileRes, connectionRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("university, graduation_year")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("connections")
      .select(CONNECTION_SELECT)
      .eq("user_id", userId)
      .neq("stage", "closed_lost"),
  ]);

  const errors = [
    formatSupabaseError("profiles", profileRes.error),
    formatSupabaseError("connections", connectionRes.error),
  ].filter(Boolean);
  if (errors.length > 0) throw new Error(errors.join("; "));

  const profile = (profileRes.data ?? null) as ProfileRow | null;
  const userContext = {
    university: profile?.university ?? "",
    graduationYear: profile?.graduation_year ?? 0,
  };

  return {
    bankers: toDeckBankers((connectionRes.data ?? []) as unknown as ConnRow[], userContext),
    userContext,
  };
}

function formatSupabaseError(
  label: string,
  error: { message?: string; code?: string; details?: string | null } | null,
): string | null {
  if (!error) return null;
  const code = error.code ? ` (${error.code})` : "";
  const details = error.details ? `: ${error.details}` : "";
  return `${label}${code}: ${error.message ?? "query failed"}${details}`;
}

function toDeckBankers(connections: ConnRow[], userContext: UserContext): DeckBanker[] {
  const seen = new Set<string>();
  const out: DeckBanker[] = [];

  for (const connection of connections) {
    const banker = connection.bankers;
    if (!banker || seen.has(banker.id)) continue;
    seen.add(banker.id);

    const sameSchool = !!(
      banker.university &&
      userContext.university &&
      banker.university.toLowerCase() === userContext.university.toLowerCase()
    );
    const closeGradYear = !!(
      banker.grad_year &&
      userContext.graduationYear &&
      Math.abs(banker.grad_year - userContext.graduationYear) <= 5
    );
    const seniority = (banker.seniority ?? "").toLowerCase();

    out.push({
      connectionId: connection.id,
      bankerId: banker.id,
      name: banker.name,
      title: banker.title,
      seniority: banker.seniority,
      gradYear: banker.grad_year,
      university: banker.university,
      firmId: banker.firms?.id ?? null,
      firmName: banker.firms?.name ?? null,
      firmTier: banker.firms?.tier ?? null,
      warmth: connection.warmth ? Math.round(connection.warmth) : 0,
      stage: (connection.stage as DeckBanker["stage"]) ?? "sent",
      sameSchool,
      closeGradYear,
      seniorRole: seniority === "vp" || seniority === "director" || seniority === "md",
    });
  }

  return out;
}

