"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { SkeletonPage } from "@/components/Skeleton";
import { BankerDetailPanel } from "./_components/BankerDetailPanel";
import { DeckEmptyState } from "./_components/DeckEmptyState";
import { DeckErrorState } from "./_components/DeckErrorState";
import { DeckFilters, getDeckCounts } from "./_components/DeckFilters";
import { FirmDeckCard } from "./_components/FirmDeckCard";
import { LevelsScale } from "./_components/LevelsScale";
import { buildFirmDecks } from "./_lib/deck-utils";
import { useDeckData } from "./_lib/use-deck-data";
import type { TierFilter, WarmthFilter } from "./_lib/types";

// Firm-decks view of the same outreach graph as /pipeline. The page owns only
// auth/filter/panel state; data loading and deck rendering stay split out.

export default function DeckPage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [warmthFilter, setWarmthFilter] = useState<WarmthFilter>("all");
  const [sameSchoolOnly, setSameSchoolOnly] = useState(false);
  const [activeBankerId, setActiveBankerId] = useState<string | null>(null);

  const { bankers, userContext, loading, error, reload } = useDeckData(session?.user.id);

  useEffect(() => {
    if (!authLoading && !session) router.push("/login");
  }, [authLoading, router, session]);

  const counts = useMemo(() => getDeckCounts(bankers), [bankers]);
  const decks = useMemo(
    () => buildFirmDecks(bankers, tierFilter, warmthFilter, sameSchoolOnly),
    [bankers, sameSchoolOnly, tierFilter, warmthFilter],
  );
  const activeBanker = useMemo(
    () => bankers.find((banker) => banker.bankerId === activeBankerId) ?? null,
    [activeBankerId, bankers],
  );

  if (authLoading || !session || loading) return <SkeletonPage />;

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] fade-in">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#2E5A88]">
          Deck
        </p>
        <h1 className="mb-2 font-[family-name:var(--font-fraunces)] text-4xl">
          Each firm is a <em className="italic text-[#2E5A88]">deck</em>.
        </h1>
        <p className="mb-6 font-[family-name:var(--font-fraunces)] text-sm italic text-[#14182A]/70">
          Click a deck to fan its bankers out. Each card&apos;s style tells you
          the level you&apos;ve reached.
        </p>

        {error ? (
          <DeckErrorState error={error} onRetry={() => void reload()} />
        ) : bankers.length === 0 ? (
          <DeckEmptyState />
        ) : (
          <>
            <DeckFilters
              counts={counts}
              deckCount={decks.length}
              tierFilter={tierFilter}
              warmthFilter={warmthFilter}
              sameSchoolOnly={sameSchoolOnly}
              onTierChange={setTierFilter}
              onWarmthChange={setWarmthFilter}
              onSameSchoolChange={setSameSchoolOnly}
            />
            <LevelsScale />

            {decks.length === 0 ? (
              <div className="rounded-2xl border border-[#D9CFB5] bg-white p-8 text-center text-sm text-[#5C6472]">
                No decks match these filters. Try widening them.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                {decks.map((deck) => (
                  <FirmDeckCard
                    key={deck.firmId}
                    deck={deck}
                    activeBankerId={activeBankerId}
                    onOpenBanker={setActiveBankerId}
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
          banker={activeBanker}
          userContext={userContext}
          onClose={() => setActiveBankerId(null)}
        />
      )}
    </div>
  );
}

