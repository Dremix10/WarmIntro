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
  const stationRows = STATIONS.map((station, index) => ({
    station,
    index,
    bankers: stationMap.get(station.stage) ?? [],
  }));
  const highestIdx = stationRows.reduce(
    (highest, entry) => (entry.bankers.length > 0 ? entry.index : highest),
    -1,
  );
  const tickX =
    highestIdx >= 0 ? ((highestIdx + 0.5) * 100) / STATIONS.length : 0;
  const fillEnd = highestIdx === STATIONS.length - 1 ? 100 : Math.max(0, tickX);
  const atFinal = highestIdx === STATIONS.length - 1;

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
          stroke="#D9CFB5"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="1.5 2.5"
          opacity="0.85"
          fill="none"
        />
        {fillEnd > 0 && (
          <path
            className="alma-fill-grow"
            d={`M 0 40 L ${fillEnd} 40`}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            pathLength={1}
          />
        )}
        {!atFinal && fillEnd < 100 && (
          <path
            className="alma-line-flow"
            d={`M ${fillEnd} 40 L 100 40`}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
        )}
        {fillEnd > 0 && !atFinal && (
          <circle
            cx={fillEnd}
            cy={40}
            r={2.4}
            fill="currentColor"
            className="alma-fill-tip"
          />
        )}
      </svg>
      {stationRows.map(({ station, index, bankers }) => (
        <Station
          key={station.stage}
          firmColor={firm.color}
          tickReached={index <= highestIdx}
          bankers={bankers}
          onOpen={onOpenBanker}
          activeBankerId={activeBankerId}
        />
      ))}
    </div>
  );
}
