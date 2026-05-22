import type { Company, Internship } from "@/shared/types";
import companiesData from "@/data/companies.json";
import internshipsData from "@/data/internships.json";

interface CompanyData {
  id: string;
  name: string;
  industry: string;
  location: string;
  size: "startup" | "mid" | "enterprise";
  description: string;
  logoPlaceholder: string;
  alumniCount: number;
  warmthScore: number;
}

interface InternshipData {
  id: string;
  companyId: string;
  title: string;
  location: string;
  type: "summer" | "fall" | "spring" | "co-op";
  description: string;
  requirements: string[];
  matchScore: number;
}

const companies = companiesData as CompanyData[];
const internships = internshipsData as InternshipData[];

const SKILL_SYNONYMS: Record<string, string[]> = {
  python: ["python", "py"],
  typescript: ["typescript", "ts", "javascript", "js"],
  react: ["react", "frontend", "front-end", "ui"],
  "next.js": ["next", "nextjs", "next.js"],
  sql: ["sql", "database", "postgres", "postgresql", "mysql"],
  flask: ["flask", "django", "backend", "back-end"],
  "machine learning": ["machine learning", "ml", "ai", "deep learning", "neural"],
  algorithms: ["algorithms", "data structures", "competitive programming", "problem-solving"],
  "system design": ["system design", "architecture", "distributed systems", "scalable"],
  "full-stack": ["full-stack", "full stack", "fullstack", "web development"],
  "data science": ["data science", "data analysis", "analytics", "statistical"],
  "claude api": ["claude", "llm", "large language model", "generative ai", "gpt"],
  langchain: ["langchain", "ai agents", "rag", "retrieval"],
  node: ["node", "node.js", "express", "server-side javascript"],
  git: ["git", "version control", "github"],
  linux: ["linux", "unix", "command line", "bash"],
};

function expandSkill(skill: string): string[] {
  const lower = skill.toLowerCase();
  for (const [key, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    if (lower === key || synonyms.includes(lower)) {
      return synonyms;
    }
  }
  return [lower];
}

function computeInternshipScore(
  intern: InternshipData,
  skills: string[],
  roles: string[]
): number {
  let score = 0;

  const textToSearch = [
    intern.title,
    intern.description,
    ...intern.requirements,
  ]
    .join(" ")
    .toLowerCase();

  const matchedSkills = new Set<string>();
  for (const skill of skills) {
    const expanded = expandSkill(skill);
    for (const term of expanded) {
      if (textToSearch.includes(term) && !matchedSkills.has(skill)) {
        matchedSkills.add(skill);
        score += 12;
        break;
      }
    }
  }

  const titleLower = intern.title.toLowerCase();
  for (const role of roles) {
    const roleWords = role.toLowerCase().split(/\s+/);
    const meaningfulWords = roleWords.filter(
      (w) => w.length > 2 && w !== "intern" && w !== "the"
    );
    const matchCount = meaningfulWords.filter((w) => titleLower.includes(w)).length;
    if (matchCount > 0) {
      score += matchCount * 10 + 5;
    }
  }

  return Math.min(score, 100);
}

function computeCompanyScore(
  company: CompanyData,
  bestInternshipScore: number
): number {
  let score = 0;

  score += bestInternshipScore * 0.5;
  score += Math.min(company.alumniCount * 3, 25);
  score += company.warmthScore * 0.2;

  if (company.size === "enterprise") score += 3;
  if (company.size === "mid") score += 5;
  if (company.size === "startup") score += 2;

  return Math.min(Math.round(score), 100);
}

export function findCompanies(
  industries: string[],
  skills: string[],
  roles: string[]
): Company[] {
  const filtered =
    industries.length > 0
      ? companies.filter((c) => industries.includes(c.industry))
      : companies;

  const ranked: Company[] = filtered
    .map((c) => {
      const companyInternships: Internship[] = internships
        .filter((i) => i.companyId === c.id)
        .map((i) => ({
          ...i,
          matchScore: computeInternshipScore(i, skills, roles),
        }))
        .sort((a, b) => b.matchScore - a.matchScore);

      const bestScore =
        companyInternships.length > 0 ? companyInternships[0].matchScore : 0;

      return {
        ...c,
        warmthScore: computeCompanyScore(c, bestScore),
        openInternships: companyInternships,
      };
    })
    .filter((c) => c.openInternships.length > 0);

  ranked.sort((a, b) => b.warmthScore - a.warmthScore);

  return ranked;
}
