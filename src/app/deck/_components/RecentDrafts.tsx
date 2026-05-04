import type { DraftRow } from "../_lib/types";

export function RecentDrafts({
  loading,
  error,
  drafts,
}: {
  loading: boolean;
  error: string | null;
  drafts: DraftRow[];
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#14182A]/50">
        Recent drafts
      </p>
      {loading ? (
        <p className="text-xs italic text-[#14182A]/50">Loading...</p>
      ) : error ? (
        <p className="text-xs text-[#C86B4F]">Could not load drafts: {error}</p>
      ) : drafts.length === 0 ? (
        <p className="text-xs italic text-[#14182A]/50">No drafts yet.</p>
      ) : (
        <ul className="space-y-1.5 text-[12px]">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className="flex items-baseline justify-between gap-2 border-b border-[#ECE7DE] pb-1.5 last:border-b-0"
            >
              <span className="truncate font-[family-name:var(--font-fraunces)] italic text-[#14182A]/80">
                {draft.subject ?? "(no subject)"}
              </span>
              <span className="shrink-0 text-[10px] text-[#8A8674] tabular-nums">
                {draft.sent_at ? formatSentDate(draft.sent_at) : draft.status.replace("_", " ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatSentDate(value: string): string {
  return `sent ${new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;
}

