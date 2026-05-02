"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";
import { SkeletonPage } from "@/components/Skeleton";

// /network is the warmth + discovery view. Different question than /pipeline:
// pipeline = "where am I with each banker?", network = "who's in my network
// and where am I warmest?". Sorted by warmth desc, with the common-ground
// dimensions Alma uses internally surfaced as chips so the user understands
// why each banker is warm.

interface NetworkBanker {
  // connection row id (used for navigation back to /pipeline)
  connectionId: string;
  bankerId: string;
  name: string;
  title: string | null;
  seniority: string | null;
  gradYear: number | null;
  university: string | null;
  firmName: string | null;
  firmTier: "bulge_bracket" | "elite_boutique" | "middle_market" | null;
  warmth: number;
  // common-ground dimensions surfaced as chips
  sameSchool: boolean;
  closeGradYear: boolean; // within ±5 years of user's grad year
  seniorRole: boolean; // VP+
}

interface UserContext {
  university: string;
  graduationYear: number;
}

export default function NetworkPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [bankers, setBankers] = useState<NetworkBanker[]>([]);
  const [userCtx, setUserCtx] = useState<UserContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<"all" | "bulge_bracket" | "elite_boutique" | "middle_market">("all");
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
        .select("id, warmth, bankers(id, name, title, seniority, grad_year, university, firms(name, tier))")
        .eq("user_id", session.user.id)
        .neq("stage", "closed_lost"),
    ]);

    type FirmJoin = { name: string; tier: NetworkBanker["firmTier"] } | null;
    type BankerJoin = {
      id: string; name: string; title: string | null; seniority: string | null;
      grad_year: number | null; university: string | null; firms: FirmJoin;
    };
    type ConnRow = { id: string; warmth: number | null; bankers: BankerJoin | null };

    const userUniv = profileRes.data?.university ?? "";
    const userGradYr = profileRes.data?.graduation_year ?? 0;
    setUserCtx({ university: userUniv, graduationYear: userGradYr });

    const seen = new Set<string>();
    const out: NetworkBanker[] = [];
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
        firmName: c.bankers.firms?.name ?? null,
        firmTier: c.bankers.firms?.tier ?? null,
        warmth: c.warmth ? Math.round(c.warmth) : 0,
        sameSchool,
        closeGradYear,
        seniorRole,
      });
    }
    out.sort((a, b) => b.warmth - a.warmth);
    setBankers(out);
    setLoading(false);
  }

  // Apply filters
  const filtered = useMemo(() => {
    return bankers.filter((b) => {
      if (tierFilter !== "all" && b.firmTier !== tierFilter) return false;
      if (warmthFilter === "70" && b.warmth < 70) return false;
      if (warmthFilter === "85" && b.warmth < 85) return false;
      if (sameSchoolOnly && !b.sameSchool) return false;
      return true;
    });
  }, [bankers, tierFilter, warmthFilter, sameSchoolOnly]);

  // Bucket counts for filter pills
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
        <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-1">Network</p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl mb-2">Where you&rsquo;re warmest.</h1>
        <p className="text-sm text-[#14182A]/70 italic font-[family-name:var(--font-fraunces)] mb-7">
          Every banker in your orbit, sorted by warmth. Same-school alumni rise to the top.
        </p>

        {bankers.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Filter toolbar */}
            <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-[#D9CFB5] bg-white px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <FilterPill active={tierFilter === "all"} onClick={() => setTierFilter("all")} count={counts.all}>All</FilterPill>
                <FilterPill active={tierFilter === "bulge_bracket"} onClick={() => setTierFilter("bulge_bracket")} count={counts.bb}>BB</FilterPill>
                <FilterPill active={tierFilter === "elite_boutique"} onClick={() => setTierFilter("elite_boutique")} count={counts.eb}>EB</FilterPill>
                <FilterPill active={tierFilter === "middle_market"} onClick={() => setTierFilter("middle_market")} count={counts.mm}>MM</FilterPill>
              </div>
              <div className="flex items-center gap-1.5 border-l border-[#ECE7DE] pl-4">
                <FilterPill active={warmthFilter === "all"} onClick={() => setWarmthFilter("all")}>Any warmth</FilterPill>
                <FilterPill active={warmthFilter === "70"} onClick={() => setWarmthFilter("70")} count={counts.warm70}>≥ 70</FilterPill>
                <FilterPill active={warmthFilter === "85"} onClick={() => setWarmthFilter("85")} count={counts.warm85}>≥ 85</FilterPill>
              </div>
              <div className="flex items-center border-l border-[#ECE7DE] pl-4">
                <FilterPill active={sameSchoolOnly} onClick={() => setSameSchoolOnly((v) => !v)} count={counts.sameSchool}>
                  Same school
                </FilterPill>
              </div>
              <span className="ml-auto text-[11px] text-[#8A8674]">
                Showing <strong className="text-[#14182A]">{filtered.length}</strong> of {bankers.length}
              </span>
            </div>

            {/* Group by warmth band — top tier bankers float into a "spotlight" band */}
            {(() => {
              const top = filtered.filter((b) => b.warmth >= 85);
              const warm = filtered.filter((b) => b.warmth >= 65 && b.warmth < 85);
              const cool = filtered.filter((b) => b.warmth < 65);
              return (
                <div className="space-y-6">
                  {top.length > 0 && (
                    <BankerBand
                      title="Strongest entries"
                      caption="Highest warmth — start here."
                      bankers={top}
                      tone="top"
                      onOpen={(id) => setActiveBankerId(id)}
                    />
                  )}
                  {warm.length > 0 && (
                    <BankerBand
                      title="Warm"
                      caption="Solid common ground. Worth the outreach."
                      bankers={warm}
                      tone="warm"
                      onOpen={(id) => setActiveBankerId(id)}
                    />
                  )}
                  {cool.length > 0 && (
                    <BankerBand
                      title="Reach"
                      caption="Cold contacts. Lead with the most specific hook you can find."
                      bankers={cool}
                      tone="cool"
                      onOpen={(id) => setActiveBankerId(id)}
                    />
                  )}
                  {filtered.length === 0 && (
                    <div className="rounded-2xl bg-white border border-[#D9CFB5] p-8 text-center text-sm text-[#5C6472]">
                      No bankers match these filters. Try widening them.
                    </div>
                  )}
                </div>
              );
            })()}
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

// ------ Empty state ------------------------------------------------------------

function EmptyState() {
  return (
    <div className="rounded-2xl bg-white p-10 border border-[#D9CFB5] text-center">
      <p className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">Your network is empty.</p>
      <p className="text-sm text-[#14182A]/70 mb-5">
        Run Alma from <a href="/today" className="underline text-[#2E5A88]">Today</a> to draft your first outreach. Every banker Alma reaches becomes part of your network here.
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

// ------ Filter pill ------------------------------------------------------------

function FilterPill({
  active,
  onClick,
  count,
  children,
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

// ------ Banker band ------------------------------------------------------------

function BankerBand({
  title,
  caption,
  bankers,
  tone,
  onOpen,
}: {
  title: string;
  caption: string;
  bankers: NetworkBanker[];
  tone: "top" | "warm" | "cool";
  onOpen: (bankerId: string) => void;
}) {
  const accent = tone === "top" ? "#2E5A88" : tone === "warm" ? "#C68A2E" : "#8A8674";
  return (
    <section>
      <div className="mb-2.5 flex items-baseline gap-3">
        <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-[#14182A]">
          {title}
          <span className="ml-2 text-[11px] uppercase tracking-[0.1em] text-[#8A8674]">{bankers.length}</span>
        </h2>
        <p className="text-xs italic text-[#5C6472] font-[family-name:var(--font-fraunces)]">{caption}</p>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {bankers.map((b) => (
          <BankerCard key={b.bankerId} banker={b} accent={accent} onOpen={() => onOpen(b.bankerId)} />
        ))}
      </div>
    </section>
  );
}

function BankerCard({
  banker,
  accent,
  onOpen,
}: {
  banker: NetworkBanker;
  accent: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group rounded-xl bg-white border border-[#D9CFB5] p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-[#2E5A88] hover:shadow-[0_12px_28px_-12px_rgba(20,24,42,0.14)]"
    >
      <div className="flex items-start gap-3">
        {/* Warmth ring */}
        <WarmthRing value={banker.warmth} accent={accent} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[14px] font-semibold text-[#14182A] truncate">{banker.name}</p>
            {banker.firmTier && (
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.06em] text-[#8A8674]">
                {banker.firmTier === "bulge_bracket" ? "BB" : banker.firmTier === "elite_boutique" ? "EB" : "MM"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#5C6472] truncate">
            {banker.title ?? "—"}{banker.firmName ? ` · ${banker.firmName}` : ""}
          </p>
          {/* Common-ground chips */}
          <div className="mt-2 flex flex-wrap gap-1">
            {banker.sameSchool && (
              <Chip tone="strong">Same school{banker.university ? ` · ${shortUniversity(banker.university)}` : ""}</Chip>
            )}
            {banker.closeGradYear && banker.gradYear && (
              <Chip tone="medium">Class of {String(banker.gradYear).slice(2)}</Chip>
            )}
            {banker.seniorRole && (
              <Chip tone="medium">{banker.seniority?.toUpperCase() ?? "Senior"}</Chip>
            )}
            {!banker.sameSchool && !banker.closeGradYear && !banker.seniorRole && (
              <Chip tone="muted">No shared dimension yet</Chip>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function WarmthRing({ value, accent }: { value: number; accent: string }) {
  // Warmth as a ring: percentage of 360°. Larger ring = warmer.
  const size = 38;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      <svg width={size} height={size} className="block -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#ECE7DE" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={accent} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-fraunces)] font-semibold text-[12px] tabular-nums"
        style={{ color: accent }}
      >
        {value}
      </span>
    </div>
  );
}

function Chip({ tone, children }: { tone: "strong" | "medium" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "strong"
      ? "bg-[#2E5A88]/12 text-[#1B3B5F] border-[#2E5A88]/25"
      : tone === "medium"
        ? "bg-[#EAE3D2] text-[#5C6472] border-[#D9CFB5]"
        : "bg-transparent text-[#8A8674] border-[#ECE7DE] italic";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

function shortUniversity(u: string): string {
  // Trim "University" suffix where natural.
  return u.replace(/\s*University$/i, "").trim();
}

// ------ Banker detail panel ----------------------------------------------------

interface DraftRow { id: string; subject: string | null; status: string; sent_at: string | null; created_at: string }

function BankerDetailPanel({
  bankerId,
  banker,
  userCtx,
  onClose,
}: {
  bankerId: string;
  banker: NetworkBanker | null;
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
          <div className="flex items-center gap-3">
            <WarmthRing value={banker.warmth} accent="#1B3B5F" />
            <div>
              <h3 className="font-[family-name:var(--font-fraunces)] text-2xl">{banker.name}</h3>
              <p className="text-sm text-[#14182A]/60">
                {banker.title}{banker.firmName ? ` · ${banker.firmName}` : ""}
              </p>
            </div>
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
                  Senior role — {banker.seniority?.toUpperCase() ?? "VP+"} (more decision power, harder to reach)
                </li>
              )}
              {!banker.sameSchool && !banker.closeGradYear && !banker.seniorRole && (
                <li className="text-[#8A8674] italic">
                  No shared dimensions Alma surfaced yet. Lead with a recent deal or post.
                </li>
              )}
            </ul>
          </div>

          {/* Quick action — jump to pipeline */}
          <button
            type="button"
            onClick={() => router.push("/pipeline")}
            className="w-full rounded-xl bg-[#1B3B5F] text-white py-2.5 text-sm font-medium hover:bg-[#2E5A88] transition-colors"
          >
            See {banker.name.split(" ")[0]} on the pipeline →
          </button>

          {/* Recent drafts (compact) */}
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
