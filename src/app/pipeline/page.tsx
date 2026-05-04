"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";
import { SkeletonPage } from "@/components/Skeleton";

// Transit-map view of the IB pipeline. Each firm is a colored line, each stage
// is a station, every banker sits at the station that matches their current
// stage. Replaces the older kanban layout — same Supabase reads (`connections`
// + `drafts`), same optimistic stage moves, same banker detail panel.

type Stage =
  | "draft"
  | "sent"
  | "replied"
  | "coffee"
  | "referral"
  | "first_round"
  | "superday"
  | "offer"
  | "closed_lost";

interface CrmRow {
  id: string;
  bankerId: string;
  name: string;
  title: string | null;
  firmId: string | null;
  firmName: string | null;
  firmTier: "bulge_bracket" | "elite_boutique" | "middle_market" | null;
  university: string | null;
  linkedinUrl: string | null;
  email: string | null;
  warmth: number | null;
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

// Stations along the line, left-to-right. Excludes draft (handled in /today)
// and closed_lost (filtered out of the visual map).
const STATIONS: { stage: Exclude<Stage, "draft" | "closed_lost">; label: string; sub: string }[] = [
  { stage: "sent", label: "Sent", sub: "draft → out" },
  { stage: "replied", label: "Replied", sub: "+1 reply" },
  { stage: "coffee", label: "Coffee", sub: "scheduled" },
  { stage: "referral", label: "Referral", sub: "warm intro" },
  { stage: "first_round", label: "1st Round", sub: "interview" },
  { stage: "superday", label: "Superday", sub: "final" },
  { stage: "offer", label: "Offer", sub: "won" },
];

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

// Stages a user can manually advance/regress to.
const ADVANCEABLE: Stage[] = ["sent", "replied", "coffee", "referral", "first_round", "superday", "offer"];

// Color palette for firm lines. Cycles through these in firm-order so each
// firm always renders the same color in the same session.
const FIRM_LINE_COLORS = ["#1B3B5F", "#2E5A88", "#7B1F2C", "#C86B4F", "#5A3D5C", "#2D6E6A", "#E8B339"];

interface ToastMsg { id: number; message: string; kind: "error" | "info" }

export default function CrmPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [rows, setRows] = useState<CrmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBankerId, setActiveBankerId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<"all" | "bulge_bracket" | "elite_boutique" | "middle_market">("all");
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    if (!authLoading && !session) { router.push("/login"); return; }
    if (session) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id]);

  function pushToast(message: string, kind: ToastMsg["kind"] = "error") {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, message, kind }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 4000);
  }

  // Optimistic stage move: update local state instantly, fire the request in
  // the background, revert + toast on failure.
  async function moveStage(rowId: string, newStage: Stage) {
    const target = rows.find((r) => r.id === rowId);
    if (!target || target.stage === "draft") return;
    const prevStage = target.stage;
    const nowIso = new Date().toISOString();

    setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, stage: newStage, updatedAt: nowIso } : r)));

    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await fetch(`/api/connections/${rowId}/stage`, {
        method: "POST",
        headers: { Authorization: `Bearer ${s?.access_token ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
    } catch (err) {
      setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, stage: prevStage } : r)));
      pushToast(`Couldn't move ${target.name}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  async function load() {
    if (!session) return;
    setLoading(true);
    const { data: conns } = await supabase
      .from("connections")
      .select("id, banker_id, stage, updated_at, bankers(id, name, title, university, linkedin_url, email, warmth_score, firms(id, name, tier))")
      .eq("user_id", session.user.id);

    const { data: drafts } = await supabase
      .from("drafts")
      .select("id, banker_id, updated_at, bankers(id, name, title, university, linkedin_url, email, warmth_score, firms(id, name, tier))")
      .eq("user_id", session.user.id)
      .is("sent_at", null)
      .in("status", ["pending_critic", "needs_revision", "approved"]);

    type FirmJoin = { id: string; name: string; tier: CrmRow["firmTier"] } | null;
    type BankerJoin = {
      id: string; name: string; title: string | null;
      university: string | null; linkedin_url: string | null; email: string | null;
      warmth_score: number | null; firms: FirmJoin;
    };
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
        firmId: c.bankers.firms?.id ?? null,
        firmName: c.bankers.firms?.name ?? null,
        firmTier: c.bankers.firms?.tier ?? null,
        university: c.bankers.university,
        linkedinUrl: c.bankers.linkedin_url,
        email: c.bankers.email,
        warmth: c.bankers.warmth_score,
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
        firmId: d.bankers.firms?.id ?? null,
        firmName: d.bankers.firms?.name ?? null,
        firmTier: d.bankers.firms?.tier ?? null,
        university: d.bankers.university,
        linkedinUrl: d.bankers.linkedin_url,
        email: d.bankers.email,
        warmth: d.bankers.warmth_score,
        stage: "draft",
        updatedAt: d.updated_at,
      });
    }
    setRows(out);
    setLoading(false);
  }

  // Group rows by firm + stage. Each firm becomes a row on the map; each
  // station-cell holds 0..N bankers in that firm at that stage.
  const { firms, stationsByFirm, attentionCount } = useMemo(() => {
    const filtered = rows.filter((r) => {
      if (r.stage === "draft" || r.stage === "closed_lost") return false;
      if (tierFilter !== "all" && r.firmTier !== tierFilter) return false;
      return r.firmId !== null;
    });

    const firmMap = new Map<string, { id: string; name: string; tier: CrmRow["firmTier"]; color: string }>();
    let colorIdx = 0;
    for (const r of filtered) {
      if (!r.firmId) continue;
      if (!firmMap.has(r.firmId)) {
        firmMap.set(r.firmId, {
          id: r.firmId,
          name: r.firmName ?? "Unknown firm",
          tier: r.firmTier,
          color: FIRM_LINE_COLORS[colorIdx % FIRM_LINE_COLORS.length],
        });
        colorIdx++;
      }
    }

    // For each firm and each station, the list of bankers there sorted by priority desc.
    const grid = new Map<string, Map<string, CrmRow[]>>();
    for (const firm of firmMap.values()) {
      const stationMap = new Map<string, CrmRow[]>();
      for (const st of STATIONS) stationMap.set(st.stage, []);
      grid.set(firm.id, stationMap);
    }
    for (const r of filtered) {
      if (!r.firmId) continue;
      const stationMap = grid.get(r.firmId);
      if (!stationMap) continue;
      const bucket = stationMap.get(r.stage);
      if (bucket) bucket.push(r);
    }
    for (const stationMap of grid.values()) {
      for (const bucket of stationMap.values()) {
        bucket.sort((a, b) => priorityScore(b) - priorityScore(a));
      }
    }

    // Attention count for the strip at the top.
    let attention = 0;
    for (const r of filtered) {
      if (statusFor(r) !== null) attention++;
    }

    return {
      firms: Array.from(firmMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      stationsByFirm: grid,
      attentionCount: attention,
    };
  }, [rows, tierFilter]);

  if (authLoading || loading) return <SkeletonPage />;

  const totalActive = rows.filter((r) => r.stage !== "draft" && r.stage !== "closed_lost").length;

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] fade-in">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-1">Pipeline</p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl mb-2">Every banker, every stage.</h1>
        <p className="text-sm text-[#14182A]/70 italic font-[family-name:var(--font-fraunces)] mb-7">
          Each line is a firm. Each station is a stage. Click any banker to act on them.
        </p>

        {totalActive === 0 ? (
          <div className="rounded-2xl bg-white p-10 border border-[#D9CFB5] text-center">
            <p className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">No pipeline yet.</p>
            <p className="text-sm text-[#14182A]/70 mb-5">
              Run Alma from <a href="/today" className="underline text-[#2E5A88]">Today</a> to draft your first outreach. Bankers appear on the map as soon as they&apos;re sent.
            </p>
          </div>
        ) : (
          <>
            {/* Toolbar — tier filter + counts + status legend.
                On mobile, legend dots are icon-only (labels appear under sm:). */}
            <div className="mb-3 rounded-xl border border-[#D9CFB5] bg-white px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-5 sm:gap-y-3">
                <div className="flex items-center gap-1.5">
                  {(["all", "bulge_bracket", "elite_boutique", "middle_market"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTierFilter(t)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        tierFilter === t
                          ? "bg-[#1B3B5F] text-white border-[#1B3B5F]"
                          : "bg-white text-[#5C6472] border-[#D9CFB5] hover:border-[#2E5A88] hover:text-[#1B3B5F]"
                      }`}
                    >
                      {t === "all" ? "All" : t === "bulge_bracket" ? "BB" : t === "elite_boutique" ? "EB" : "MM"}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-[#8A8674]">
                  {firms.length} firm{firms.length === 1 ? "" : "s"} · {totalActive} banker{totalActive === 1 ? "" : "s"}
                </span>
                <div className="ml-auto flex items-center gap-3 text-[11px] text-[#5C6472] sm:gap-5">
                  <span className="inline-flex items-center min-w-0 sm:min-w-[120px]">
                    <span
                      className="inline-block h-[10px] w-[10px] shrink-0 rounded-full mr-2"
                      style={{ backgroundColor: "#2E5A88", boxShadow: "0 0 0 2px white inset, 0 0 0 3px #2E5A88" }}
                    />
                    <span className="hidden sm:inline">Fresh activity</span>
                  </span>
                  <span className="inline-flex items-center min-w-0 sm:min-w-[120px]">
                    <span
                      className="inline-block h-[10px] w-[10px] shrink-0 rounded-full mr-2"
                      style={{ backgroundColor: "#E8B339", boxShadow: "0 0 0 2px white inset, 0 0 0 3px #E8B339" }}
                    />
                    <span className="hidden sm:inline">Action due</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Attention strip — only shown if there are bankers needing action */}
            {attentionCount > 0 && (
              <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-[#FCD34D]/55 bg-[#E8B339]/12 px-3.5 py-2.5 text-[12px] text-[#14182A]">
                <span className="rounded-full bg-[#E8B339] px-2 py-[1px] text-[10px] font-bold uppercase tracking-[0.06em] text-[#14182A]">Today</span>
                <span>
                  <strong className="font-semibold">{attentionCount}</strong>{" "}
                  banker{attentionCount === 1 ? "" : "s"} on the map need attention. Click any pulsing marker.
                </span>
              </div>
            )}

            {/* MOBILE: per-firm vertical accordion. Each firm collapses to a
                row showing name + tier + highest stage pill + banker count.
                Tap to expand to a vertical list of bankers. Same banker click
                opens the same detail panel as the transit map. */}
            <div className="md:hidden space-y-2">
              {firms.map((firm) => {
                const stationMap = stationsByFirm.get(firm.id);
                if (!stationMap) return null;
                const allBankers: typeof rows = [];
                for (const st of STATIONS) {
                  const list = stationMap.get(st.stage) ?? [];
                  allBankers.push(...list);
                }
                if (allBankers.length === 0) return null;
                return (
                  <FirmAccordion
                    key={firm.id}
                    firmName={firm.name}
                    firmTier={firm.tier === "bulge_bracket" ? "BB" : firm.tier === "elite_boutique" ? "EB" : "MM"}
                    firmColor={firm.color}
                    bankers={allBankers}
                    onOpenBanker={(id) => setActiveBankerId(id)}
                  />
                );
              })}
            </div>

            {/* DESKTOP: full transit map. Hidden under md because its 900px
                min-width can't be honestly compressed for portrait. */}
            <div className="hidden md:block relative overflow-x-auto rounded-2xl border border-[#D9CFB5] bg-gradient-to-b from-[#FCFAF5] to-[#F4EDDB] p-4 sm:p-6 pt-16 sm:pt-20">
              {/* Stage labels along the top */}
              <div
                className="grid items-baseline pb-3 mb-2"
                style={{ gridTemplateColumns: `140px repeat(${STATIONS.length}, minmax(0, 1fr))`, minWidth: "900px" }}
              >
                <div />
                {STATIONS.map((st) => (
                  <div key={st.stage} className="text-center relative pb-2">
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5C6472]">{st.label}</div>
                    <div className="text-[9px] font-mono text-[#8A8674] mt-[2px]">{st.sub}</div>
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-[9px] bg-[#D9CFB5]" aria-hidden />
                  </div>
                ))}
              </div>

              {/* Firm rows */}
              <div className="space-y-1.5">
                {firms.map((firm) => {
                  const stationMap = stationsByFirm.get(firm.id);
                  if (!stationMap) return null;
                  return (
                    <div
                      key={firm.id}
                      className="relative grid items-center"
                      style={{ gridTemplateColumns: `140px repeat(${STATIONS.length}, minmax(0, 1fr))`, height: "80px", minWidth: "900px", color: firm.color }}
                    >
                      {/* Firm label */}
                      <div className="pr-4 text-right">
                        <div className="font-[family-name:var(--font-fraunces)] text-[14px] font-semibold leading-tight text-[#14182A]">
                          {firm.name}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A8674] mt-[2px]">
                          {firm.tier === "bulge_bracket" ? "BB" : firm.tier === "elite_boutique" ? "EB" : "MM"}
                        </div>
                      </div>

                      {/* Line — solid horizontal stroke spanning all stations */}
                      <svg
                        className="absolute pointer-events-none"
                        style={{ left: "140px", right: 0, top: 0, height: "80px" }}
                        preserveAspectRatio="none"
                        viewBox="0 0 100 80"
                      >
                        <path d="M 0 40 L 100 40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
                      </svg>

                      {/* Stations */}
                      {STATIONS.map((st) => {
                        const bankers = stationMap.get(st.stage) ?? [];
                        return (
                          <Station
                            key={st.stage}
                            firmColor={firm.color}
                            bankers={bankers}
                            onOpen={(id) => setActiveBankerId(id)}
                            activeBankerId={activeBankerId}
                          />
                        );
                      })}
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
          onMove={moveStage}
          onClose={() => setActiveBankerId(null)}
        />
      )}

      {/* Toast stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[60] space-y-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              role="alert"
              className={`rounded-xl border shadow-lg px-4 py-3 text-sm ${
                t.kind === "error"
                  ? "bg-white border-[#C86B4F]/40 text-[#14182A]"
                  : "bg-white border-[#D9CFB5] text-[#14182A]"
              }`}
            >
              <p className={`text-[10px] uppercase tracking-wider font-semibold mb-0.5 ${t.kind === "error" ? "text-[#C86B4F]" : "text-[#2E5A88]"}`}>
                {t.kind === "error" ? "Reverted" : "Heads up"}
              </p>
              <p>{t.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Priority score = warmth + stage_index*8 + activity boost. Higher = more
// important. Used to size markers and order stacks.
function priorityScore(r: CrmRow): number {
  const stageIdx = STATIONS.findIndex((s) => s.stage === r.stage);
  const stageBoost = stageIdx >= 0 ? stageIdx * 8 : 0;
  const status = statusFor(r);
  const activityBoost = status === "positive" ? 20 : status === "due" ? 15 : 0;
  return (r.warmth ?? 0) + stageBoost + activityBoost;
}

// Status: "positive" = recent reply / advance (last 3 days), "due" = sent
// long enough ago that a follow-up should fire (5+ days at sent stage).
function statusFor(r: CrmRow): "positive" | "due" | null {
  const ageDays = (Date.now() - new Date(r.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (r.stage === "sent" && ageDays >= 5) return "due";
  if (ageDays <= 3 && r.stage !== "sent" && r.stage !== "draft") return "positive";
  return null;
}

function priorityTier(r: CrmRow): "low" | "med" | "high" | "top" {
  const s = priorityScore(r);
  if (s >= 110) return "top";
  if (s >= 80) return "high";
  if (s >= 55) return "med";
  return "low";
}

function priorityDims(t: ReturnType<typeof priorityTier>): { size: number; font: number } {
  if (t === "top") return { size: 38, font: 16 };
  if (t === "high") return { size: 32, font: 14 };
  if (t === "med") return { size: 28, font: 12 };
  return { size: 22, font: 10 };
}

function initial(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center min-w-[120px]">
      <span
        className="inline-block w-[10px] h-[10px] rounded-full mr-2 shrink-0"
        style={{ backgroundColor: color, boxShadow: `0 0 0 2px white inset, 0 0 0 3px ${color}` }}
        aria-hidden
      />
      {label}
    </span>
  );
}

// ---- Station ----------------------------------------------------------------

function Station({
  firmColor,
  bankers,
  onOpen,
  activeBankerId,
}: {
  firmColor: string;
  bankers: CrmRow[];
  onOpen: (bankerId: string) => void;
  activeBankerId: string | null;
}) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const visible = bankers.slice(0, 4);
  const overflow = bankers.length - visible.length;

  return (
    <div className="relative h-full flex items-center justify-center">
      {/* Empty station tick */}
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[8px] h-[8px] rounded-full bg-white border-[2px] z-[1]"
        style={{ borderColor: firmColor }}
        aria-hidden
      />

      {bankers.length > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[3] flex flex-col-reverse items-center">
          {/* Bankers — bottom-up so column-reverse renders highest priority on top visually */}
          {visible.slice().reverse().map((r) => (
            <BankerMarker
              key={r.id}
              row={r}
              firmColor={firmColor}
              onClick={() => onOpen(r.bankerId)}
              isActive={r.bankerId === activeBankerId}
            />
          ))}
          {overflow > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOverflowOpen(true); }}
              className="-mb-[10px] mt-[2px] rounded-full bg-[#14182A] text-white border-2 border-[#F4EDDB] text-[11px] font-bold px-2.5 py-[3px] shadow-[0_4px_10px_-2px_rgba(20,24,42,0.32)] cursor-pointer transition-transform hover:scale-105"
              aria-label={`Show ${overflow} more`}
            >
              +{overflow}
            </button>
          )}
        </div>
      )}

      {overflowOpen && (
        <OverflowList
          firmColor={firmColor}
          bankers={bankers}
          onPick={(id) => { setOverflowOpen(false); onOpen(id); }}
          onClose={() => setOverflowOpen(false)}
        />
      )}
    </div>
  );
}

function BankerMarker({
  row,
  firmColor,
  onClick,
  isActive,
}: {
  row: CrmRow;
  firmColor: string;
  onClick: () => void;
  isActive: boolean;
}) {
  const tier = priorityTier(row);
  const { size, font } = priorityDims(tier);
  const status = statusFor(row);

  // Halo for status — pulses around marker.
  const haloAnimation =
    status === "positive"
      ? "alma-halo-positive 2.6s ease-in-out infinite"
      : status === "due"
        ? "alma-halo-due 2.6s ease-in-out infinite"
        : undefined;

  // Top-priority gets a soft static halo.
  const topHaloShadow =
    tier === "top"
      ? "0 0 0 3px #F4EDDB, 0 0 0 6px rgba(46,90,136,0.20), 0 8px 20px -4px rgba(20,24,42,0.32)"
      : "0 0 0 3px #F4EDDB, 0 4px 12px -2px rgba(20,24,42,0.18)";

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      data-status={status ?? undefined}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${font}px`,
        backgroundColor: firmColor,
        boxShadow: topHaloShadow,
        animation: haloAnimation,
        marginTop: "-10px",
        isolation: "isolate",
        zIndex: 2,
      }}
      className={`relative rounded-full text-white font-[family-name:var(--font-fraunces)] font-semibold flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${
        isActive ? "ring-2 ring-offset-2 ring-offset-[#F4EDDB] ring-[#1B3B5F]" : ""
      }`}
      title={`${row.name} · ${STAGE_LABEL[row.stage]} · warmth ${row.warmth ?? "—"}`}
    >
      {initial(row.name)}
    </button>
  );
}

