import { STAGE_NAME, STAGE_ORDER, STAGE_ROMAN } from "../_lib/constants";

export function LevelsScale() {
  return (
    <div className="mb-6 rounded-xl border border-[#ECE7DE] bg-gradient-to-b from-white/55 to-transparent px-4 py-2.5">
      <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden">
        <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] text-[#5C6472]">
          Levels
        </span>
        {STAGE_ORDER.map((stage, index) => (
          <span key={stage} className="contents">
            <span className="flex shrink-0 items-baseline gap-1 text-[11px] text-[#5C6472]">
              <span className="font-[family-name:var(--font-fraunces)] text-[12px] font-semibold text-[#14182A]">
                {STAGE_ROMAN[stage]}
              </span>
              {STAGE_NAME[stage]}
            </span>
            {index < STAGE_ORDER.length - 1 && (
              <span className="mx-0.5 shrink-0 text-[11px] text-[#8A8674]" aria-hidden>
                →
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

