// Lightweight skeleton primitives for modern loading states.
// Layout-mimicking placeholders > spinning rings.

export function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-[#D9CFB5]/50 animate-pulse ${className}`} />;
}

/** Top-of-page loading bar that slides in. */
export function LoadingBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden">
      <div className="h-full w-1/3 bg-[#2E5A88] animate-loading-bar" />
    </div>
  );
}

/** Skeleton for a single banker card on /today. */
export function SkeletonDraftCard() {
  return (
    <div className="rounded-2xl bg-white border border-[#D9CFB5] p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 space-y-2">
          <SkeletonBox className="h-4 w-2/5" />
          <SkeletonBox className="h-3 w-3/5" />
        </div>
        <SkeletonBox className="h-5 w-20" />
      </div>
      <SkeletonBox className="h-4 w-3/4 mb-1" />
      <SkeletonBox className="h-3 w-full mb-1" />
      <SkeletonBox className="h-3 w-5/6" />
    </div>
  );
}

/** /today page-level skeleton — header + trust card + 3 draft cards. */
export function SkeletonToday() {
  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A]">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <SkeletonBox className="h-3 w-12 mb-2" />
        <SkeletonBox className="h-10 w-48 mb-3" />
        <SkeletonBox className="h-4 w-64 mb-8" />

        <div className="rounded-2xl bg-white p-5 border border-[#D9CFB5] mb-8">
          <SkeletonBox className="h-3 w-12 mb-2" />
          <SkeletonBox className="h-5 w-1/2 mb-3" />
          <SkeletonBox className="h-3 w-3/4 mb-4" />
          <div className="flex gap-2">
            <SkeletonBox className="h-9 flex-1" />
            <SkeletonBox className="h-9 flex-1" />
            <SkeletonBox className="h-9 flex-1" />
          </div>
        </div>

        <div className="space-y-3">
          <SkeletonDraftCard />
          <SkeletonDraftCard />
          <SkeletonDraftCard />
        </div>
      </div>
    </div>
  );
}

/** /agents skeleton — header + 6 panels. */
export function SkeletonAgents() {
  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A]">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <SkeletonBox className="h-3 w-32 mb-2" />
        <SkeletonBox className="h-10 w-48 mb-3" />
        <SkeletonBox className="h-4 w-3/4 mb-8" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-[#D9CFB5] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#D9CFB5]">
                <SkeletonBox className="h-5 w-24 mb-1" />
                <SkeletonBox className="h-3 w-32" />
              </div>
              <div className="p-3 space-y-2">
                <SkeletonBox className="h-8 w-full" />
                <SkeletonBox className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Generic short-page skeleton — for /account, /account/privacy, etc. */
export function SkeletonPage() {
  return (
    <div className="min-h-screen bg-[#EAE3D2] text-[#14182A]">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-4">
        <SkeletonBox className="h-3 w-20" />
        <SkeletonBox className="h-10 w-48" />
        <div className="rounded-2xl bg-white p-5 border border-[#D9CFB5] space-y-3 mt-6">
          <SkeletonBox className="h-4 w-1/2" />
          <SkeletonBox className="h-4 w-3/4" />
          <SkeletonBox className="h-4 w-1/3" />
          <SkeletonBox className="h-4 w-2/3" />
        </div>
        <div className="rounded-2xl bg-white p-5 border border-[#D9CFB5] space-y-3">
          <SkeletonBox className="h-4 w-2/5" />
          <SkeletonBox className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
