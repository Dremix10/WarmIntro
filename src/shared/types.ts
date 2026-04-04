// ===== USER PROFILE =====
export interface UserProfile {
  name: string;
  university: string;
  graduationYear: number;
  major: string;
  skills: string[];
  experience: WorkExperience[];
  targetIndustries: string[];
  targetRoles: string[];
  resumeText: string;
}

export interface WorkExperience {
  company: string;
  role: string;
  duration: string;
  highlights: string[];
}

// ===== COMPANIES & INTERNSHIPS =====
export interface Company {
  id: string;
  name: string;
  industry: string;
  location: string;
  size: "startup" | "mid" | "enterprise";
  description: string;
  logoPlaceholder: string;
  alumniCount: number;
  warmthScore: number;
  openInternships: Internship[];
}

export interface Internship {
  id: string;
  companyId: string;
  title: string;
  location: string;
  type: "summer" | "fall" | "spring" | "co-op";
  description: string;
  requirements: string[];
  matchScore: number;
}

// ===== ALUMNI NETWORK =====
export interface Alumni {
  id: string;
  name: string;
  university: string;
  graduationYear: number;
  major: string;
  currentCompany: string;
  currentRole: string;
  linkedinUrl: string;
  connectionStrength: "strong" | "medium" | "weak";
  sharedBackground: string[];
}

export interface WarmPath {
  alumni: Alumni;
  narrative: string;
  suggestedOpener: string;
  warmthScore: number;
}

// ===== OUTREACH =====
export interface OutreachDraft {
  id: string;
  alumniId: string;
  companyId: string;
  subject: string;
  body: string;
  channel: "email" | "linkedin";
  tone: "professional" | "casual" | "warm";
}

// ===== FUNNEL =====
export interface FunnelStage {
  id: string;
  name: string;
  targetCount: number;
  currentCount: number;
  conversionRate: number;
  color: string;
  icon: string;
}

export interface FunnelState {
  stages: FunnelStage[];
  totalOutreachNeeded: number;
  totalOutreachDone: number;
  estimatedOffers: number;
  weekNumber: number;
}

// ===== GAMIFICATION =====
export interface GameState {
  xp: number;
  level: number;
  levelName: string;
  streak: number;
  badges: Badge[];
  recentActions: GameAction[];
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
}

export interface GameAction {
  type: "outreach_sent" | "reply_received" | "coffee_booked" | "referral_earned";
  xpGained: number;
  description: string;
  timestamp: string;
}

// ===== API CONTRACTS =====
export interface ParseResumeRequest {
  resumeText: string;
  university: string;
}
export interface ParseResumeResponse {
  profile: UserProfile;
}

export interface FindCompaniesRequest {
  industries: string[];
  university: string;
  skills: string[];
  roles: string[];
}
export interface FindCompaniesResponse {
  companies: Company[];
}

export interface FindAlumniRequest {
  companyId: string;
  university: string;
  userMajor: string;
  userGradYear: number;
}
export interface FindAlumniResponse {
  alumni: Alumni[];
  warmPaths: WarmPath[];
}

export interface GenerateOutreachRequest {
  userProfile: UserProfile;
  alumni: Alumni;
  company: Company;
  tone: "professional" | "casual" | "warm";
}
export interface GenerateOutreachResponse {
  drafts: OutreachDraft[];
}

export interface UpdateFunnelRequest {
  action: GameAction["type"];
  companyId: string;
  alumniId?: string;
}
export interface UpdateFunnelResponse {
  funnel: FunnelState;
  gameState: GameState;
  xpGained: number;
  newBadges: Badge[];
}
