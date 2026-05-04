export type Stage =
  | "sent"
  | "replied"
  | "coffee"
  | "referral"
  | "first_round"
  | "superday"
  | "offer"
  | "closed_lost";

export type FirmTier = "bulge_bracket" | "elite_boutique" | "middle_market";
export type TierFilter = "all" | FirmTier;
export type WarmthFilter = "all" | "70" | "85";
export type VisualTier = "paper" | "aegean" | "ochre" | "gold";

export interface UserContext {
  university: string;
  graduationYear: number;
}

export interface DeckBanker {
  connectionId: string;
  bankerId: string;
  name: string;
  title: string | null;
  seniority: string | null;
  gradYear: number | null;
  university: string | null;
  firmId: string | null;
  firmName: string | null;
  firmTier: FirmTier | null;
  warmth: number;
  stage: Stage;
  sameSchool: boolean;
  closeGradYear: boolean;
  seniorRole: boolean;
}

export interface FirmDeck {
  firmId: string;
  firmName: string;
  firmTier: FirmTier | null;
  bankers: DeckBanker[];
  highestStage: Stage;
  histogram: number[];
}

export interface DraftRow {
  id: string;
  subject: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
}

