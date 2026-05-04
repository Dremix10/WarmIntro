"use client";

import { useBankerHistory } from "../_lib/use-banker-history";
import type { PipelineRow, Stage } from "../_lib/types";
import { BankerConversation } from "./BankerConversation";
import { ContactDetails, NextMove, PanelHeader } from "./BankerPanelSections";
import { BankerStageControls } from "./BankerStageControls";

export function BankerDetailPanel({
  bankerId,
  row,
  onMove,
  onClose,
}: {
  bankerId: string;
  row: PipelineRow | null;
  onMove: (rowId: string, stage: Stage) => void;
  onClose: () => void;
}) {
  const { drafts, signals, loading, error } = useBankerHistory(bankerId);
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-[#14182A]/40 backdrop-blur-sm" />
      <aside
        className="w-full overflow-y-auto border-l border-[#D9CFB5] bg-white shadow-2xl sm:w-[480px]"
        onClick={(event) => event.stopPropagation()}
      >
        <PanelHeader row={row} onClose={onClose} />
        <div className="space-y-5 px-6 py-5 text-sm">
          <NextMove stage={row.stage} />
          <BankerStageControls row={row} onMove={onMove} />
          <ContactDetails row={row} />
          <BankerConversation
            drafts={drafts}
            signals={signals}
            loading={loading}
            error={error}
          />
        </div>
      </aside>
    </div>
  );
}
