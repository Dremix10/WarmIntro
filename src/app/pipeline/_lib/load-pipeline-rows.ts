import { supabase } from "@/lib/supabase-browser";
import type { PipelineRow, FirmTier } from "./types";

type FirmJoin = { id: string; name: string; tier: FirmTier | null } | null;
type BankerJoin = {
  id: string;
  name: string;
  title: string | null;
  university: string | null;
  linkedin_url: string | null;
  email: string | null;
  firms: FirmJoin;
};
type ConnRow = {
  id: string;
  banker_id: string | null;
  stage: string;
  updated_at: string;
  warmth: number | null;
  bankers: BankerJoin | null;
};
type DraftRow = {
  id: string;
  banker_id: string | null;
  updated_at: string;
  bankers: BankerJoin | null;
};

const CONNECTION_SELECT =
  "id, banker_id, stage, updated_at, warmth, bankers(id, name, title, university, linkedin_url, email, firms(id, name, tier))";
const DRAFT_SELECT =
  "id, banker_id, updated_at, bankers(id, name, title, university, linkedin_url, email, firms(id, name, tier))";

export async function loadPipelineRows(userId: string): Promise<PipelineRow[]> {
  const [connectionsRes, draftsRes] = await Promise.all([
    supabase.from("connections").select(CONNECTION_SELECT).eq("user_id", userId),
    supabase
      .from("drafts")
      .select(DRAFT_SELECT)
      .eq("user_id", userId)
      .is("sent_at", null)
      .in("status", ["pending_critic", "needs_revision", "approved"]),
  ]);

  const errors = [
    formatSupabaseError("connections", connectionsRes.error),
    formatSupabaseError("drafts", draftsRes.error),
  ].filter(Boolean);
  if (errors.length > 0) throw new Error(errors.join("; "));

  return mergeRows(
    (connectionsRes.data ?? []) as unknown as ConnRow[],
    (draftsRes.data ?? []) as unknown as DraftRow[],
  );
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

function mergeRows(connections: ConnRow[], drafts: DraftRow[]): PipelineRow[] {
  const seen = new Set<string>();
  const out: PipelineRow[] = [];

  for (const connection of connections) {
    const banker = connection.bankers;
    if (!banker || seen.has(banker.id)) continue;
    seen.add(banker.id);
    out.push({
      id: connection.id,
      bankerId: banker.id,
      name: banker.name,
      title: banker.title,
      firmId: banker.firms?.id ?? null,
      firmName: banker.firms?.name ?? null,
      firmTier: banker.firms?.tier ?? null,
      university: banker.university,
      linkedinUrl: banker.linkedin_url,
      email: banker.email,
      warmth: connection.warmth ?? null,
      stage: connection.stage as PipelineRow["stage"],
      updatedAt: connection.updated_at,
    });
  }

  for (const draft of drafts) {
    const banker = draft.bankers;
    if (!banker || seen.has(banker.id)) continue;
    seen.add(banker.id);
    out.push({
      id: draft.id,
      bankerId: banker.id,
      name: banker.name,
      title: banker.title,
      firmId: banker.firms?.id ?? null,
      firmName: banker.firms?.name ?? null,
      firmTier: banker.firms?.tier ?? null,
      university: banker.university,
      linkedinUrl: banker.linkedin_url,
      email: banker.email,
      warmth: null,
      stage: "draft",
      updatedAt: draft.updated_at,
    });
  }

  return out;
}
