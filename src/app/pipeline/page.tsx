"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppProvider";
import { SkeletonPage } from "@/components/Skeleton";
import { BankerDetailPanel } from "./_components/BankerDetailPanel";
import { ClosedThreads } from "./_components/ClosedThreads";
import { PipelineEmptyState } from "./_components/PipelineEmptyState";
import { PipelineErrorState } from "./_components/PipelineErrorState";
import { PipelineToasts } from "./_components/PipelineToasts";
import { TransitMap } from "./_components/TransitMap";
import { usePipelineRows } from "./_lib/use-pipeline-rows";
import type { TierFilter, ToastMsg } from "./_lib/types";

// Transit-map view of the IB pipeline. The page coordinates auth, query
// state, and panels; the map/detail pieces live in _components so future
// launch-week edits stay small.

export default function PipelinePage() {
  const { session, authLoading } = useAppState();
  const router = useRouter();
  const [activeBankerId, setActiveBankerId] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  const pushToast = useCallback((message: string, kind: ToastMsg["kind"] = "error") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, kind }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const { rows, loading, error, reload, moveStage } = usePipelineRows(
    session?.user.id,
    pushToast,
  );

  useEffect(() => {
    if (!authLoading && !session) router.push("/login");
  }, [authLoading, router, session]);

  const activeRow = useMemo(
    () => rows.find((row) => row.bankerId === activeBankerId) ?? null,
    [activeBankerId, rows],
  );
  const hasActiveRows = rows.some(
    (row) => row.stage !== "draft" && row.stage !== "closed_lost",
  );
  const closedRows = rows.filter((row) => row.stage === "closed_lost");
  const hasVisiblePipeline = hasActiveRows || closedRows.length > 0;

  if (authLoading || !session || loading) return <SkeletonPage />;

  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A] fade-in">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#2E5A88]">
          Pipeline
        </p>
        <h1 className="mb-2 font-[family-name:var(--font-fraunces)] text-4xl">
          Every banker, every stage.
        </h1>
        <p className="mb-7 font-[family-name:var(--font-fraunces)] text-sm italic text-[#14182A]/70">
          Each line is a firm. Each station is a stage. Click any banker to act
          on them.
        </p>

        {error ? (
          <PipelineErrorState error={error} onRetry={() => void reload()} />
        ) : hasVisiblePipeline ? (
          <>
            {hasActiveRows ? (
              <TransitMap
                rows={rows}
                tierFilter={tierFilter}
                onTierFilterChange={setTierFilter}
                activeBankerId={activeBankerId}
                onOpenBanker={setActiveBankerId}
              />
            ) : (
              <NoActiveThreads />
            )}
            <ClosedThreads
              rows={closedRows}
              onOpen={setActiveBankerId}
              onRestore={(rowId, stage) => void moveStage(rowId, stage)}
            />
          </>
        ) : (
          <PipelineEmptyState />
        )}
      </div>

      {activeBankerId && (
        <BankerDetailPanel
          bankerId={activeBankerId}
          row={activeRow}
          onMove={(rowId, stage) => void moveStage(rowId, stage)}
          onClose={() => setActiveBankerId(null)}
        />
      )}
      <PipelineToasts toasts={toasts} />
    </div>
  );
}

function NoActiveThreads() {
  return (
    <div className="rounded-2xl border border-[#D9CFB5] bg-white p-8 text-center">
      <p className="mb-2 font-[family-name:var(--font-fraunces)] text-2xl">
        No active threads.
      </p>
      <p className="text-sm text-[#14182A]/70">
        Everything is closed right now. Restore a thread below when it should
        return to the live pipeline.
      </p>
    </div>
  );
}
