import { NEXT_ACTION, STAGE_COLOR, STAGE_LABEL } from "../_lib/constants";
import type { PipelineRow, Stage } from "../_lib/types";

export function PanelHeader({ row, onClose }: { row: PipelineRow; onClose: () => void }) {
  return (
    <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#D9CFB5] bg-white px-6 py-4">
      <div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STAGE_COLOR[row.stage]}`}
        >
          {STAGE_LABEL[row.stage]}
        </span>
        <h3 className="mt-2 font-[family-name:var(--font-fraunces)] text-2xl">
          {row.name}
        </h3>
        <p className="text-sm text-[#14182A]/60">
          {row.title}{row.firmName ? ` - ${row.firmName}` : ""}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-mt-1 text-2xl leading-none text-[#14182A]/40 hover:text-[#14182A]"
      >
        x
      </button>
    </div>
  );
}

export function NextMove({ stage }: { stage: Stage }) {
  return (
    <div className="rounded-xl border border-[#2E5A88]/20 bg-[#2E5A88]/5 p-4">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2E5A88]">
        Next move
      </p>
      <p className="text-[#14182A]">{NEXT_ACTION[stage]}</p>
    </div>
  );
}

export function ContactDetails({ row }: { row: PipelineRow }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#14182A]/50">
        Contact
      </p>
      <div className="space-y-1 text-xs">
        {row.email && (
          <p>
            <span className="text-[#14182A]/50">Email:</span>{" "}
            <code className="font-mono">{row.email}</code>
          </p>
        )}
        {row.linkedinUrl && (
          <p>
            <span className="text-[#14182A]/50">LinkedIn:</span>{" "}
            <a
              href={row.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="underline text-[#2E5A88] hover:text-[#1B3B5F]"
            >
              view profile
            </a>
          </p>
        )}
        {row.university && (
          <p><span className="text-[#14182A]/50">School:</span> {row.university}</p>
        )}
        {typeof row.warmth === "number" && (
          <p><span className="text-[#14182A]/50">Warmth:</span> {row.warmth}</p>
        )}
      </div>
    </div>
  );
}
