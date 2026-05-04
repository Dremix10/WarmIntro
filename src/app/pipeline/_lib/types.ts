export type Stage =
  | "draft"
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

export interface PipelineRow {
  id: string;
  bankerId: string;
  name: string;
  title: string | null;
  firmId: string | null;
  firmName: string | null;
  firmTier: FirmTier | null;
  university: string | null;
  linkedinUrl: string | null;
  email: string | null;
  warmth: number | null;
  stage: Stage;
  updatedAt: string;
}

export interface PipelineFirm {
  id: string;
  name: string;
  tier: FirmTier | null;
  color: string;
}

export interface ToastMsg {
  id: number;
  message: string;
  kind: "error" | "info";
}
