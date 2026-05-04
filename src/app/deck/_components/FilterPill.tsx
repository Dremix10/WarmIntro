import type { ReactNode } from "react";

export function FilterPill({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "border-[#1B3B5F] bg-[#1B3B5F] text-white"
          : "border-[#D9CFB5] bg-white text-[#5C6472] hover:border-[#2E5A88] hover:text-[#1B3B5F]"
      }`}
    >
      {children}
      {typeof count === "number" && (
        <span className={`ml-1.5 ${active ? "text-white/70" : "text-[#8A8674]"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

