"use client";

import { useRouter } from "next/navigation";

const PIPELINE_STAGES = [
  { id: "sent", label: "Outreach Sent", icon: "\u2709\uFE0F" },
  { id: "replied", label: "Reply Received", icon: "\uD83D\uDCAC" },
  { id: "coffee", label: "Coffee Chat", icon: "\u2615" },
  { id: "referral", label: "Referral", icon: "\uD83E\uDD1D" },
];

function getNextAction(stage: string | undefined) {
  if (!stage) return { action: "reply_received" as const, nextStage: "replied", label: "Log Reply Received", xp: 25 };
  if (stage === "replied") return { action: "coffee_booked" as const, nextStage: "coffee", label: "Book Coffee Chat", xp: 50 };
  if (stage === "coffee") return { action: "referral_earned" as const, nextStage: "referral", label: "Got Referral!", xp: 100 };
  return null;
}

function isDone(stageId: string, currentStage: string | undefined): boolean {
  if (stageId === "sent") return true;
  const order = ["sent", "replied", "coffee", "referral"];
  const currentIdx = currentStage ? order.indexOf(currentStage) : -1;
  return order.indexOf(stageId) <= currentIdx;
}

export function PipelineProgress({
  stage,
  onAdvance,
}: {
  stage: string | undefined;
  onAdvance: (action: "reply_received" | "coffee_booked" | "referral_earned", nextStage: string) => void;
}) {
  const router = useRouter();
  const nextAction = getNextAction(stage);

  return (
    <div className="rounded-xl border border-[#D9CFB5] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[#8A8674] mb-3">Pipeline Progress</p>
      <div className="flex items-center gap-1">
        {PIPELINE_STAGES.map((s, i) => {
          const done = isDone(s.id, stage);
          return (
            <div key={s.id} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium w-full justify-center ${
                done ? "bg-[#F4EDDB] text-[#0F2A45] border border-[#D9CFB5]" : "bg-[#FBF7EC] text-[#8A8674] border border-[#ECE5D0]"
              }`}>
                <span>{done ? "\u2705" : s.icon}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < PIPELINE_STAGES.length - 1 && (
                <svg className="h-4 w-4 shrink-0 text-[#A8A494]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
      {nextAction && (
        <button
          type="button"
          onClick={() => onAdvance(nextAction.action, nextAction.nextStage)}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <span>{nextAction.label}</span>
          <span className="rounded bg-blue-500 px-1.5 py-0.5 text-[10px]">+{nextAction.xp} XP</span>
        </button>
      )}
      {stage && (
        <button
          type="button"
          onClick={() => router.push("/crm")}
          className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#D9CFB5] px-4 py-2 text-sm font-medium text-[#4A5260] hover:bg-[#FBF7EC] transition-colors"
        >
          View in CRM &rarr;
        </button>
      )}
      {stage === "referral" && (
        <div className="mt-2 text-center">
          <p className="text-sm font-semibold text-[#1B3B5F]">{"\uD83C\uDF89"} Full pipeline complete! Ready for interview.</p>
        </div>
      )}
    </div>
  );
}
