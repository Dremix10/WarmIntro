// Alma IB types — bank hierarchy, agents, trust gradient, drafts, signals
// Complements legacy types in ./types.ts (kept for pre-pivot routes)

export type FirmTier = "bulge_bracket" | "elite_boutique" | "middle_market";
export type GroupKind = "coverage" | "product" | "region";
export type BankerSeniority = "analyst" | "associate" | "vp" | "director" | "md";

export interface Firm {
  id: string;
  name: string;
  tier: FirmTier;
  logoUrl?: string;
  domain: string;
  hqCity?: string;
}

export interface Group {
  id: string;
  firmId: string;
  name: string;
  kind: GroupKind;
  parentGroupId?: string;
}

export interface Banker {
  id: string;
  firmId?: string;
  groupId?: string;
  name: string;
  title: string;
  seniority?: BankerSeniority;
  gradYear?: number;
  university?: string;
  linkedinUrl?: string;
  email?: string;
  emailVerified: boolean;
  source: "hunter" | "serper" | "rice_directory" | "brown_directory" | "user_added" | "manual_seed" | "curator";
}

export interface BankerProfile {
  bankerId: string;
  education: Array<{ school: string; degree?: string; year?: number; activities?: string[] }>;
  pastPositions: Array<{ firm: string; role: string; from?: string; to?: string }>;
  aboutSection?: string;
  recentPosts: Array<{ url?: string; content: string; engagement?: number; postedAt?: string }>;
  recentDealsMentioned: Array<{ name: string; mentionedIn?: string }>;
  volunteering: Array<{ org: string; role?: string }>;
  languages: string[];
  certifications: Array<{ name: string; issuer?: string }>;
  interests: string[];
  scrapedAt?: string;
  scrapeSource?: "serper" | "manual";
}

export interface BankerDeal {
  id: string;
  bankerId: string;
  dealName: string;
  targetCompany?: string;
  acquirerCompany?: string;
  valueUsd?: number;
  closedOn?: string;
  description?: string;
  source: "seed" | "mergermarket" | "press" | "banker_linkedin" | "user_reply_extraction" | "watcher_signal" | "curator";
  confidence: number;
}

// ===== Trust gradient =====

export type TrustLevel = "C" | "B" | "A";
export type TrustCapability = "send_new_email" | "send_followup" | "send_reply";

export interface TrustLevels {
  userId: string;
  sendNewEmail: TrustLevel;
  sendFollowup: TrustLevel;
  sendReply: TrustLevel;
  approvalsCountNew: number;
  approvalsCountFollowup: number;
  approvalsCountReply: number;
  stopsCount: number;
  autoGraduate: boolean;
  preferredSendTime: string; // "HH:MM"
  preferredTimezone: string;
  nightPreviewEnabled: boolean;
  tomorrowOverride?: TomorrowOverride | null;
}

export interface TomorrowOverride {
  sendTime?: string;
  trustLevel?: TrustLevel;
  skipDay?: boolean;
  extraDrafts?: number;
  forceTrustCapability?: TrustCapability;
}

// ===== Draft + Critic =====

export type DraftType = "cold" | "followup" | "reply" | "thank_you";
export type DraftStatus = "pending_critic" | "needs_revision" | "approved" | "sent" | "skipped" | "edited_by_user" | "rejected_unresolvable";

export interface Draft {
  id: string;
  userId: string;
  bankerId?: string;
  connectionId?: string;
  type: DraftType;
  subject?: string;
  body: string;
  guardrailFlags: Record<string, unknown>;
  status: DraftStatus;
  iterationCount: number;
  criticReviewId?: string;
  scheduledSendAt?: string;
  sentAt?: string;
  sentMessageId?: string;
  userEditedBody?: string;
  createdAt: string;
}

export interface CriticScores {
  specificity: number;
  voiceMatch: number;
  guardrails: number;
  sharedGround: number;
}

export type CriticVerdict = "approve" | "reject" | "escalate_to_planner";

export interface CriticReview {
  id: string;
  draftId: string;
  scores: CriticScores;
  overallScore: number;
  verdict: CriticVerdict;
  feedback?: string;
  suggestedRevision?: string;
  createdAt: string;
}

// ===== Common ground (Correspondent tool output) =====

export type CommonGroundType =
  | "shared_major"
  | "shared_club"
  | "shared_city"
  | "shared_hobby"
  | "banker_recent_post"
  | "banker_deal_area"
  | "shared_alma_mater_of_past_position"
  | "shared_coursework";

export interface CommonGroundAnchor {
  type: CommonGroundType;
  detail: string;
  confidence: number;
  openerAngle: string;
}

// ===== Agent activity =====

export type AgentName = "planner" | "researcher" | "correspondent" | "critic" | "watcher" | "curator" | "scout";

export interface AgentRun {
  id: string;
  userId?: string;
  agent: AgentName;
  triggeredBy: "cron" | "event" | "user_command" | "agent_dispatch";
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  durationMs?: number;
  claudeTokensUsed?: number;
  error?: string;
  startedAt: string;
  endedAt?: string;
}

// ===== Signals + flywheel =====

export interface Signal {
  id: string;
  userId?: string;
  bankerId?: string;
  connectionId?: string;
  draftId?: string;
  agent?: AgentName;
  signalType: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
}

export interface ScoringWeights {
  version: number;
  weights: {
    bankerResponseRate?: Record<string, number>;
    openerConversion?: Record<string, number>;
    groupActivityTier?: Record<string, number>;
    userCohortPatternMatch?: Record<string, number>;
  };
  isActive: boolean;
  producedAt: string;
}

export interface CriticCalibration {
  version: number;
  bucketStats: Array<{
    scoreBucket: "0-4" | "5-6" | "7-8" | "9-10";
    replyRate: number;
    coffeeRate: number;
    referralRate: number;
    sampleSize: number;
  }>;
  axisCorrelations: {
    specificity: number;
    voiceMatch: number;
    guardrails: number;
    sharedGround: number;
  };
  notes?: string;
  computedAt: string;
}

export interface FlywheelRelease {
  id: string;
  weekOf: string;
  headline: string;
  changes: Record<string, unknown>;
  scoringWeightsVersion?: number;
  criticCalibrationVersion?: number;
  publishedAt: string;
}

// ===== Extended profile (v2 — superset of UserProfile from ./types.ts) =====

export interface AlmaUserProfile {
  id: string;
  name: string;
  email?: string;
  university: string;
  graduationYear: number;
  major: string;
  skills: string[];
  experience: Array<{ company: string; role: string; duration: string; highlights: string[] }>;
  targetFirms: string[]; // firm IDs
  targetGroups: string[]; // "tmt","m-and-a", etc.
  warmHints: string[];
  storyOneLiner?: string;
  resumeText: string;
  gmailConnectedAt?: string;
  gmailEmail?: string;
}

// ===== Pipeline stages (IB-specific) =====

export type IbStage = "sent" | "replied" | "coffee" | "referral" | "first_round" | "superday" | "offer" | "closed_lost";

export const IB_STAGES: IbStage[] = ["sent", "replied", "coffee", "referral", "first_round", "superday", "offer", "closed_lost"];
