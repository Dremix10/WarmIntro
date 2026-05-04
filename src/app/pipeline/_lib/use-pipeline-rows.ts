"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { STAGE_LABEL } from "./constants";
import { loadPipelineRows } from "./load-pipeline-rows";
import type { PipelineRow, Stage, ToastMsg } from "./types";

export function usePipelineRows(
  userId: string | undefined,
  pushToast: (message: string, kind?: ToastMsg["kind"]) => void,
) {
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await loadPipelineRows(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) void reload();
  }, [userId, reload]);

  const moveStage = useCallback(
    async (rowId: string, newStage: Stage) => {
      const target = rows.find((row) => row.id === rowId);
      if (!target || target.stage === "draft") return;
      const prevStage = target.stage;
      const nowIso = new Date().toISOString();

      setRows((current) =>
        current.map((row) =>
          row.id === rowId ? { ...row, stage: newStage, updatedAt: nowIso } : row,
        ),
      );

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`/api/connections/${rowId}/stage`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ""}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ stage: newStage }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }

        if (newStage === "closed_lost") {
          pushToast(`${target.name} moved to Closed. Restore it below anytime.`, "info");
        } else if (prevStage === "closed_lost") {
          pushToast(`${target.name} reopened at ${STAGE_LABEL[newStage]}.`, "info");
        }
      } catch (err) {
        setRows((current) =>
          current.map((row) =>
            row.id === rowId ? { ...row, stage: prevStage, updatedAt: target.updatedAt } : row,
          ),
        );
        pushToast(
          `Couldn't move ${target.name}: ${err instanceof Error ? err.message : "unknown error"}`,
        );
      }
    },
    [pushToast, rows],
  );

  return { rows, loading, error, reload, moveStage };
}
