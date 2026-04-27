"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";
import { SkeletonPage } from "@/components/Skeleton";

// Real-data CRM kanban. Reads from Supabase `connections` (live data) and
// groups by IB pipeline stage. Replaces the legacy WarmIntro CRM that read
// from in-memory React Context (which never got wired to the IB schema).
// The legacy "Connect Gmail" card was removed — Gmail status lives on /today.

type Stage = "draft" | "sent" | "replied" | "coffee" | "referral" | "first_round" | "superday" | "offer" | "closed_lost";

interface CrmRow {
  id: string;
  bankerId: string;
  name: string;
  title: string | null;
  firmName: string | null;
  university: string | null;
  stage: Stage;
  updatedAt: string;
}

const STAGE_ORDER: Stage[] = ["draft", "sent", "replied", "coffee", "referral", "first_round", "superday", "offer"];

const STAGE_LABEL: Record<Stage, string> = {
  draft: "Draft prepared",
  sent: "Email sent",
  replied: "Replied",
  coffee: "Coffee",
  referral: "Referral",
  first_round: "First round",
  superday: "Superday",
  offer: "Offer",
  closed_lost: "Closed",
};

const STAGE_COLOR: Record<Stage, string> = {
  draft: "bg-[#EAE3D2] text-[#14182A]/70",
  sent: "bg-[#2E5A88]/15 text-[#2E5A88]",
  replied: "bg-[#E8B339]/20 text-[#9A7110]",
  coffee: "bg-[#E8B339]/30 text-[#9A7110]",
  referral: "bg-[#C86B4F]/20 text-[#C86B4F]",
  first_round: "bg-[#C86B4F]/30 text-[#C86B4F]",
  superday: "bg-[#C86B4F]/40 text-[#C86B4F]",
  offer: "bg-[#1B3B5F] text-white",
  closed_lost: "bg-[#5C6472]/20 text-[#5C6472]",
};

export default function CrmPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [rows, setRows] = useState<CrmRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !session) { router.push("/login"); return; }
    if (session) load();
  }, [authLoading, session?.user?.id]);

  async function load() {
    if (!session) return;
    setLoading(true);
    const { data: conns } = await supabase
      .from("connections")
      .select("id, banker_id, stage, updated_at, bankers(id, name, title, university, firms(name))")
      .eq("user_id", session.user.id);

    const { data: drafts } = await supabase
      .from("drafts")
      .select("id, banker_id, updated_at, bankers(id, name, title, university, firms(name))")
      .eq("user_id", session.user.id)
      .is("sent_at", null)
      .in("status", ["pending_critic", "needs_revision", "approved"]);

    type ConnRow = { id: string; banker_id: string; stage: string; updated_at: string; bankers: { id: string; name: string; title: string | null; university: string | null; firms: { name: string } | null } | null };
    type DraftRow = { id: string; banker_id: string; updated_at: string; bankers: { id: string; name: string; title: string | null; university: string | null; firms: { name: string } | null } | null };

    const seen = new Set<string>();
    const out: CrmRow[] = [];

    for (const c of (conns ?? []) as unknown as ConnRow[]) {
      if (!c.bankers || seen.has(c.bankers.id)) continue;
      seen.add(c.bankers.id);
      out.push({
        id: c.id,
        bankerId: c.bankers.id,
        name: c.bankers.name,
        title: c.bankers.title,
        firmName: c.bankers.firms?.name ?? null,
        university: c.bankers.university,
        stage: (c.stage as Stage) ?? "sent",
        updatedAt: c.updated_at,
      });
    }
    for (const d of (drafts ?? []) as unknown as DraftRow[]) {
      if (!d.bankers || seen.has(d.bankers.id)) continue;
      seen.add(d.bankers.id);
      out.push({
        id: d.id,
        bankerId: d.bankers.id,
        name: d.bankers.name,
        title: d.bankers.title,
        firmName: d.bankers.firms?.name ?? null,
        university: d.bankers.university,
        stage: "draft",
        updatedAt: d.updated_at,
      });
    }
    setRows(out);
    setLoading(false);
  }

  if (authLoading || loading) return <SkeletonPage />;

  const byStage = new Map<Stage, CrmRow[]>();
  for (const stage of STAGE_ORDER) byStage.set(stage, []);
  for (const r of rows) {
    if (!byStage.has(r.stage)) byStage.set(r.stage, []);
    byStage.get(r.stage)!.push(r);
  }

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] fade-in">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-1">CRM</p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl mb-2">Pipeline kanban</h1>
        <p className="text-sm text-[#14182A]/70 italic font-[family-name:var(--font-fraunces)] mb-8">
          Every banker grouped by where you are with them. Updates as Alma drafts, sends, and watches for replies.
        </p>

        {rows.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 border border-[#D9CFB5] text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">No pipeline yet.</p>
            <p className="text-sm text-[#14182A]/70 mb-5">
              Run Alma from <a href="/today" className="underline text-[#2E5A88]">Today</a> to draft your first outreach. Bankers move across these columns as you progress.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 pb-4">
            <div className="flex gap-3 min-w-max">
              {STAGE_ORDER.map((stage) => {
                const items = byStage.get(stage) ?? [];
                return (
                  <div key={stage} className="w-64 shrink-0">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${STAGE_COLOR[stage]}`}>
                        {STAGE_LABEL[stage]}
                      </span>
                      <span className="text-xs text-[#14182A]/50">{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.length === 0 ? (
                        <div className="rounded-xl bg-white/40 border border-dashed border-[#D9CFB5] p-3 text-center">
                          <p className="text-[10px] text-[#14182A]/40 italic">empty</p>
                        </div>
                      ) : (
                        items.map((r) => (
                          <div key={r.id} className="rounded-xl bg-white border border-[#D9CFB5] p-3">
                            <p className="text-sm font-medium leading-tight">{r.name}</p>
                            <p className="text-[11px] text-[#14182A]/60 mt-0.5">
                              {r.title ?? ""}{r.firmName ? ` · ${r.firmName}` : ""}
                            </p>
                            {r.university && (
                              <p className="text-[10px] text-[#14182A]/40 mt-1">{r.university}</p>
                            )}
                            <p className="text-[10px] text-[#14182A]/40 mt-2">
                              {new Date(r.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
