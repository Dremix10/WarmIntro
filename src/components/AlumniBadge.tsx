"use client";

export function AlumniBadge({ count, university }: { count: number; university: string }) {
  const shortName = university.split(" ")[0];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      <span className="text-emerald-500">&#x1F393;</span>
      {count} {shortName} {count === 1 ? "alum" : "alumni"}
    </span>
  );
}
