export function PipelineErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#C86B4F]/35 bg-white p-8">
      <p className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">
        Pipeline could not load.
      </p>
      <p className="text-sm text-[#14182A]/70 mb-4">
        Alma hit a data query error instead of an empty pipeline. That usually
        means a Supabase relationship, column, or policy changed.
      </p>
      <pre className="whitespace-pre-wrap rounded-xl bg-[#14182A] p-3 text-xs text-white/90 mb-4">
        {error}
      </pre>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-[#1B3B5F] px-4 py-2 text-sm font-medium text-white hover:bg-[#2E5A88]"
      >
        Retry
      </button>
    </div>
  );
}
