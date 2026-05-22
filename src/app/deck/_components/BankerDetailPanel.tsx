"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { STAGE_NAME, STAGE_ROMAN } from "../_lib/constants";
import { shortUniversity } from "../_lib/deck-utils";
import type { DeckBanker, UserContext } from "../_lib/types";

interface DraftLogRow {
  id: string;
  subject: string | null;
  body: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  type: string;
}

interface SignalLogRow {
  signal_type: string;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

type EmailLogItem =
  | {
      kind: "outbound";
      id: string;
      timestamp: string;
      subject: string | null;
      body: string;
      status: string;
      type: string;
      sent: boolean;
    }
  | {
      kind: "inbound";
      id: string;
      timestamp: string;
      body: string;
      intent: string | null;
    }
  | {
      kind: "activity";
      id: string;
      timestamp: string;
      label: string;
      detail: string | null;
    };

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
  const [drafts, setDrafts] = useState<DraftLogRow[]>([]);
  const [signals, setSignals] = useState<SignalLogRow[]>([]);
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

      const [draftsRes, bankerSignalsRes, metadataSignalsRes] = await Promise.all([
        supabase
          .from("drafts")
          .select("id, subject, body, status, sent_at, created_at, type")
          .eq("user_id", userId)
          .eq("banker_id", bankerId)
          .order("created_at", { ascending: true })
          .limit(50),
        supabase
          .from("signals")
          .select("signal_type, metadata, occurred_at")
          .eq("user_id", userId)
          .eq("banker_id", bankerId)
          .order("occurred_at", { ascending: true })
          .limit(80),
        supabase
          .from("signals")
          .select("signal_type, metadata, occurred_at")
          .eq("user_id", userId)
          .contains("metadata", { bankerId })
          .order("occurred_at", { ascending: true })
          .limit(80),
      ]);

