import { FIRM_LINE_COLORS, STATIONS } from "./constants";
import { priorityScore, statusFor } from "./pipeline-utils";
import type { PipelineFirm, PipelineRow, TierFilter } from "./types";

export interface PipelineMapView {
  firms: PipelineFirm[];
  stationsByFirm: Map<string, Map<string, PipelineRow[]>>;
  attentionCount: number;
}

export function buildMapView(
  rows: PipelineRow[],
  tierFilter: TierFilter,
): PipelineMapView {
  const filtered = rows.filter((row) => {
    if (row.stage === "draft" || row.stage === "closed_lost") return false;
    if (tierFilter !== "all" && row.firmTier !== tierFilter) return false;
    return row.firmId !== null;
  });
  const firmMap = new Map<string, PipelineFirm>();
  let colorIdx = 0;
  for (const row of filtered) {
    if (!row.firmId || firmMap.has(row.firmId)) continue;
    firmMap.set(row.firmId, {
      id: row.firmId,
      name: row.firmName ?? "Unknown firm",
      tier: row.firmTier,
      color: FIRM_LINE_COLORS[colorIdx % FIRM_LINE_COLORS.length],
    });
    colorIdx++;
  }

  const grid = new Map<string, Map<string, PipelineRow[]>>();
  for (const firm of firmMap.values()) {
    const stationMap = new Map<string, PipelineRow[]>();
    for (const station of STATIONS) stationMap.set(station.stage, []);
    grid.set(firm.id, stationMap);
  }
  for (const row of filtered) grid.get(row.firmId!)?.get(row.stage)?.push(row);
  for (const stationMap of grid.values()) {
    for (const bucket of stationMap.values()) {
      bucket.sort((a, b) => priorityScore(b) - priorityScore(a));
    }
  }

  return {
    firms: Array.from(firmMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    stationsByFirm: grid,
    attentionCount: filtered.filter((row) => statusFor(row) !== null).length,
  };
}
