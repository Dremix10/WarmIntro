"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";
import { SkeletonPage } from "@/components/Skeleton";

// /deck — your network as a hand of decks. Each firm is one deck. Click a
// deck to fan its bankers out as cards. Card visual treatment escalates with
// the stage you've reached: paper at I-II, Aegean tint at III, ochre at IV,
// gold edge at V-VII. Different question than /pipeline (which shows the
// transit map of where each banker is in the pipeline).

type Stage =
  | "sent" | "replied" | "coffee" | "referral"
  | "first_round" | "superday" | "offer" | "closed_lost";

interface DeckBanker {
  connectionId: string;
  bankerId: string;
  name: string;
  title: string | null;
  seniority: string | null;
  gradYear: number | null;
  university: string | null;
  firmId: string | null;
  firmName: string | null;
  firmTier: "bulge_bracket" | "elite_boutique" | "middle_market" | null;
  warmth: number;
  stage: Stage;
  sameSchool: boolean;
  closeGradYear: boolean;
  seniorRole: boolean;
}

interface FirmDeck {
  firmId: string;
  firmName: string;
  firmTier: DeckBanker["firmTier"];
  bankers: DeckBanker[];
  highestStage: Stage;
  histogram: number[];
}

const STAGE_ORDER: Exclude<Stage, "closed_lost">[] = [
  "sent", "replied", "coffee", "referral", "first_round", "superday", "offer",
];

const STAGE_ROMAN: Record<Stage, string> = {
  sent: "I", replied: "II", coffee: "III", referral: "IV",
  first_round: "V", superday: "VI", offer: "VII", closed_lost: "—",
};

const STAGE_NAME: Record<Stage, string> = {
  sent: "Sent", replied: "Replied", coffee: "Coffee", referral: "Referral",
  first_round: "1st Round", superday: "Superday", offer: "Offer", closed_lost: "Closed",
};

type Tier = "paper" | "aegean" | "ochre" | "gold";
const STAGE_TIER: Record<Stage, Tier> = {
  sent: "paper", replied: "paper", coffee: "aegean", referral: "ochre",
  first_round: "gold", superday: "gold", offer: "gold", closed_lost: "paper",
};

function stageIdx(s: Stage): number {
  return STAGE_ORDER.indexOf(s as Exclude<Stage, "closed_lost">);
}

function shortUniversity(u: string): string {
  return u.replace(/\s*University$/i, "").trim();
}

function initial(name: string): string {
  return (name.trim().split(/\s+/)[0]?.[0] ?? "?").toUpperCase();
}

const FIRM_COLORS = ["#1B3B5F", "#2E5A88", "#7B1F2C", "#C86B4F", "#5A3D5C", "#2D6E6A"];
function firmColor(firmId: string): string {
  let hash = 0;
  for (let i = 0; i < firmId.length; i++) hash = (hash * 31 + firmId.charCodeAt(i)) >>> 0;
  return FIRM_COLORS[hash % FIRM_COLORS.length];
}

interface UserContext { university: string; graduationYear: number; }

