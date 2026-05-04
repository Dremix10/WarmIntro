import { STATIONS, tierLabel } from "../_lib/constants";
import type { PipelineFirm, PipelineRow } from "../_lib/types";
import { Station } from "./Station";

export function FirmLine({
  firm,
  stationsByFirm,
  activeBankerId,
  onOpenBanker,
}: {
  firm: PipelineFirm;
  stationsByFirm: Map<string, Map<string, PipelineRow[]>>;
  activeBankerId: string | null;
  onOpenBanker: (bankerId: string) => void;
}) {
  const stationMap = stationsByFirm.get(firm.id);
  if (!stationMap) return null;

  return (
    <div
      className="relative grid h-[80px] items-center"
      style={{
        gridTemplateColumns: `140px repeat(${STATIONS.length}, minmax(0, 1fr))`,
        minWidth: "900px",
        color: firm.color,
      }}
    >
      <div className="pr-4 text-right">
        <div className="font-[family-name:var(--font-fraunces)] text-[14px] font-semibold leading-tight text-[#14182A]">
          {firm.name}
        </div>
        <div className="mt-[2px] text-[9px] font-bold uppercase tracking-[0.08em] text-[#8A8674]">
          {firm.tier ? tierLabel(firm.tier) : "Firm"}
        </div>
      </div>
      <svg
        className="pointer-events-none absolute"
        style={{ left: "140px", right: 0, top: 0, height: "80px" }}
        preserveAspectRatio="none"
        viewBox="0 0 100 80"
      >
        <path
          d="M 0 40 L 100 40"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {STATIONS.map((station) => (
        <Station
          key={station.stage}
          firmColor={firm.color}
          bankers={stationMap.get(station.stage) ?? []}
          onOpen={onOpenBanker}
          activeBankerId={activeBankerId}
        />
      ))}
    </div>
  );
}
