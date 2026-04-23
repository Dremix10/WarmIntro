// Alma IB constants — coverage/product groups, tiers, targets

import type { FirmTier } from "./ib-types";

export const COVERAGE_GROUPS = [
  "tmt",
  "healthcare",
  "consumer",
  "industrials",
  "fig",
  "energy",
  "real_estate",
  "sponsors",
] as const;

export const COVERAGE_GROUP_LABELS: Record<(typeof COVERAGE_GROUPS)[number], string> = {
  tmt: "TMT",
  healthcare: "Healthcare",
  consumer: "Consumer",
  industrials: "Industrials",
  fig: "FIG",
  energy: "Energy",
  real_estate: "Real Estate",
  sponsors: "Sponsors",
};

export const PRODUCT_GROUPS = ["m_and_a", "levfin", "restructuring", "ecm", "dcm"] as const;

export const PRODUCT_GROUP_LABELS: Record<(typeof PRODUCT_GROUPS)[number], string> = {
  m_and_a: "M&A",
  levfin: "LevFin",
  restructuring: "Restructuring",
  ecm: "ECM",
  dcm: "DCM",
};

export const ALL_GROUPS = [...COVERAGE_GROUPS, ...PRODUCT_GROUPS] as const;

export const TIER_LABELS: Record<FirmTier, string> = {
  bulge_bracket: "Bulge Bracket",
  elite_boutique: "Elite Boutique",
  middle_market: "Middle Market",
};

// IB funnel math — 16-week cycle (cofounder's)
export const IB_FUNNEL_TARGETS = {
  calls: 120,
  responses: 40,
  coffees: 20,
  referrals: 8,
  firstRounds: 4,
  superdays: 2,
  offers: 1,
};

// Stage XP values (carried forward from WarmIntro)
export const STAGE_XP: Record<string, number> = {
  sent: 10,
  replied: 25,
  coffee: 50,
  referral: 100,
  first_round: 150,
  superday: 250,
  offer: 500,
};

// Trust-gradient graduation thresholds
export const TRUST_GRADUATION = {
  cToB_approvals: 5, // approvals needed to auto-graduate C -> B
  bToA_approvals: 10, // approvals (no STOP) needed to auto-graduate B -> A
  demotion_days: 7, // days before re-eligibility after auto-demote
  previewWindowMin: 30, // B-mode preview window before auto-send
} as const;

// Copy guardrails (Correspondent)
export const BANNED_WORDS = [
  "cognizant",
  "leverage",
  "endeavor",
  "synergy",
  "furthermore",
  "accordingly",
  "aforementioned",
  "herein",
  "wherewith",
  "whereby",
];

export const BANNED_PHRASES = [
  "i hope this email finds you well",
  "i hope this finds you well",
  "reaching out to",
  "please find attached",
  "at your earliest convenience",
];
