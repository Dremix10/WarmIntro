"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { STAGE_NAME, STAGE_ROMAN } from "../_lib/constants";
import { shortUniversity } from "../_lib/deck-utils";
import type { DeckBanker, DraftRow, UserContext } from "../_lib/types";
import { RecentDrafts } from "./RecentDrafts";

export function BankerDetailPanel({
  bankerId,
  banker,
  userContext,
  onClose,
}: {
  bankerId: string;
  banker: DeckBanker | null;
  userContext: UserContext | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user.id;
      if (!userId) {
        setLoading(false);
        return;
      }

      const { data, error: draftError } = await supabase
        .from("drafts")
        .select("id, subject, status, sent_at, created_at")
        .eq("user_id", userId)
        .eq("banker_id", bankerId)
        .order("created_at", { ascending: false })
        .limit(8);

      if (cancelled) return;
      if (draftError) {
        setError(draftError.message);
        setDrafts([]);
      } else {
        setDrafts((data ?? []) as unknown as DraftRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bankerId]);

  if (!banker) return null;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-[#14182A]/40 backdrop-blur-sm" />
      <aside
        className="w-full overflow-y-auto border-l border-[#D9CFB5] bg-white shadow-2xl sm:w-[460px]"
        onClick={(event) => event.stopPropagation()}
      >
        <PanelHeader banker={banker} onClose={onClose} />
        <div className="space-y-5 px-6 py-5 text-sm">
          <WhyWarm banker={banker} userContext={userContext} />
          <button
            type="button"
            onClick={() => router.push("/pipeline")}
            className="w-full rounded-xl bg-[#1B3B5F] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2E5A88]"
          >
            See {banker.name.split(" ")[0]} on the pipeline →
          </button>
          <RecentDrafts loading={loading} error={error} drafts={drafts} />
        </div>
      </aside>
    </div>
  );
}

function PanelHeader({ banker, onClose }: { banker: DeckBanker; onClose: () => void }) {
  return (
    <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#D9CFB5] bg-white px-6 py-4">
      <div>
        <span className="inline-flex items-baseline gap-1.5 rounded-full border border-[#2E5A88]/25 bg-[#2E5A88]/10 px-2.5 py-0.5 text-[10px]">
          <span className="font-[family-name:var(--font-fraunces)] font-semibold italic text-[#1B3B5F]">
            {STAGE_ROMAN[banker.stage]}
          </span>
          <span className="text-[9px] uppercase tracking-[0.08em] text-[#5C6472]">
            {STAGE_NAME[banker.stage]}
          </span>
        </span>
        <h3 className="mt-2 font-[family-name:var(--font-fraunces)] text-2xl">
          {banker.name}
        </h3>
        <p className="text-sm text-[#14182A]/60">
          {banker.title}
          {banker.firmName ? ` · ${banker.firmName}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-mt-1 text-2xl leading-none text-[#14182A]/40 hover:text-[#14182A]"
      >
        ×
      </button>
    </div>
  );
}

function WhyWarm({
  banker,
  userContext,
}: {
  banker: DeckBanker;
  userContext: UserContext | null;
}) {
  const hasReason = banker.sameSchool || banker.closeGradYear || banker.seniorRole;

  return (
    <div className="rounded-xl border border-[#2E5A88]/20 bg-[#2E5A88]/5 p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2E5A88]">
        Why warm
      </p>
      <ul className="space-y-1.5 text-[13px] text-[#14182A]">
        {banker.sameSchool && (
          <Reason>Same school: {shortUniversity(banker.university ?? "")}</Reason>
        )}
        {banker.closeGradYear && banker.gradYear && (
          <Reason>
            Close grad year: class of {String(banker.gradYear).slice(2)}
            {userContext && ` (you: ${String(userContext.graduationYear).slice(2)})`}
          </Reason>
        )}
        {banker.seniorRole && (
          <Reason>Senior role: {banker.seniority?.toUpperCase() ?? "VP+"}</Reason>
        )}
        {!hasReason && (
          <li className="italic text-[#8A8674]">
            No shared dimensions Alma surfaced yet. Lead with a recent deal or post.
          </li>
        )}
        <Reason>
          Warmth <strong className="font-mono text-[#1B3B5F]">{banker.warmth}</strong>
        </Reason>
      </ul>
    </div>
  );
}

function Reason({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="text-[#2E5A88]">•</span>
      <span>{children}</span>
    </li>
  );
}
