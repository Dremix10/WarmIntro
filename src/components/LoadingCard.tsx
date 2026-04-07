export function LoadingCard({ message, count }: { message: string; count: number }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200 p-6">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
        <div>
          <p className="text-sm font-medium text-slate-700">{message}</p>
          <p className="text-xs text-slate-400 mt-0.5">This usually takes 5-10 seconds...</p>
        </div>
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-white border border-slate-100 p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-100 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
              <div className="h-3 w-48 rounded bg-slate-50 animate-pulse" />
              <div className="h-3 w-24 rounded bg-slate-50 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full rounded bg-slate-50 animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-slate-50 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
