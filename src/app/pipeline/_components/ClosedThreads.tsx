import type { PipelineRow, Stage } from "../_lib/types";

export function ClosedThreads({
  rows,
  onOpen,
  onRestore,
}: {
  rows: PipelineRow[];
  onOpen: (bankerId: string) => void;
  onRestore: (rowId: string, stage: Stage) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="mt-5 rounded-2xl border border-[#D9CFB5] bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#5C6472] font-semibold">
            Closed threads
          </p>
          <p className="text-sm text-[#14182A]/65">
            Parked bankers stay recoverable here.
          </p>
        </div>
        <span className="text-[11px] text-[#8A8674]">
          {rows.length} closed
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-[#ECE7DE] bg-[#FCFAF5] px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#14182A]">
                  {row.name}
                </p>
                <p className="truncate text-xs text-[#8A8674]">
                  {row.title ?? "Banker"}{row.firmName ? ` at ${row.firmName}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpen(row.bankerId)}
                className="shrink-0 text-[11px] text-[#2E5A88] hover:text-[#1B3B5F] hover:underline"
              >
                Details
              </button>
            </div>
            <button
              type="button"
              onClick={() => onRestore(row.id, "sent")}
              className="mt-2 rounded-full border border-[#D9CFB5] bg-white px-2.5 py-1 text-[11px] font-medium text-[#14182A]/70 hover:border-[#2E5A88] hover:text-[#1B3B5F]"
            >
              Restore to Sent
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
