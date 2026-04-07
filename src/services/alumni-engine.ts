import type { Alumni, WarmPath } from "@/shared/types";
import alumniData from "@/data/alumni.json";
import companiesData from "@/data/companies.json";
import emailDomains from "@/data/email-domains.json";
import { askClaudeJSON } from "./claude";
import { findRealAlumni } from "./linkedin-search";

interface AlumniData {
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

interface CompanyData {
  id: string;
  name: string;
}

const allAlumni = alumniData as AlumniData[];
const allCompanies = companiesData as CompanyData[];
const domains = emailDomains as Record<string, string>;

const WARMTH_BASE = 30;
const WARMTH_SAME_MAJOR = 20;
const WARMTH_CLOSE_GRAD = 15;
const WARMTH_MID_GRAD = 10;
const WARMTH_PER_CLUB = 10;
const WARMTH_MAX_CLUBS = 30;
const WARMTH_SAME_CITY = 5;
const WARMTH_SENIOR_ROLE = 5;

function computeWarmthScore(
  alumni: AlumniData,
  userMajor: string,
  userGradYear: number
): number {
  let score = WARMTH_BASE;

  if (alumni.major.toLowerCase() === userMajor.toLowerCase()) {
    score += WARMTH_SAME_MAJOR;
  }

  const yearDiff = Math.abs(alumni.graduationYear - userGradYear);
  if (yearDiff <= 5) score += WARMTH_CLOSE_GRAD;
  else if (yearDiff <= 10) score += WARMTH_MID_GRAD;

  const clubPoints = alumni.sharedBackground.filter(
    (bg) =>
      bg.includes("Club") ||
      bg.includes("Council") ||
      bg.includes("Society")
  ).length;
  score += Math.min(clubPoints * WARMTH_PER_CLUB, WARMTH_MAX_CLUBS);

  if (
    alumni.sharedBackground.some(
      (bg) => bg.toLowerCase().includes("houston") || bg.includes("resident")
    )
  ) {
    score += WARMTH_SAME_CITY;
  }

  const seniorTitles = ["senior", "staff", "principal", "director", "manager"];
  if (seniorTitles.some((t) => alumni.currentRole.toLowerCase().includes(t))) {
    score += WARMTH_SENIOR_ROLE;
  }

  return Math.min(score, 100);
}

function generateEmail(name: string, company: string): string | undefined {
  const domain = domains[company];
  if (!domain) return undefined;
  const parts = name.toLowerCase().split(" ");
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first}.${last}@${domain}`;
}

export async function findAlumniAtCompany(
  companyId: string,
  university: string,
  userMajor: string,
  userGradYear: number
): Promise<{ alumni: Alumni[]; scores: Map<string, number> }> {
  const companyAlumni = allAlumni.filter(
    (a) =>
      a.currentCompany.toLowerCase().replace(/\s+/g, "-") === companyId ||
      a.currentCompany.toLowerCase() ===
        companyId.replace(/-/g, " ").toLowerCase()
  );

  const universityAlumni = companyAlumni.filter(
    (a) => a.university.toLowerCase() === university.toLowerCase()
  );

  if (universityAlumni.length === 0) {
    return { alumni: [], scores: new Map() };
  }

  const companyName = universityAlumni[0].currentCompany;
  const scores = new Map<string, number>();

  const realProfiles = await findRealAlumni(companyName, university, universityAlumni.length + 2);

  const enriched: Alumni[] = universityAlumni.map((a, i) => {
    const score = computeWarmthScore(a, userMajor, userGradYear);
    scores.set(a.id, score);

    const realProfile = realProfiles[i];
    const resolvedName = realProfile?.name ?? a.name;

    return {
      ...a,
      name: resolvedName,
      email: generateEmail(resolvedName, companyName),
      linkedinUrl:
        realProfile?.linkedinUrl ??
        `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(a.currentRole + " " + companyName + " " + university)}`,
    };
  });

  enriched.sort(
    (a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0)
  );

  return { alumni: enriched, scores };
}

export async function generateWarmPaths(
  alumni: Alumni[],
  scores: Map<string, number>,
  userMajor: string,
  userGradYear: number,
  university: string
): Promise<WarmPath[]> {
  if (alumni.length === 0) return [];

  const alumniSummaries = alumni.map((a) => ({
    id: a.id,
    name: a.name,
    major: a.major,
    gradYear: a.graduationYear,
    role: a.currentRole,
    company: a.currentCompany,
    sharedBackground: a.sharedBackground,
    warmthScore: scores.get(a.id) ?? WARMTH_BASE,
  }));

  const prompt = `Generate warm introduction paths for a ${university} ${userMajor} student (class of ${userGradYear}) reaching out to these alumni.

ALUMNI:
${JSON.stringify(alumniSummaries, null, 2)}

For each alumni, return a JSON array with objects matching:
{
  "alumniId": string,
  "narrative": string (2-3 sentences explaining the connection and why this is a good contact),
  "suggestedOpener": string (a natural, personalized opening message for LinkedIn or email, 1-2 sentences)
}

Make narratives specific to shared backgrounds. Mention shared clubs, majors, or proximity in graduation year. Keep openers conversational and genuine — not salesy.`;

  const paths = await askClaudeJSON<{ narrative: string; suggestedOpener: string }[]>(prompt, {
    maxTokens: 2048,
  });

  return alumni.map((a, i) => ({
    alumni: a,
    narrative: paths[i]?.narrative ?? "Fellow alumni at your target company.",
    suggestedOpener:
      paths[i]?.suggestedOpener ??
      `Hi ${a.name}! Fellow ${university} alum here — would love to connect.`,
    warmthScore: scores.get(a.id) ?? WARMTH_BASE,
  }));
}
