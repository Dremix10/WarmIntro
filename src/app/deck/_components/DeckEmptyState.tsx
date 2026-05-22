export function DeckEmptyState() {
  return (
    <div className="rounded-2xl border border-[#D9CFB5] bg-white p-10 text-center">
      <p className="mb-2 font-[family-name:var(--font-fraunces)] text-2xl">
        Your deck is empty.
      </p>
      <p className="mb-5 text-sm text-[#14182A]/70">
        Run Alma from{" "}
        <a href="/today" className="text-[#2E5A88] underline">
          Today
        </a>{" "}
        to draft your first outreach. Every banker Alma reaches becomes a card
        here.
      </p>
      <a
        href="/today"
        className="inline-block rounded-xl bg-[#2E5A88] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1B3B5F]"
      >
        Go to Today
      </a>
    </div>
  );
}

