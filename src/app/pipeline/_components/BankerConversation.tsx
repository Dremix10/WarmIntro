import type {
  DraftHistoryRow,
  SignalHistoryRow,
} from "../_lib/use-banker-history";

export function BankerConversation({
  drafts,
  signals,
  loading,
  error,
}: {
  drafts: DraftHistoryRow[];
  signals: SignalHistoryRow[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <p className="text-xs italic text-[#14182A]/50">Loading...</p>;
  if (error) return <p className="text-xs text-[#C86B4F]">{error}</p>;
  if (drafts.length === 0 && signals.length === 0) {
    return <p className="text-xs italic text-[#14182A]/50">No drafts or events yet.</p>;
  }

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#14182A]/50">
        Conversation
      </p>
      <div className="space-y-3">
        {drafts.map((draft) => (
          <DraftCard key={draft.id} draft={draft} />
        ))}
        {signals.length > 0 && <SignalList signals={signals} />}
      </div>
    </div>
  );
}

function DraftCard({ draft }: { draft: DraftHistoryRow }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        draft.sent_at
          ? "border-[#2E5A88]/20 bg-[#2E5A88]/5"
          : "border-[#D9CFB5] bg-[#EAE3D2]/40"
      }`}
    >
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#14182A]/60">
          {draft.sent_at
            ? `Sent ${formatDate(draft.sent_at)}`
            : `${draft.status.replace("_", " ")} - ${draft.type}`}
        </p>
        <p className="text-[10px] text-[#14182A]/40">{formatDate(draft.created_at)}</p>
      </div>
      {draft.subject && (
        <p className="mb-1 font-[family-name:var(--font-fraunces)] text-sm italic text-[#14182A]/80">
          {draft.subject}
        </p>
      )}
      <details className="text-xs text-[#14182A]/70">
        <summary className="cursor-pointer hover:underline">view body</summary>
        <pre className="mt-2 whitespace-pre-wrap font-[family-name:var(--font-geist-sans)] text-[#14182A]/80">
          {draft.body}
        </pre>
      </details>
    </div>
  );
}

function SignalList({ signals }: { signals: SignalHistoryRow[] }) {
  return (
    <div className="border-t border-[#D9CFB5] pt-2">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-[#14182A]/40">
        Activity log
      </p>
      <ul className="space-y-1 text-xs text-[#14182A]/60">
        {signals.map((signal, index) => (
          <li key={index} className="flex justify-between gap-2">
            <span>{signal.signal_type.replace(/_/g, " ")}</span>
            <span className="text-[#14182A]/35">{formatDate(signal.occurred_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
