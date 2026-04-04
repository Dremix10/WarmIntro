import type { Alumni, WarmPath } from "@/shared/types";
import alumniData from "@/data/alumni.json";
import companiesData from "@/data/companies.json";
import { askClaudeJSON } from "./claude";
import { findLinkedInProfile, findRealAlumni } from "./linkedin-search";

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
  industry: string;
  description: string;
}

const allAlumni = alumniData as AlumniData[];
const allCompanies = companiesData as CompanyData[];


function computeWarmthScore(
  alumni: AlumniData,
  userMajor: string,
  userGradYear: number
): number {
  let score = 30;

  if (alumni.major.toLowerCase() === userMajor.toLowerCase()) {
    score += 20;
  }

  const yearDiff = Math.abs(alumni.graduationYear - userGradYear);
  if (yearDiff <= 5) score += 15;
  else if (yearDiff <= 10) score += 10;

  const clubPoints = alumni.sharedBackground.filter(
    (bg) =>
      bg.includes("Club") ||
      bg.includes("Council") ||
      bg.includes("Society")
  ).length;
  score += Math.min(clubPoints * 10, 30);

  if (
    alumni.sharedBackground.some(
      (bg) => bg.toLowerCase().includes("houston") || bg.includes("resident")
    )
  ) {
    score += 5;
  }

  const seniorTitles = ["senior", "staff", "principal", "director", "manager"];
  if (
    seniorTitles.some((t) => alumni.currentRole.toLowerCase().includes(t))
  ) {
    score += 5;
  }

  return Math.min(score, 100);
}

const EMAIL_DOMAINS: Record<string, string> = {
  "Tesla": "tesla.com",
  "Toyota": "toyota.com",
  "Ford Motor Company": "ford.com",
  "General Motors": "gm.com",
  "BMW Group": "bmw.com",
  "Hyundai Motor Group": "hyundai.com",
  "BYD": "byd.com",
  "Volvo Cars": "volvocars.com",
  "Rivian": "rivian.com",
  "Lucid Motors": "lucidmotors.com",
  "Google": "google.com",
  "Microsoft": "microsoft.com",
  "Apple": "apple.com",
  "Amazon": "amazon.com",
  "Meta": "meta.com",
  "NVIDIA": "nvidia.com",
  "Salesforce": "salesforce.com",
  "Stripe": "stripe.com",
  "Databricks": "databricks.com",
  "Palantir": "palantir.com",
  "Goldman Sachs": "gs.com",
  "JPMorgan Chase": "jpmorgan.com",
  "McKinsey": "mckinsey.com",
  "BCG": "bcg.com",
  "Bain": "bain.com",
  "Deloitte": "deloitte.com",
  "Morgan Stanley": "morganstanley.com",
  "Citadel": "citadel.com",
  "Johnson & Johnson": "jnj.com",
  "Pfizer": "pfizer.com",
  "Medtronic": "medtronic.com",
  "Abbott": "abbott.com",
  "Genentech": "gene.com",
  "Intuitive Surgical": "intusurg.com",
  "23andMe": "23andme.com",
  "Moderna": "modernatx.com",
  "Chevron": "chevron.com",
  "ExxonMobil": "exxonmobil.com",
  "NextEra Energy": "nexteraenergy.com",
  "Procter & Gamble": "pg.com",
  "Nike": "nike.com",
  "Walmart": "walmart.com",
  "HEB": "heb.com",
};

