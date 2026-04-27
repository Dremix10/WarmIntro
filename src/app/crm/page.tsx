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
// Stages a user can manually advance/regress to. Excludes "draft" (managed by
// the Planner / mark_sent flow) and "closed_lost" (handled separately).
const ADVANCEABLE: Stage[] = ["sent", "replied", "coffee", "referral", "first_round", "superday", "offer"];

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
                          <CrmCard key={r.id} row={r} onAdvanced={load} />
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

function CrmCard({ row, onAdvanced }: { row: CrmRow; onAdvanced: () => Promise<void> | void }) {
  const [busy, setBusy] = useState(false);
  const [showLost, setShowLost] = useState(false);

  // Determine next/prev stage for the advance buttons. Draft → sent is handled
  // via the "I sent it" button on /today, not here.
  const idx = ADVANCEABLE.indexOf(row.stage as Stage);
  const next: Stage | null = idx >= 0 && idx < ADVANCEABLE.length - 1 ? ADVANCEABLE[idx + 1] : null;
  const prev: Stage | null = idx > 0 ? ADVANCEABLE[idx - 1] : null;

  async function moveTo(stage: Stage) {
    if (row.stage === "draft") return; // can't advance a draft from here
    setBusy(true);
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      await fetch(`/api/connections/${row.id}/stage`, {
        method: "POST",
        headers: { Authorization: `Bearer ${s?.access_token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      await onAdvanced();
    } finally {
      setBusy(false);
    }
  }

  const isDraft = row.stage === "draft";

  return (
    <div className="rounded-xl bg-white border border-[#D9CFB5] p-3 group">
      <p className="text-sm font-medium leading-tight">{row.name}</p>
      <p className="text-[11px] text-[#14182A]/60 mt-0.5">
        {row.title ?? ""}{row.firmName ? ` · ${row.firmName}` : ""}
      </p>
      {row.university && (
        <p className="text-[10px] text-[#14182A]/40 mt-1">{row.university}</p>
      )}
      <p className="text-[10px] text-[#14182A]/40 mt-2">
        {new Date(row.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </p>

      {/* Stage controls — visible on hover or always on mobile */}
      {isDraft ? (
        <div className="mt-2 pt-2 border-t border-[#EAE3D2]">
          <a href="/today" className="text-[10px] text-[#2E5A88] hover:underline">Open in queue →</a>
        </div>
      ) : (
        <div className="mt-2 pt-2 border-t border-[#EAE3D2] flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => prev && moveTo(prev)}
            disabled={!prev || busy}
            title={prev ? `Move back to ${STAGE_LABEL[prev]}` : "Already at first stage"}
            className="text-[10px] text-[#14182A]/40 hover:text-[#14182A]/80 disabled:opacity-30"
          >
            ← back
          </button>
          {next && (
            <button
              type="button"
              onClick={() => moveTo(next)}
              disabled={busy}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[#1B3B5F] text-white hover:bg-[#2E5A88] transition-colors disabled:opacity-50"
            >
              → {STAGE_LABEL[next]}
            </button>
          )}
          {!next && (
            <span className="text-[10px] text-[#1B3B5F] font-semibold">offer ✓</span>
          )}
          <button
            type="button"
            onClick={() => setShowLost(true)}
            className="text-[10px] text-[#14182A]/30 hover:text-[#C86B4F]"
            title="Mark closed (no fit, ghosted, etc.)"
          >
            ×
          </button>
        </div>
      )}

      {showLost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#14182A]/40 backdrop-blur-sm"
          onClick={() => setShowLost(false)}
        >
          <div
            className="bg-white rounded-2xl border border-[#D9CFB5] max-w-sm w-full p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.18em] text-[#C86B4F] font-semibold mb-1">Confirm</p>
            <h3 className="font-[family-name:var(--font-fraunces)] text-xl mb-2">Close this thread?</h3>
            <p className="text-sm text-[#14182A]/70 mb-4">
              Move <strong>{row.name}</strong> out of your active pipeline (ghosted, no fit, declined). You can revisit later.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowLost(false)} className="rounded-lg border border-[#D9CFB5] px-3 py-1.5 text-xs hover:bg-[#EAE3D2]">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  setShowLost(false);
                  moveTo("closed_lost");
                }}
                className="rounded-lg bg-[#C86B4F] text-white px-3 py-1.5 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
