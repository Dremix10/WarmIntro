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
  linkedinUrl: string | null;
  email: string | null;
  stage: Stage;
  updatedAt: string;
}

const NEXT_ACTION: Record<Stage, string> = {
  draft: "Open in /today and approve to send.",
  sent: "Wait ~5 days. If no reply, queue a follow-up.",
  replied: "Reply within 24h. Suggest a 15-min coffee.",
  coffee: "Send a thank-you within 24h of the call.",
  referral: "Apply through their submission link. Mention them in the cover.",
  first_round: "Prep behaviorals + technicals. Thank them after.",
  superday: "Brief thank-you to each interviewer same day.",
  offer: "Negotiate. Don't accept the first number.",
  closed_lost: "Park for now. Revisit in a quarter.",
};

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
  const [activeBankerId, setActiveBankerId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) { router.push("/login"); return; }
    if (session) load();
  }, [authLoading, session?.user?.id]);

  async function load() {
    if (!session) return;
    setLoading(true);
    const { data: conns } = await supabase
      .from("connections")
      .select("id, banker_id, stage, updated_at, bankers(id, name, title, university, linkedin_url, email, firms(name))")
      .eq("user_id", session.user.id);

    const { data: drafts } = await supabase
      .from("drafts")
      .select("id, banker_id, updated_at, bankers(id, name, title, university, linkedin_url, email, firms(name))")
      .eq("user_id", session.user.id)
      .is("sent_at", null)
      .in("status", ["pending_critic", "needs_revision", "approved"]);

    type BankerJoin = { id: string; name: string; title: string | null; university: string | null; linkedin_url: string | null; email: string | null; firms: { name: string } | null };
    type ConnRow = { id: string; banker_id: string; stage: string; updated_at: string; bankers: BankerJoin | null };
    type DraftRow = { id: string; banker_id: string; updated_at: string; bankers: BankerJoin | null };

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
        linkedinUrl: c.bankers.linkedin_url,
        email: c.bankers.email,
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
        linkedinUrl: d.bankers.linkedin_url,
        email: d.bankers.email,
        stage: "draft",
        updatedAt: d.updated_at,
      });
    }
    setRows(out);
    setLoading(false);
  }

  if (authLoading || loading) return <SkeletonPage />;

  // Group + sort each column by most-recent activity. The user wanted to see
  // "what's heating up" without having to scan every card.
  const byStage = new Map<Stage, CrmRow[]>();
  for (const stage of STAGE_ORDER) byStage.set(stage, []);
  for (const r of rows) {
    if (!byStage.has(r.stage)) byStage.set(r.stage, []);
    byStage.get(r.stage)!.push(r);
  }
  for (const arr of byStage.values()) {
    arr.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }

  // Summary stats up top — quick read on where the pipeline stands.
  const stats = {
    total: rows.length,
    drafts: byStage.get("draft")?.length ?? 0,
    sent: byStage.get("sent")?.length ?? 0,
    replied: byStage.get("replied")?.length ?? 0,
    coffees: byStage.get("coffee")?.length ?? 0,
    referrals: byStage.get("referral")?.length ?? 0,
    interviews: (byStage.get("first_round")?.length ?? 0) + (byStage.get("superday")?.length ?? 0),
  };
  const replyRate = stats.sent > 0 ? Math.round(((stats.replied + stats.coffees + stats.referrals + stats.interviews) / (stats.sent + stats.replied + stats.coffees + stats.referrals + stats.interviews)) * 100) : 0;

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
          <>
            {/* Summary strip — at-a-glance funnel state */}
            <div className="mb-6 rounded-2xl bg-white p-5 border border-[#D9CFB5]">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                <Stat label="Total bankers" value={stats.total} />
                <Stat label="In review" value={stats.drafts} muted />
                <Stat label="Sent" value={stats.sent} />
                <Stat label="Replied" value={stats.replied} accent />
                <Stat label="Coffees + referrals" value={stats.coffees + stats.referrals} accent />
                <Stat label="Reply rate" value={`${replyRate}%`} muted />
              </div>
            </div>
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
                          <CrmCard key={r.id} row={r} onAdvanced={load} onOpen={() => setActiveBankerId(r.bankerId)} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </>
        )}
      </div>

      {activeBankerId && (
        <BankerDetailPanel
          bankerId={activeBankerId}
          row={rows.find((r) => r.bankerId === activeBankerId) ?? null}
          onClose={() => setActiveBankerId(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, accent, muted }: { label: string; value: number | string; accent?: boolean; muted?: boolean }) {
  return (
    <div>
      <p className={`font-[family-name:var(--font-fraunces)] text-2xl tabular-nums ${
        accent ? "text-[#2E5A88]" : muted ? "text-[#14182A]/50" : "text-[#14182A]"
      }`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-[#14182A]/50 mt-0.5">{label}</p>
    </div>
  );
}

function CrmCard({ row, onAdvanced, onOpen }: { row: CrmRow; onAdvanced: () => Promise<void> | void; onOpen: () => void }) {
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
    <div className="rounded-xl bg-white border border-[#D9CFB5] p-3 group hover:border-[#2E5A88] transition-colors">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left"
        title="Click to view details"
      >
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
      </button>

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

interface DraftHistoryRow { id: string; subject: string | null; body: string; status: string; sent_at: string | null; created_at: string; type: string }
interface SignalHistoryRow { signal_type: string; metadata: Record<string, unknown>; occurred_at: string }

function BankerDetailPanel({ bankerId, row, onClose }: { bankerId: string; row: CrmRow | null; onClose: () => void }) {
  const [drafts, setDrafts] = useState<DraftHistoryRow[]>([]);
  const [signals, setSignals] = useState<SignalHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { session: s } } = await supabase.auth.getSession();
      const userId = s?.user.id;
      if (!userId) { setLoading(false); return; }

      const [draftsRes, signalsRes] = await Promise.all([
        supabase
          .from("drafts")
          .select("id, subject, body, status, sent_at, created_at, type")
          .eq("user_id", userId)
          .eq("banker_id", bankerId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("signals")
          .select("signal_type, metadata, occurred_at")
          .eq("user_id", userId)
          .eq("banker_id", bankerId)
          .order("occurred_at", { ascending: false })
          .limit(20),
      ]);

      if (cancelled) return;
      setDrafts((draftsRes.data ?? []) as unknown as DraftHistoryRow[]);
      setSignals((signalsRes.data ?? []) as unknown as SignalHistoryRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [bankerId]);

  if (!row) return null;
  const stage = row.stage;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-[#14182A]/40 backdrop-blur-sm" />
      <aside
        className="w-full sm:w-[480px] bg-white border-l border-[#D9CFB5] shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-[#D9CFB5] px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div>
            <span className={`text-[10px] uppercase tracking-wider font-semibold rounded-full px-2 py-0.5 ${STAGE_COLOR[stage]}`}>
              {STAGE_LABEL[stage]}
            </span>
            <h3 className="font-[family-name:var(--font-fraunces)] text-2xl mt-2">{row.name}</h3>
            <p className="text-sm text-[#14182A]/60">{row.title}{row.firmName ? ` · ${row.firmName}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[#14182A]/40 hover:text-[#14182A] text-2xl leading-none -mt-1">×</button>
        </div>

        <div className="px-6 py-5 space-y-5 text-sm">
          {/* Suggested next action */}
          <div className="rounded-xl bg-[#2E5A88]/5 border border-[#2E5A88]/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#2E5A88] font-semibold mb-1">Next move</p>
            <p className="text-[#14182A]">{NEXT_ACTION[stage]}</p>
          </div>

          {/* Contact details */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#14182A]/50 font-semibold mb-2">Contact</p>
            <div className="space-y-1 text-xs">
              {row.email && (
                <p><span className="text-[#14182A]/50">Email:</span> <code className="font-mono">{row.email}</code></p>
              )}
              {row.linkedinUrl && (
                <p><span className="text-[#14182A]/50">LinkedIn:</span> <a href={row.linkedinUrl} target="_blank" rel="noreferrer" className="underline text-[#2E5A88] hover:text-[#1B3B5F]">view profile ↗</a></p>
              )}
              {row.university && (
                <p><span className="text-[#14182A]/50">School:</span> {row.university}</p>
              )}
            </div>
          </div>

          {/* Drafts + sent emails */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#14182A]/50 font-semibold mb-2">Conversation</p>
            {loading ? (
              <p className="text-xs text-[#14182A]/50 italic">Loading…</p>
            ) : drafts.length === 0 && signals.length === 0 ? (
              <p className="text-xs text-[#14182A]/50 italic">No drafts or events yet.</p>
            ) : (
              <div className="space-y-3">
                {drafts.map((d) => (
                  <div key={d.id} className={`rounded-lg border p-3 ${d.sent_at ? "bg-[#2E5A88]/5 border-[#2E5A88]/20" : "bg-[#EAE3D2]/40 border-[#D9CFB5]"}`}>
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-[#14182A]/60">
                        {d.sent_at ? `Sent ${new Date(d.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : `${d.status.replace("_", " ")} · ${d.type}`}
                      </p>
                      <p className="text-[10px] text-[#14182A]/40">{new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    </div>
                    {d.subject && <p className="text-sm italic font-[family-name:var(--font-fraunces)] text-[#14182A]/80 mb-1">{d.subject}</p>}
                    <details className="text-xs text-[#14182A]/70">
                      <summary className="cursor-pointer hover:underline">view body</summary>
                      <pre className="mt-2 whitespace-pre-wrap font-[family-name:var(--font-geist-sans)] text-[#14182A]/80">{d.body}</pre>
                    </details>
                  </div>
                ))}
                {signals.length > 0 && (
                  <div className="pt-2 border-t border-[#D9CFB5]">
                    <p className="text-[10px] uppercase tracking-wider text-[#14182A]/40 mb-1">Activity log</p>
                    <ul className="space-y-1 text-xs text-[#14182A]/60">
                      {signals.map((s, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span>{s.signal_type.replace(/_/g, " ")}</span>
                          <span className="text-[#14182A]/35">{new Date(s.occurred_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
