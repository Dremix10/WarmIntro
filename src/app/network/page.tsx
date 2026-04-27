"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { supabase } from "@/lib/supabase-browser";
import { SkeletonPage } from "@/components/Skeleton";

// /network is the long-term home for the archipelago visualization. The
// fancy SVG island view is in /design-lab/grove until it's wired up to real
// data. For tonight, this page renders the user's actual outreach footprint
// — bankers Alma has drafted to or made contact with, grouped by firm.

type Stage = "draft" | "sent" | "replied" | "coffee" | "referral" | "first_round" | "superday" | "offer" | "closed_lost";

interface NetworkBanker {
  id: string;
  name: string;
  title: string | null;
  firmName: string | null;
  university: string | null;
  stage: Stage;
}

const STAGE_LABEL: Record<Stage, string> = {
  draft: "Draft prepared",
  sent: "Email sent",
  replied: "Replied",
  coffee: "Coffee scheduled",
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

export default function NetworkPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [bankers, setBankers] = useState<NetworkBanker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !session) { router.push("/login"); return; }
    if (session) load();
  }, [authLoading, session?.user?.id]);

  async function load() {
    if (!session) return;
    setLoading(true);

    // Connections (sent + further) live in the connections table
    const { data: conns } = await supabase
      .from("connections")
      .select("banker_id, stage, bankers(id, name, title, university, firms(name))")
      .eq("user_id", session.user.id);

    // Drafts (not yet sent) live in drafts — we count these as "draft prepared"
    const { data: drafts } = await supabase
      .from("drafts")
      .select("banker_id, bankers(id, name, title, university, firms(name))")
      .eq("user_id", session.user.id)
      .is("sent_at", null)
      .in("status", ["pending_critic", "needs_revision", "approved"]);

    type ConnRow = { banker_id: string; stage: string; bankers: { id: string; name: string; title: string | null; university: string | null; firms: { name: string } | null } | null };
    type DraftRow = { banker_id: string; bankers: { id: string; name: string; title: string | null; university: string | null; firms: { name: string } | null } | null };

    const seen = new Set<string>();
    const out: NetworkBanker[] = [];

    for (const c of (conns ?? []) as unknown as ConnRow[]) {
      if (!c.bankers || seen.has(c.bankers.id)) continue;
      seen.add(c.bankers.id);
      out.push({
        id: c.bankers.id,
        name: c.bankers.name,
        title: c.bankers.title,
        firmName: c.bankers.firms?.name ?? null,
        university: c.bankers.university,
        stage: (c.stage as Stage) ?? "sent",
      });
    }
    for (const d of (drafts ?? []) as unknown as DraftRow[]) {
      if (!d.bankers || seen.has(d.bankers.id)) continue;
      seen.add(d.bankers.id);
      out.push({
        id: d.bankers.id,
        name: d.bankers.name,
        title: d.bankers.title,
        firmName: d.bankers.firms?.name ?? null,
        university: d.bankers.university,
        stage: "draft",
      });
    }

    setBankers(out);
    setLoading(false);
  }

  if (authLoading || loading) return <SkeletonPage />;

  // Group by firm
  const byFirm = new Map<string, NetworkBanker[]>();
  for (const b of bankers) {
    const key = b.firmName ?? "Unknown";
    if (!byFirm.has(key)) byFirm.set(key, []);
    byFirm.get(key)!.push(b);
  }
  const firms = [...byFirm.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] fade-in">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-xs uppercase tracking-wider text-[#2E5A88] font-semibold mb-1">Network</p>
        <h1 className="font-[family-name:var(--font-fraunces)] text-4xl mb-2">Your archipelago</h1>
        <p className="text-sm text-[#14182A]/70 italic font-[family-name:var(--font-fraunces)] mb-8">
          Every banker Alma has drafted to or contacted on your behalf, grouped by firm. The fancy island visualization is coming — for now this is the source of truth.
        </p>

        {bankers.length === 0 ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-8 border border-[#D9CFB5] text-center">
              <p className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">No crossings yet.</p>
              <p className="text-sm text-[#14182A]/70 mb-5">
                Run Alma from <a href="/today" className="underline text-[#2E5A88]">Today</a> to draft your first outreach. Every banker you contact lands here.
              </p>
              <a
                href="/today"
                className="inline-block rounded-xl bg-[#2E5A88] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#1B3B5F] transition-colors"
              >
                Go to Today
              </a>
            </div>

            {/* Sample preview — what your archipelago will look like once you start */}
            <div className="opacity-60">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#14182A]/50 font-semibold mb-2 text-center">
                Preview · Your firms once Alma starts working
              </p>
              <div className="space-y-3">
                <SampleFirmCard firm="Goldman Sachs" bankers={[
                  { name: "Sample banker, Analyst", stage: "draft" },
                  { name: "Sample banker, Associate", stage: "sent" },
                ]} />
                <SampleFirmCard firm="Morgan Stanley" bankers={[
                  { name: "Sample banker, VP", stage: "replied" },
                  { name: "Sample banker, Analyst", stage: "coffee" },
                ]} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[#14182A]/60">
              {bankers.length} {bankers.length === 1 ? "banker" : "bankers"} across {firms.length} {firms.length === 1 ? "firm" : "firms"}
            </p>
            {firms.map(([firmName, firmBankers]) => (
              <div key={firmName} className="rounded-2xl bg-white border border-[#D9CFB5] p-5">
                <div className="flex items-baseline justify-between mb-3">
                  <p className="font-[family-name:var(--font-fraunces)] text-lg">{firmName}</p>
                  <p className="text-[10px] uppercase tracking-wider text-[#14182A]/50">
                    {firmBankers.length} {firmBankers.length === 1 ? "banker" : "bankers"}
                  </p>
                </div>
                <div className="space-y-2">
                  {firmBankers.map((b) => (
                    <div key={b.id} className="flex items-start justify-between gap-3 py-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.name}</p>
                        <p className="text-xs text-[#14182A]/60">
                          {b.title ?? ""}{b.university ? ` · ${b.university}` : ""}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${STAGE_COLOR[b.stage]}`}>
                        {STAGE_LABEL[b.stage]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SampleFirmCard({ firm, bankers }: { firm: string; bankers: Array<{ name: string; stage: Stage }> }) {
  return (
    <div className="rounded-2xl bg-white border border-[#D9CFB5] border-dashed p-5">
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-[family-name:var(--font-fraunces)] text-lg">{firm}</p>
        <p className="text-[10px] uppercase tracking-wider text-[#14182A]/50">{bankers.length} bankers</p>
      </div>
      <div className="space-y-2">
        {bankers.map((b, i) => (
          <div key={i} className="flex items-start justify-between gap-3 py-1.5">
            <p className="text-sm text-[#14182A]/60 italic">{b.name}</p>
            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${STAGE_COLOR[b.stage]}`}>
              {STAGE_LABEL[b.stage]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
