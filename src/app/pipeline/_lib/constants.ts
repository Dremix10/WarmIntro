import type { Stage, TierFilter } from "./types";

export const NEXT_ACTION: Record<Stage, string> = {
  draft: "Open in /today and approve to send.",
  sent: "Wait ~5 days. If no reply, queue a follow-up.",
  replied: "Reply within 24h. Suggest a 15-min coffee.",
  coffee: "Send a thank-you within 24h of the call.",
  referral: "Apply through their submission link. Mention them in the cover.",
  first_round: "Prep behaviorals + technicals. Thank them after.",
  superday: "Brief thank-you to each interviewer same day.",
  offer: "Negotiate. Don't accept the first number.",
  closed_lost: "Closed for now. Reopen it when the thread becomes useful again.",
};

export const STATIONS: Array<{
  stage: Exclude<Stage, "draft" | "closed_lost">;
  label: string;
  sub: string;
}> = [
  { stage: "sent", label: "Sent", sub: "draft -> out" },
  { stage: "replied", label: "Replied", sub: "+1 reply" },
  { stage: "coffee", label: "Coffee", sub: "scheduled" },
  { stage: "referral", label: "Referral", sub: "warm intro" },
  { stage: "first_round", label: "1st Round", sub: "interview" },
  { stage: "superday", label: "Superday", sub: "final" },
  { stage: "offer", label: "Offer", sub: "won" },
];

export const STAGE_LABEL: Record<Stage, string> = {
  draft: "Draft prepared",
  sent: "Email sent",
  replied: "Replied",
  coffee: "Coffee",
  referral: "Referral",
  first_round: "First round",
  superday: "Superday",
  offer: "Offer",
  closed_lost: "Closed",
};

export const STAGE_COLOR: Record<Stage, string> = {
  draft: "bg-[#EAE3D2] text-[#14182A]/70",
  sent: "bg-[#2E5A88]/15 text-[#2E5A88]",
  replied: "bg-[#E8B339]/20 text-[#9A7110]",
  coffee: "bg-[#E8B339]/30 text-[#9A7110]",
  referral: "bg-[#C86B4F]/20 text-[#C86B4F]",
  first_round: "bg-[#C86B4F]/30 text-[#C86B4F]",
  superday: "bg-[#C86B4F]/40 text-[#C86B4F]",
  offer: "bg-[#1B3B5F] text-white",
  closed_lost: "bg-[#5C6472]/20 text-[#5C6472]",
};

export const ADVANCEABLE: Stage[] = [
  "sent",
  "replied",
  "coffee",
  "referral",
  "first_round",
  "superday",
  "offer",
];

export const FIRM_LINE_COLORS = [
  "#1B3B5F",
  "#2E5A88",
  "#7B1F2C",
  "#C86B4F",
  "#5A3D5C",
  "#2D6E6A",
  "#E8B339",
];

export const TIER_FILTERS = [
  "all",
  "bulge_bracket",
  "elite_boutique",
  "middle_market",
] as const;

export function tierLabel(tier: TierFilter): string {
  if (tier === "all") return "All";
  if (tier === "bulge_bracket") return "BB";
  if (tier === "elite_boutique") return "EB";
  return "MM";
}