function generateEmail(name: string, company: string): string | undefined {
  const domain = EMAIL_DOMAINS[company];
  if (!domain) return undefined;
  const parts = name.toLowerCase().split(" ");
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first}.${last}@${domain}`;
}

function findCompanyName(companyId: string): string {
  const company = allCompanies.find((c) => c.id === companyId);
  return company?.name ?? companyId;
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

  // Batch-find real people at this company from this university (one API call)
  const realProfiles = await findRealAlumni(companyName, university, universityAlumni.length + 2);

  // Merge: use seed data for scoring/background, real profiles for name/LinkedIn
  const enriched: Alumni[] = await Promise.all(
    universityAlumni.map(async (a, i) => {
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
    })
  );

  enriched.sort(
    (a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0)
  );

  return { alumni: enriched, scores };
}

interface WarmPathResponse {
  narrative: string;
  suggestedOpener: string;
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
    warmthScore: scores.get(a.id) ?? 30,
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

  const paths = await askClaudeJSON<WarmPathResponse[]>(prompt, {
    maxTokens: 2048,
  });

  return alumni.map((a, i) => ({
    alumni: a,
    narrative: paths[i]?.narrative ?? "Fellow alumni at your target company.",
    suggestedOpener:
      paths[i]?.suggestedOpener ??
      `Hi ${a.name}! Fellow ${university} alum here — would love to connect.`,
    warmthScore: scores.get(a.id) ?? 30,
  }));
}

export async function generateColdOutreach(
  companyId: string,
  companyName: string,
  university: string,
  userMajor: string,
  userGradYear: number
): Promise<WarmPath[]> {
  // Find REAL people at this company via Serper
  const realProfiles = await findRealAlumni(companyName, university, 5);

  if (realProfiles.length > 0) {
    // We found real people — build alumni entries from them
    const alumni: Alumni[] = realProfiles.map((p, i) => ({
          id: `real-${companyId}-${i}`,
          name: p.name,
          university: university,
          graduationYear: 0,
          major: "Unknown",
          currentCompany: companyName,
          currentRole: p.headline.split(" at ")[0].split(" - ")[0].slice(0, 60),
          linkedinUrl: p.linkedinUrl,
          connectionStrength: "medium" as const,
          sharedBackground: [university],
    }));

    const prompt = `Generate warm introduction paths for a ${university} ${userMajor} student (class of ${userGradYear}) reaching out to these REAL people found on LinkedIn at ${companyName}.

CONTACTS:
${JSON.stringify(alumni.map((a) => ({ name: a.name, role: a.currentRole, company: a.currentCompany })), null, 2)}

For each contact, return a JSON array with objects matching:
{
  "narrative": string (2-3 sentences: why this person is a good contact based on their role, suggest they might be a ${university} alum),
  "suggestedOpener": string (a natural opening message — mention ${university}, express interest in their work at ${companyName}, 1-2 sentences)
}`;

    const paths = await askClaudeJSON<{ narrative: string; suggestedOpener: string }[]>(prompt, {
      maxTokens: 1536,
    });

    return alumni.map((a, i) => ({
      alumni: a,
      narrative: paths[i]?.narrative ?? `${a.name} works at ${companyName} and may have a connection to ${university}.`,
      suggestedOpener: paths[i]?.suggestedOpener ?? `Hi ${a.name}! I'm a ${university} student interested in ${companyName} — would love to connect.`,
      warmthScore: 40,
    }));
  }

  // Fallback: no Serper results, use Claude to suggest generic targets
  const prompt = `A ${university} ${userMajor} student (class of ${userGradYear}) wants to connect with people at ${companyName}, but we couldn't find specific ${university} alumni there.

Generate 3 suggested outreach strategies. For each, return a JSON array with:
{
  "name": string (use a role description like "Engineering Manager" instead of a fake name),
  "role": string (the type of person to look for),
  "narrative": string (2-3 sentences: why this type of person is good to reach out to),
  "suggestedOpener": string (a cold but warm opening message, 1-2 sentences)
}`;

  const suggestions = await askClaudeJSON<
    { name: string; role: string; narrative: string; suggestedOpener: string }[]
  >(prompt, { maxTokens: 1024 });

  return suggestions.map((s, i) => ({
    alumni: {
      id: `cold-${companyId}-${i}`,
      name: s.name,
      university: "N/A",
      graduationYear: 0,
      major: "N/A",
      currentCompany: companyName,
      currentRole: s.role,
      linkedinUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(s.role + " " + companyName)}`,
      email: undefined,
      connectionStrength: "weak" as const,
      sharedBackground: [],
    },
    narrative: s.narrative,
    suggestedOpener: s.suggestedOpener,
    warmthScore: 15,
  }));
}
