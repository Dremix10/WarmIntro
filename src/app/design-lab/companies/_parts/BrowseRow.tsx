type Browse = {
  name: string;
  industry: string;
  alumni: number;
  roles: number;
};

export function BrowseRow({ b }: { b: Browse }) {
  return (
    <div className="grid cursor-pointer grid-cols-[32px_1fr_160px_100px_110px_auto] items-center gap-4 px-5 py-3 transition-colors hover:bg-[#FBF7EC]">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F4EDDB] text-xs font-[family-name:var(--font-fraunces)] text-[#1B3B5F]">
        {b.name[0]}
      </div>
      <p className="truncate text-sm font-medium text-[#14182A]">{b.name}</p>
      <p className="truncate text-xs text-[#5C6472]">{b.industry}</p>
      <p className="text-right text-xs tabular-nums text-[#14182A]">{b.alumni}</p>
      <p className="text-right text-xs tabular-nums text-[#14182A]">{b.roles}</p>
      <button
        type="button"
        className="rounded-full border border-[#D9CFB5] px-3 py-1 text-[11px] font-medium text-[#1B3B5F] transition-colors hover:border-[#2E5A88] hover:bg-[#F4EDDB]"
      >
        + Add
      </button>
    </div>
  );
}