// ---- Overflow list (when station has > 4 bankers) ---------------------------

function OverflowList({
  firmColor,
  bankers,
  onPick,
  onClose,
}: {
  firmColor: string;
  bankers: CrmRow[];
  onPick: (bankerId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-[#14182A]/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl border border-[#D9CFB5] max-w-md w-full p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[#5C6472] font-semibold">
            {bankers.length} bankers at this station
          </p>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[#14182A]/40 hover:text-[#14182A] text-xl leading-none">×</button>
        </div>
        <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
          {bankers.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r.bankerId)}
              className="w-full text-left rounded-lg border border-[#ECE7DE] bg-white hover:bg-[#EAE3D2]/40 hover:border-[#2E5A88] transition-colors px-3 py-2 flex items-center gap-3"
            >
              <span
                className="flex w-8 h-8 items-center justify-center rounded-full text-white font-[family-name:var(--font-fraunces)] font-semibold text-sm shrink-0"
                style={{ backgroundColor: firmColor }}
              >
                {initial(r.name)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-[#14182A] truncate">{r.name}</span>
                <span className="block text-[11px] text-[#8A8674] truncate">{r.title ?? "—"}</span>
              </span>
              <span className="text-[10px] font-mono text-[#8A8674] tabular-nums shrink-0">
                warmth {r.warmth ?? "—"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Banker detail panel (right slide-out) ----------------------------------

// ---- Mobile portrait accordion --------------------------------------------

const STAGE_LABEL_SHORT: Record<string, string> = {
  sent: "Sent",
  replied: "Replied",
  coffee: "Coffee",
  referral: "Referral",
  first_round: "1st Rd",
  superday: "Superday",
  offer: "Offer",
};

const STAGE_ROMAN_PI: Record<string, string> = {
  sent: "I", replied: "II", coffee: "III", referral: "IV",
  first_round: "V", superday: "VI", offer: "VII",
};

function FirmAccordion({
  firmName,
  firmTier,
  firmColor,
  bankers,
  onOpenBanker,
}: {
  firmName: string;
  firmTier: string;
  firmColor: string;
  bankers: CrmRow[];
  onOpenBanker: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  // Highest stage among the firm's bankers — drives the level pill colour.
  const highestStage = useMemo(() => {
    const order = ["sent", "replied", "coffee", "referral", "first_round", "superday", "offer"];
    let best = "sent";
    let bestIdx = 0;
    for (const b of bankers) {
      const i = order.indexOf(b.stage);
      if (i > bestIdx) { bestIdx = i; best = b.stage; }
    }
    return best;
  }, [bankers]);

  const highestRoman = STAGE_ROMAN_PI[highestStage] ?? "I";
  const highestName = STAGE_LABEL_SHORT[highestStage] ?? "Sent";
  const isHighStage = ["referral", "first_round", "superday", "offer"].includes(highestStage);
  const isGold = ["first_round", "superday", "offer"].includes(highestStage);

  const attentionCount = bankers.filter((b) => statusFor(b) !== null).length;

  // Sort bankers by stage descending then warmth descending — surface the
  // highest-priority bankers first inside the open list.
  const sortedBankers = useMemo(() => {
    const order = ["sent", "replied", "coffee", "referral", "first_round", "superday", "offer"];
    return [...bankers].sort((a, b) => {
      const ai = order.indexOf(a.stage);
      const bi = order.indexOf(b.stage);
      if (ai !== bi) return bi - ai;
      return priorityScore(b) - priorityScore(a);
    });
  }, [bankers]);

  return (
    <div className="rounded-2xl border border-[#D9CFB5] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <span
          className="h-[34px] w-1 shrink-0 rounded-full"
          style={{ backgroundColor: firmColor }}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-fraunces)] text-base font-semibold leading-tight text-[#14182A] truncate">
              {firmName}
            </span>
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A8674]">
              {firmTier}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-[#5C6472]">
            <strong className="text-[#14182A] font-semibold">{bankers.length}</strong>{" "}
            banker{bankers.length === 1 ? "" : "s"}
            {attentionCount > 0 && (
              <>
                {" · "}
                <span className="text-[#9A7110] font-semibold">{attentionCount} need attention</span>
              </>
            )}
          </div>
        </div>
        <span
          className="shrink-0 inline-flex items-baseline gap-1 rounded-full px-2.5 py-[3px] text-[10px] font-semibold"
          style={{
            backgroundColor: isGold ? "rgba(201, 162, 76, 0.15)" : isHighStage ? "rgba(232, 179, 57, 0.15)" : "rgba(46, 90, 136, 0.10)",
            border: `1px solid ${isGold ? "rgba(201, 162, 76, 0.45)" : isHighStage ? "rgba(232, 179, 57, 0.45)" : "rgba(46, 90, 136, 0.30)"}`,
            color: isGold ? "#8E6E14" : isHighStage ? "#92400E" : "#1B3B5F",
          }}
        >
          <span className="font-[family-name:var(--font-fraunces)] italic font-semibold">{highestRoman}</span>
          <span className="uppercase tracking-[0.06em] text-[9px]">{highestName}</span>
        </span>
        <span className="shrink-0 text-[#8A8674] text-sm" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <ul className="border-t border-[#ECE7DE] divide-y divide-[#ECE7DE]">
          {sortedBankers.map((b) => {
            const status = statusFor(b);
            const stageRoman = STAGE_ROMAN_PI[b.stage] ?? "—";
            const stageName = STAGE_LABEL_SHORT[b.stage] ?? b.stage;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onOpenBanker(b.bankerId)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#FBF7EC] transition-colors"
                >
                  <span
                    className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white font-[family-name:var(--font-fraunces)] font-semibold text-sm"
                    style={{ backgroundColor: firmColor }}
                  >
                    {initial(b.name)}
                    {status && (
                      <span
                        className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white"
                        style={{ backgroundColor: status === "positive" ? "#2E5A88" : "#E8B339" }}
                        aria-hidden
                      />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight text-[#14182A] truncate">{b.name}</p>
                    <p className="text-[11px] text-[#8A8674] truncate">{b.title ?? "—"}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-baseline gap-1 text-[10px]">
                    <span className="font-[family-name:var(--font-fraunces)] italic font-semibold text-[#1B3B5F]">{stageRoman}</span>
                    <span className="uppercase tracking-[0.06em] text-[9px] text-[#8A8674]">{stageName}</span>
                  </span>
                  <span className="shrink-0 text-[#8A8674] text-xs" aria-hidden>›</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface DraftHistoryRow { id: string; subject: string | null; body: string; status: string; sent_at: string | null; created_at: string; type: string }
interface SignalHistoryRow { signal_type: string; metadata: Record<string, unknown>; occurred_at: string }

function BankerDetailPanel({
  bankerId,
  row,
  onMove,
  onClose,
}: {
  bankerId: string;
  row: CrmRow | null;
  onMove: (rowId: string, stage: Stage) => void;
  onClose: () => void;
}) {
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
  const idx = ADVANCEABLE.indexOf(stage as Stage);
  const next: Stage | null = idx >= 0 && idx < ADVANCEABLE.length - 1 ? ADVANCEABLE[idx + 1] : null;
  const prev: Stage | null = idx > 0 ? ADVANCEABLE[idx - 1] : null;
  const isDraft = stage === "draft";

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

          {/* Stage controls */}
          {!isDraft && (
            <div className="rounded-xl bg-[#EAE3D2]/40 border border-[#D9CFB5] p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#14182A]/50 font-semibold mb-2">Stage</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => prev && onMove(row.id, prev)}
                  disabled={!prev}
                  className="text-[12px] text-[#14182A]/60 hover:text-[#14182A] disabled:opacity-30"
                  title={prev ? `Move back to ${STAGE_LABEL[prev]}` : "Already at first stage"}
                >
                  ← {prev ? STAGE_LABEL[prev] : "back"}
                </button>
                <span className="text-[12px] text-[#14182A]/40">·</span>
                {next ? (
                  <button
                    type="button"
                    onClick={() => onMove(row.id, next)}
                    className="rounded-full bg-[#1B3B5F] text-white px-3 py-1 text-[12px] font-medium hover:bg-[#2E5A88]"
                  >
                    → {STAGE_LABEL[next]}
                  </button>
                ) : (
                  <span className="text-[12px] text-[#1B3B5F] font-semibold">offer ✓</span>
                )}
                <button
                  type="button"
                  onClick={() => onMove(row.id, "closed_lost")}
                  className="ml-auto text-[11px] text-[#C86B4F]/70 hover:text-[#C86B4F]"
                  title="Mark closed (no fit, ghosted, declined)"
                >
                  Close thread
                </button>
              </div>
            </div>
          )}
          {isDraft && (
            <div className="rounded-xl bg-[#EAE3D2]/40 border border-[#D9CFB5] p-4 text-[12px] text-[#14182A]/70">
              <p>This banker is in your draft queue. <a href="/today" className="underline text-[#2E5A88]">Open in Today</a> to approve or skip.</p>
            </div>
          )}

          {/* Contact */}
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
              {typeof row.warmth === "number" && (
                <p><span className="text-[#14182A]/50">Warmth:</span> {row.warmth}</p>
              )}
            </div>
          </div>

          {/* Conversation */}
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
