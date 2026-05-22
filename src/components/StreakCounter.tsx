"use client";

export function StreakCounter({ streak }: { streak: number }) {
  return (
    <div className="rounded-2xl bg-white border border-[#ECE5D0] shadow-sm px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#14182A]">Daily Streak</p>
          <p className="text-xs text-[#8A8674]">Keep networking every day!</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-2xl">&#x1F525;</span>
          <span className="text-2xl font-bold text-[#E8B339]">{streak}</span>
          <span className="text-xs font-medium text-[#8A8674]">{streak === 1 ? "day" : "days"}</span>
        </div>
      </div>

      {/* Streak dots */}
      <div className="flex items-center gap-1 mt-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i < streak ? "bg-[#F0C865]" : "bg-[#F4EDDB]"
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-[#A8A494]">Mon</span>
        <span className="text-[10px] text-[#A8A494]">Sun</span>
      </div>
    </div>
  );
}
