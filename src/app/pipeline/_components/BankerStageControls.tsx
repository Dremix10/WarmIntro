import type { ReactNode } from "react";
import { ADVANCEABLE, STAGE_LABEL } from "../_lib/constants";
import type { PipelineRow, Stage } from "../_lib/types";

export function BankerStageControls({
  row,
  onMove,
}: {
  row: PipelineRow;
  onMove: (rowId: string, stage: Stage) => void;
}) {
  if (row.stage === "draft") return <DraftNotice />;
  if (row.stage === "closed_lost") {
    return (
      <StageBox label="Closed">
        <button
          type="button"
          onClick={() => onMove(row.id, "sent")}
          className="rounded-full bg-[#1B3B5F] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#2E5A88]"
        >
          Restore to Sent
        </button>
      </StageBox>
    );
  }

  const idx = ADVANCEABLE.indexOf(row.stage);
  const next: Stage | null =
    idx >= 0 && idx < ADVANCEABLE.length - 1 ? ADVANCEABLE[idx + 1] : null;
  const prev: Stage | null = idx > 0 ? ADVANCEABLE[idx - 1] : null;

  return (
    <StageBox label="Stage">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => prev && onMove(row.id, prev)}
          disabled={!prev}
          className="text-[12px] text-[#14182A]/60 hover:text-[#14182A] disabled:opacity-30"
        >
          Back{prev ? ` to ${STAGE_LABEL[prev]}` : ""}
        </button>
        {next ? (
          <button
            type="button"
            onClick={() => onMove(row.id, next)}
            className="rounded-full bg-[#1B3B5F] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#2E5A88]"
          >
            Move to {STAGE_LABEL[next]}
          </button>
        ) : (
          <span className="text-[12px] font-semibold text-[#1B3B5F]">offer</span>
        )}
        <button
          type="button"
          onClick={() => onMove(row.id, "closed_lost")}
          className="ml-auto text-[11px] text-[#C86B4F]/70 hover:text-[#C86B4F]"
        >
          Close thread
        </button>
      </div>
    </StageBox>
  );
}

function DraftNotice() {
  return (
    <div className="rounded-xl border border-[#D9CFB5] bg-[#EAE3D2]/40 p-4 text-[12px] text-[#14182A]/70">
      <p>
        This banker is in your draft queue.{" "}
        <a href="/today" className="underline text-[#2E5A88]">
          Open in Today
        </a>{" "}
        to approve or skip.
      </p>
    </div>
  );
}

function StageBox({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#D9CFB5] bg-[#EAE3D2]/40 p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#14182A]/50">
        {label}
      </p>
      {children}
    </div>
  );
}
