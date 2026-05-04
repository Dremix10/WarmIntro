export function DeckErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#C86B4F]/30 bg-white p-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#C86B4F]">
        Deck could not load
      </p>
      <p className="mb-4 text-sm leading-relaxed text-[#14182A]/70">
        Alma hit a data query error instead of showing a false empty deck.
      </p>
      <pre className="mb-5 overflow-x-auto rounded-xl bg-[#14182A] p-4 text-xs text-white">
        {error}
      </pre>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-[#1B3B5F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2E5A88]"
      >
        Try again
      </button>
    </div>
  );
}