export default function DeckPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [bankers, setBankers] = useState<DeckBanker[]>([]);
  const [userCtx, setUserCtx] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<"all" | DeckBanker["firmTier"]>("all");
  const [warmthFilter, setWarmthFilter] = useState<"all" | "70" | "85">("all");
  const [sameSchoolOnly, setSameSchoolOnly] = useState(false);
  const [activeBankerId, setActiveBankerId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !session) { router.push("/login"); return; }
    if (session) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, session?.user?.id]);

  async function load() {
    if (!session) return;
    setLoading(true);

    const [profileRes, connRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("university, graduation_year")
        .eq("id", session.user.id)
        .single(),
      supabase
        .from("connections")
        .select("id, stage, warmth, bankers(id, name, title, seniority, grad_year, university, firms(id, name, tier))")
        .eq("user_id", session.user.id)
        .neq("stage", "closed_lost"),
    ]);

    type FirmJoin = { id: string; name: string; tier: DeckBanker["firmTier"] } | null;
    type BankerJoin = {
      id: string; name: string; title: string | null; seniority: string | null;
      grad_year: number | null; university: string | null; firms: FirmJoin;
    };
    type ConnRow = { id: string; stage: string; warmth: number | null; bankers: BankerJoin | null };

    const userUniv = profileRes.data?.university ?? "";
    const userGradYr = profileRes.data?.graduation_year ?? 0;
    setUserCtx({ university: userUniv, graduationYear: userGradYr });

    const seen = new Set<string>();
    const out: DeckBanker[] = [];
    for (const c of (connRes.data ?? []) as unknown as ConnRow[]) {
      if (!c.bankers || seen.has(c.bankers.id)) continue;
      seen.add(c.bankers.id);

      const sameSchool = !!(
        c.bankers.university && userUniv &&
        c.bankers.university.toLowerCase() === userUniv.toLowerCase()
      );
      const closeGradYear = !!(
        c.bankers.grad_year && userGradYr &&
        Math.abs(c.bankers.grad_year - userGradYr) <= 5
      );
      const sn = (c.bankers.seniority ?? "").toLowerCase();
      const seniorRole = sn === "vp" || sn === "director" || sn === "md";

      out.push({
        connectionId: c.id,
        bankerId: c.bankers.id,
        name: c.bankers.name,
        title: c.bankers.title,
        seniority: c.bankers.seniority,
        gradYear: c.bankers.grad_year,
        university: c.bankers.university,
        firmId: c.bankers.firms?.id ?? null,
        firmName: c.bankers.firms?.name ?? null,
        firmTier: c.bankers.firms?.tier ?? null,
        warmth: c.warmth ? Math.round(c.warmth) : 0,
        stage: (c.stage as Stage) ?? "sent",
        sameSchool, closeGradYear, seniorRole,
      });
    }
    setBankers(out);
    setLoading(false);
  }

  // Apply filters, then group by firm
  const decks: FirmDeck[] = useMemo(() => {
    const filtered = bankers.filter((b) => {
      if (!b.firmId) return false;
      if (tierFilter !== "all" && b.firmTier !== tierFilter) return false;
      if (warmthFilter === "70" && b.warmth < 70) return false;
      if (warmthFilter === "85" && b.warmth < 85) return false;
      if (sameSchoolOnly && !b.sameSchool) return false;
      return true;
    });

    const map = new Map<string, FirmDeck>();
    for (const b of filtered) {
      if (!b.firmId) continue;
      if (!map.has(b.firmId)) {
        map.set(b.firmId, {
          firmId: b.firmId,
          firmName: b.firmName ?? "Unknown firm",
          firmTier: b.firmTier,
          bankers: [],
          highestStage: "sent",
          histogram: [0, 0, 0, 0, 0, 0, 0],
        });
      }
      const d = map.get(b.firmId)!;
      d.bankers.push(b);
      const idx = stageIdx(b.stage);
      if (idx >= 0) {
        d.histogram[idx]++;
        if (idx > stageIdx(d.highestStage)) d.highestStage = b.stage;
      }
    }

    // Sort bankers within each deck by stage desc, then warmth desc
    for (const d of map.values()) {
      d.bankers.sort((a, b) => stageIdx(b.stage) - stageIdx(a.stage) || b.warmth - a.warmth);
    }

    // Sort decks by highest stage desc, then banker count desc
    return Array.from(map.values()).sort(
      (a, b) => stageIdx(b.highestStage) - stageIdx(a.highestStage) || b.bankers.length - a.bankers.length
    );
  }, [bankers, tierFilter, warmthFilter, sameSchoolOnly]);

  const counts = useMemo(() => ({
    all: bankers.length,
    bb: bankers.filter((b) => b.firmTier === "bulge_bracket").length,
    eb: bankers.filter((b) => b.firmTier === "elite_boutique").length,
    mm: bankers.filter((b) => b.firmTier === "middle_market").length,
    sameSchool: bankers.filter((b) => b.sameSchool).length,
    warm70: bankers.filter((b) => b.warmth >= 70).length,
    warm85: bankers.filter((b) => b.warmth >= 85).length,
  }), [bankers]);

  if (authLoading || loading) return <SkeletonPage />;

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] fade-in">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-1">Deck</p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl mb-2">
          Each firm is a <em className="italic text-[#2E5A88]">deck</em>.
        </h1>
        <p className="text-sm text-[#14182A]/70 italic font-[family-name:var(--font-fraunces)] mb-6">
          Click a deck to fan its bankers out. Each card&rsquo;s style tells you the level you&rsquo;ve reached.
        </p>

        {bankers.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Filter toolbar */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-[#D9CFB5] bg-white px-3 py-2.5">
              <FilterPill active={tierFilter === "all"} onClick={() => setTierFilter("all")} count={counts.all}>All</FilterPill>
              <FilterPill active={tierFilter === "bulge_bracket"} onClick={() => setTierFilter("bulge_bracket")} count={counts.bb}>BB</FilterPill>
              <FilterPill active={tierFilter === "elite_boutique"} onClick={() => setTierFilter("elite_boutique")} count={counts.eb}>EB</FilterPill>
              <FilterPill active={tierFilter === "middle_market"} onClick={() => setTierFilter("middle_market")} count={counts.mm}>MM</FilterPill>
              <span className="mx-1.5 h-4 w-px bg-[#ECE7DE]" aria-hidden />
              <FilterPill active={warmthFilter === "all"} onClick={() => setWarmthFilter("all")}>Any warmth</FilterPill>
              <FilterPill active={warmthFilter === "70"} onClick={() => setWarmthFilter("70")} count={counts.warm70}>≥ 70</FilterPill>
              <FilterPill active={warmthFilter === "85"} onClick={() => setWarmthFilter("85")} count={counts.warm85}>≥ 85</FilterPill>
              <span className="mx-1.5 h-4 w-px bg-[#ECE7DE]" aria-hidden />
              <FilterPill active={sameSchoolOnly} onClick={() => setSameSchoolOnly((v) => !v)} count={counts.sameSchool}>Same school</FilterPill>
              <span className="ml-auto text-[11px] text-[#8A8674]">
                {decks.length} deck{decks.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Levels scale */}
            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-[#ECE7DE] bg-gradient-to-b from-white/55 to-transparent px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5C6472] mr-1">Levels</span>
              {STAGE_ORDER.map((s, i) => (
                <span key={s} className="contents">
                  <span className="flex items-baseline gap-1 text-[11px] text-[#5C6472]">
                    <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[12px] text-[#14182A]">
                      {STAGE_ROMAN[s]}
                    </span>
                    {STAGE_NAME[s]}
                  </span>
                  {i < STAGE_ORDER.length - 1 && (
                    <span className="text-[#8A8674] text-[11px] mx-0.5" aria-hidden>→</span>
                  )}
                </span>
              ))}
            </div>

            {/* Deck grid */}
            {decks.length === 0 ? (
              <div className="rounded-2xl bg-white border border-[#D9CFB5] p-8 text-center text-sm text-[#5C6472]">
                No decks match these filters. Try widening them.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
                {decks.map((deck) => (
                  <FirmDeckCard
                    key={deck.firmId}
                    deck={deck}
                    onOpenBanker={(id) => setActiveBankerId(id)}
                    activeBankerId={activeBankerId}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {activeBankerId && (
        <BankerDetailPanel
          bankerId={activeBankerId}
          banker={bankers.find((b) => b.bankerId === activeBankerId) ?? null}
          userCtx={userCtx}
          onClose={() => setActiveBankerId(null)}
        />
      )}
    </div>
  );
}

// ---- Empty state ------------------------------------------------------------

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white p-10 border border-[#D9CFB5] text-center">
      <p className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">Your deck is empty.</p>
      <p className="text-sm text-[#14182A]/70 mb-5">
        Run Alma from <a href="/today" className="underline text-[#2E5A88]">Today</a> to draft your first outreach. Every banker Alma reaches becomes a card here.
      </p>
      <a
        href="/today"
        className="inline-block rounded-xl bg-[#2E5A88] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#1B3B5F] transition-colors"
      >
        Go to Today
      </a>
    </div>
  );
}

// ---- Filter pill ------------------------------------------------------------

function FilterPill({
  active, onClick, count, children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "bg-[#1B3B5F] text-white border-[#1B3B5F]"
          : "bg-white text-[#5C6472] border-[#D9CFB5] hover:border-[#2E5A88] hover:text-[#1B3B5F]"
      }`}
    >
      {children}
      {typeof count === "number" && (
        <span className={`ml-1.5 ${active ? "text-white/70" : "text-[#8A8674]"}`}>{count}</span>
      )}
    </button>
  );
}

// ---- Single firm deck -------------------------------------------------------

function FirmDeckCard({
  deck,
  onOpenBanker,
  activeBankerId,
}: {
  deck: FirmDeck;
  onOpenBanker: (bankerId: string) => void;
  activeBankerId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const tierLabel = deck.firmTier === "bulge_bracket" ? "BB" : deck.firmTier === "elite_boutique" ? "EB" : "MM";
  const highestRoman = STAGE_ROMAN[deck.highestStage];
  const highestName = STAGE_NAME[deck.highestStage];
  const histoMax = Math.max(...deck.histogram, 1);
  const highestIdx = stageIdx(deck.highestStage);
  const color = firmColor(deck.firmId);

  return (
    <div className="alma-deck" data-open={open || undefined} data-highest={highestRoman}>
      {/* Stack of cards (closed view) */}
      <div className="alma-deck-stack" onClick={() => setOpen((v) => !v)}>
        <div className="alma-deck-stack-card ghost-1" />
        <div className="alma-deck-stack-card ghost-2" />
        <div className="alma-deck-stack-card top" />
        <div className="alma-deck-top-content">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-[family-name:var(--font-fraunces)] font-semibold text-[20px] tracking-[-0.01em] text-[#14182A]">
                {deck.firmName}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8A8674]">
                {tierLabel}
              </span>
            </div>
            <div className="mt-1.5 text-[12px] text-[#5C6472]">
              <strong className="text-[#14182A] font-semibold">{deck.bankers.length}</strong>{" "}
              banker{deck.bankers.length === 1 ? "" : "s"} · highest level{" "}
              <strong className="text-[#14182A] font-semibold">{highestRoman}</strong>{" "}
              <span className="text-[#8A8674]">{highestName}</span>
            </div>
            <div className="alma-deck-histo mt-3 flex items-end gap-1 h-[20px]">
              {deck.histogram.map((n, i) => {
                const isHigh = i === highestIdx && n > 0;
                const h = n > 0 ? Math.max(8, Math.round((n / histoMax) * 18)) : 4;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-[2px]"
                    style={{
                      height: `${h}px`,
                      backgroundColor:
                        n === 0
                          ? "#D9CFB5"
                          : isHigh
                            ? STAGE_TIER[STAGE_ORDER[i]] === "gold"
                              ? "#C9A24C"
                              : STAGE_TIER[STAGE_ORDER[i]] === "ochre"
                                ? "#E8B339"
                                : "#1B3B5F"
                            : "#2E5A88",
                    }}
                    title={`${STAGE_ROMAN[STAGE_ORDER[i]]} · ${STAGE_NAME[STAGE_ORDER[i]]}: ${n}`}
                  />
                );
              })}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1 font-mono text-[8px] text-[#8A8674] text-center">
              {STAGE_ORDER.map((s) => <span key={s}>{STAGE_ROMAN[s]}</span>)}
            </div>
          </div>
          <div className="flex items-baseline justify-between text-[11px] text-[#5C6472]">
            <span className="truncate">
              {deck.bankers.some((b) => b.sameSchool) ? "Same-school alum in this deck" : `${tierLabel} · ${deck.bankers[0]?.title?.split(",")[0] ?? "Mixed"}`}
            </span>
            <span className="italic font-[family-name:var(--font-fraunces)] text-[#2E5A88] shrink-0">
              tap to fan →
            </span>
          </div>
        </div>
      </div>

      {/* Open-state header — keeps the firm name visible while the cards are spread */}
      <div className="alma-deck-open-header">
        <div className="min-w-0">
          <div className="font-[family-name:var(--font-fraunces)] font-semibold text-[16px] text-[#14182A] truncate">
            {deck.firmName}
          </div>
          <div className="text-[11px] text-[#5C6472] mt-[1px]">
            <strong className="text-[#14182A] font-semibold">{deck.bankers.length}</strong> bankers · {tierLabel}
          </div>
        </div>
        <span className="alma-deck-stage-pill">
          <span className="alma-deck-stage-roman">{highestRoman}</span>
          <span className="alma-deck-stage-name">{highestName}</span>
        </span>
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        className="alma-deck-close"
        aria-label="Close deck"
      >
        ✕
      </button>

      {/* Spread — banker cards leap in when opened */}
      <div className="alma-deck-spread">
        {deck.bankers.map((b, i) => (
          <BankerSpreadCard
            key={b.bankerId}
            banker={b}
            color={color}
            stagger={i}
            isActive={b.bankerId === activeBankerId}
            onOpen={() => onOpenBanker(b.bankerId)}
          />
        ))}
      </div>
    </div>
  );
}

// ---- Banker card in the spread ----------------------------------------------

function BankerSpreadCard({
  banker, color, stagger, isActive, onOpen,
}: {
  banker: DeckBanker;
  color: string;
  stagger: number;
  isActive: boolean;
  onOpen: () => void;
}) {
  const tier = STAGE_TIER[banker.stage];
  const idx = stageIdx(banker.stage);
  return (
    <button
      type="button"
      onClick={onOpen}
      data-tier={tier}
      data-active={isActive || undefined}
      className="alma-banker-card text-left w-full"
      style={{ ["--alma-stagger" as string]: `${80 + stagger * 80}ms` }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white font-[family-name:var(--font-fraunces)] font-semibold text-[14px]"
          style={{ backgroundColor: color }}
        >
          {initial(banker.name)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14px] text-[#14182A] leading-tight truncate">{banker.name}</div>
          <div className="text-[11px] text-[#5C6472] truncate mt-[1px]">
            {banker.title ?? "—"}
            {banker.sameSchool && banker.university && (
              <> · {shortUniversity(banker.university)} alum</>
            )}
            {!banker.sameSchool && banker.gradYear && (
              <> · {String(banker.gradYear).slice(2)}</>
            )}
          </div>
        </div>
        <span className="alma-banker-warmth shrink-0 font-mono text-[10px] font-semibold tabular-nums">
          {banker.warmth}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <div className="flex flex-1 gap-[3px]">
          {STAGE_ORDER.map((s, i) => (
            <span
              key={s}
              className="h-[4px] flex-1 rounded-[2px]"
              style={{
                backgroundColor:
                  i <= idx
                    ? tier === "gold" ? "#C9A24C" : tier === "ochre" ? "#E8B339" : "#2E5A88"
                    : "#D9CFB5",
              }}
            />
          ))}
        </div>
        <span className="alma-banker-stage-label shrink-0 inline-flex items-baseline gap-1">
          <span className="alma-banker-stage-roman font-[family-name:var(--font-fraunces)] italic font-semibold">
            {STAGE_ROMAN[banker.stage]}
          </span>
          <span className="alma-banker-stage-name uppercase tracking-[0.08em] text-[9px]">
            {STAGE_NAME[banker.stage]}
          </span>
        </span>
      </div>
    </button>
  );
}

// ---- Banker detail panel ----------------------------------------------------

interface DraftRow { id: string; subject: string | null; status: string; sent_at: string | null; created_at: string }

function BankerDetailPanel({
  bankerId, banker, userCtx, onClose,
}: {
  bankerId: string;
  banker: DeckBanker | null;
  userCtx: UserContext | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { session: s } } = await supabase.auth.getSession();
      const userId = s?.user.id;
      if (!userId) { setLoading(false); return; }
      const { data } = await supabase
        .from("drafts")
        .select("id, subject, status, sent_at, created_at")
        .eq("user_id", userId)
        .eq("banker_id", bankerId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (cancelled) return;
      setDrafts((data ?? []) as unknown as DraftRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [bankerId]);

  if (!banker) return null;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-[#14182A]/40 backdrop-blur-sm" />
      <aside
        className="w-full sm:w-[460px] bg-white border-l border-[#D9CFB5] shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-[#D9CFB5] px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div>
            <span className="inline-flex items-baseline gap-1.5 rounded-full bg-[#2E5A88]/10 border border-[#2E5A88]/25 px-2.5 py-0.5 text-[10px]">
              <span className="font-[family-name:var(--font-fraunces)] italic font-semibold text-[#1B3B5F]">{STAGE_ROMAN[banker.stage]}</span>
              <span className="uppercase tracking-[0.08em] text-[9px] text-[#5C6472]">{STAGE_NAME[banker.stage]}</span>
            </span>
            <h3 className="font-[family-name:var(--font-fraunces)] text-2xl mt-2">{banker.name}</h3>
            <p className="text-sm text-[#14182A]/60">
              {banker.title}{banker.firmName ? ` · ${banker.firmName}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[#14182A]/40 hover:text-[#14182A] text-2xl leading-none -mt-1">×</button>
        </div>

        <div className="px-6 py-5 space-y-5 text-sm">
          {/* Why warm */}
          <div className="rounded-xl bg-[#2E5A88]/5 border border-[#2E5A88]/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#2E5A88] font-semibold mb-2">Why warm</p>
            <ul className="space-y-1.5 text-[13px] text-[#14182A]">
              {banker.sameSchool && (
                <li className="flex items-baseline gap-2">
                  <span className="text-[#2E5A88]">●</span>
                  Same school — {shortUniversity(banker.university ?? "")}
                </li>
              )}
              {banker.closeGradYear && banker.gradYear && (
                <li className="flex items-baseline gap-2">
                  <span className="text-[#2E5A88]">●</span>
                  Close grad year — class of {String(banker.gradYear).slice(2)}
                  {userCtx && ` (you: ${String(userCtx.graduationYear).slice(2)})`}
                </li>
              )}
              {banker.seniorRole && (
                <li className="flex items-baseline gap-2">
                  <span className="text-[#2E5A88]">●</span>
                  Senior role — {banker.seniority?.toUpperCase() ?? "VP+"}
                </li>
              )}
              {!banker.sameSchool && !banker.closeGradYear && !banker.seniorRole && (
                <li className="text-[#8A8674] italic">
                  No shared dimensions Alma surfaced yet. Lead with a recent deal or post.
                </li>
              )}
              <li className="flex items-baseline gap-2 pt-1 border-t border-[#2E5A88]/15">
                <span className="text-[#2E5A88]">●</span>
                Warmth <strong className="font-mono text-[#1B3B5F]">{banker.warmth}</strong>
              </li>
            </ul>
          </div>

          {/* Jump to pipeline */}
          <button
            type="button"
            onClick={() => router.push("/pipeline")}
            className="w-full rounded-xl bg-[#1B3B5F] text-white py-2.5 text-sm font-medium hover:bg-[#2E5A88] transition-colors"
          >
            See {banker.name.split(" ")[0]} on the pipeline →
          </button>

          {/* Recent drafts */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#14182A]/50 font-semibold mb-2">Recent drafts</p>
            {loading ? (
              <p className="text-xs text-[#14182A]/50 italic">Loading…</p>
            ) : drafts.length === 0 ? (
              <p className="text-xs text-[#14182A]/50 italic">No drafts yet.</p>
            ) : (
              <ul className="space-y-1.5 text-[12px]">
                {drafts.map((d) => (
                  <li key={d.id} className="flex items-baseline justify-between gap-2 border-b border-[#ECE7DE] pb-1.5 last:border-b-0">
                    <span className="truncate text-[#14182A]/80 italic font-[family-name:var(--font-fraunces)]">
                      {d.subject ?? "(no subject)"}
                    </span>
                    <span className="text-[10px] text-[#8A8674] tabular-nums shrink-0">
                      {d.sent_at
                        ? `sent ${new Date(d.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : d.status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
