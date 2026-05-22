import type { Stage, VisualTier } from "./types";

export const STAGE_ORDER: Exclude<Stage, "closed_lost">[] = [
  "sent",
  "replied",
  "coffee",
  "referral",
  "first_round",
  "superday",
  "offer",
];

export const STAGE_ROMAN: Record<Stage, string> = {
  sent: "I",
  replied: "II",
  coffee: "III",
  referral: "IV",
  first_round: "V",
  superday: "VI",
  offer: "VII",
  closed_lost: "-",
};

export const STAGE_NAME: Record<Stage, string> = {
  sent: "Sent",
  replied: "Replied",
  coffee: "Coffee",
  referral: "Referral",
  first_round: "1st Round",
  superday: "Superday",
  offer: "Offer",
  closed_lost: "Closed",
};

export const STAGE_TIER: Record<Stage, VisualTier> = {
  sent: "paper",
  replied: "paper",
  coffee: "aegean",
  referral: "ochre",
  first_round: "gold",
  superday: "gold",
  offer: "gold",
  closed_lost: "paper",
};

export const FIRM_COLORS = [
  "#1B3B5F",
  "#2E5A88",
  "#7B1F2C",
  "#C86B4F",
  "#5A3D5C",
  "#2D6E6A",
];