      if (cancelled) return;
      const errors = [
        draftsRes.error?.message,
        bankerSignalsRes.error?.message,
        metadataSignalsRes.error?.message,
      ].filter(Boolean);
      if (errors.length > 0) {
        setError(errors.join("; "));
        setDrafts([]);
        setSignals([]);
      } else {
        setDrafts((draftsRes.data ?? []) as unknown as DraftLogRow[]);
        setSignals(
          mergeSignals([
            ...((bankerSignalsRes.data ?? []) as unknown as SignalLogRow[]),
            ...((metadataSignalsRes.data ?? []) as unknown as SignalLogRow[]),
          ]),
        );
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
        className="w-full overflow-y-auto border-l border-[#D9CFB5] bg-white shadow-2xl sm:w-[560px] lg:w-[640px]"
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
            See {banker.name.split(" ")[0]} on the pipeline
          </button>
          <EmailLog loading={loading} error={error} drafts={drafts} signals={signals} />
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

function EmailLog({
  drafts,
  signals,
  loading,
  error,
}: {
  drafts: DraftLogRow[];
  signals: SignalLogRow[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <p className="text-xs italic text-[#14182A]/50">Loading email log...</p>;
  if (error) return <p className="text-xs text-[#C86B4F]">{error}</p>;

  const items = buildEmailLog(drafts, signals);
  if (items.length === 0) {
    return <p className="text-xs italic text-[#14182A]/50">No emails or reply events logged yet.</p>;
  }

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#14182A]/50">
            Full email log
          </p>
          <p className="mt-0.5 text-xs text-[#5C6472]">
            Oldest first. Outbound drafts include the full body Alma generated or sent.
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-[#D9CFB5] px-2.5 py-1 text-[10px] text-[#5C6472]">
          {items.length} event{items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <EmailLogCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function buildEmailLog(drafts: DraftLogRow[], signals: SignalLogRow[]): EmailLogItem[] {
  const outbound: EmailLogItem[] = drafts.map((draft) => ({
    kind: "outbound",
    id: `draft-${draft.id}`,
    timestamp: draft.sent_at ?? draft.created_at,
    subject: draft.subject,
    body: draft.body,
    status: draft.status,
    type: draft.type,
    sent: Boolean(draft.sent_at),
  }));

  const signalItems = signals
    .map((signal, index): EmailLogItem | null => {
      const incomingBody = stringFromMetadata(signal.metadata, "incomingBody");
      if (incomingBody) {
        return {
          kind: "inbound",
          id: `inbound-${signal.occurred_at}-${index}`,
          timestamp: signal.occurred_at,
          body: incomingBody,
          intent: stringFromMetadata(signal.metadata, "hint"),
        };
      }

      if (signal.signal_type === "draft_sent") return null;

      const activity = activityLabel(signal);
      if (!activity) return null;
      return {
        kind: "activity",
        id: `signal-${signal.occurred_at}-${index}`,
        timestamp: signal.occurred_at,
        label: activity.label,
        detail: activity.detail,
      };
    })
    .filter((item): item is EmailLogItem => Boolean(item));

  return [...outbound, ...signalItems].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

function mergeSignals(signals: SignalLogRow[]): SignalLogRow[] {
  const seen = new Set<string>();
  const merged: SignalLogRow[] = [];

  for (const signal of signals) {
    const key = `${signal.signal_type}:${signal.occurred_at}:${JSON.stringify(signal.metadata)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(signal);
  }

  return merged.sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );
}

function EmailLogCard({ item }: { item: EmailLogItem }) {
  if (item.kind === "activity") {
    return (
      <div className="rounded-lg border border-[#D9CFB5] bg-[#F7F2E8] px-3 py-2 text-xs">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-[#14182A]/70">{item.label}</span>
          <span className="text-[#14182A]/35">{formatDateTime(item.timestamp)}</span>
        </div>
        {item.detail && <p className="mt-1 text-[#5C6472]">{item.detail}</p>}
      </div>
    );
  }

  const inbound = item.kind === "inbound";
  return (
    <article
      className={`rounded-xl border p-3 ${
        inbound
          ? "border-[#C86B4F]/25 bg-[#C86B4F]/5"
          : item.sent
            ? "border-[#2E5A88]/20 bg-[#2E5A88]/5"
            : "border-[#D9CFB5] bg-[#EAE3D2]/40"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#14182A]/55">
            {inbound
              ? "Banker reply"
              : `${item.sent ? "Sent" : item.status.replace(/_/g, " ")} - ${item.type}`}
          </p>
          {!inbound && item.subject && (
            <p className="mt-1 truncate font-[family-name:var(--font-fraunces)] text-sm italic text-[#14182A]/80">
              {item.subject}
            </p>
          )}
          {inbound && item.intent && (
            <p className="mt-1 text-xs text-[#5C6472]">{item.intent.replace(/_/g, " ")}</p>
          )}
        </div>
        <span className="shrink-0 text-[10px] text-[#14182A]/35">
          {formatDateTime(item.timestamp)}
        </span>
      </div>
      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-lg border border-[#D9CFB5]/70 bg-white/70 p-3 font-[family-name:var(--font-geist-sans)] text-xs leading-relaxed text-[#14182A]/80">{item.body}</pre>
    </article>
  );
}

function activityLabel(signal: SignalLogRow): { label: string; detail: string | null } | null {
  if (signal.signal_type === "reply_received") {
    const intent = stringFromMetadata(signal.metadata, "intent");
    return {
      label: "Reply classified",
      detail: intent ? intent.replace(/_/g, " ") : null,
    };
  }

  if (signal.signal_type.startsWith("stage_")) {
    const fromStage = stringFromMetadata(signal.metadata, "fromStage");
    const toStage = stringFromMetadata(signal.metadata, "toStage");
    return {
      label: signal.signal_type.replace(/_/g, " "),
      detail: fromStage && toStage ? `${fromStage.replace(/_/g, " ")} -> ${toStage.replace(/_/g, " ")}` : null,
    };
  }

  if (signal.signal_type === "draft_skipped") {
    return { label: "Draft skipped", detail: stringFromMetadata(signal.metadata, "reason") };
  }

  return null;
}

function stringFromMetadata(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
