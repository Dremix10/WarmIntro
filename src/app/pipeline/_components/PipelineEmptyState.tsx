export function PipelineEmptyState() {
  return (
    <div className="rounded-2xl bg-white p-10 border border-[#D9CFB5] text-center">
      <p className="font-[family-name:var(--font-fraunces)] text-2xl mb-2">
        No pipeline yet.
      </p>
      <p className="text-sm text-[#14182A]/70 mb-5">
        Run Alma from{" "}
        <a href="/today" className="underline text-[#2E5A88]">
          Today
        </a>{" "}
        to draft your first outreach. Bankers appear on the map as soon as
        they&apos;re sent.
      </p>
    </div>
  );
}
