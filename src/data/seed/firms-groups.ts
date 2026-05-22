// Seed data for `firms` and `groups` tables
// Curator / setup script writes these on first run (idempotent)

import type { FirmTier, GroupKind } from "@/shared/ib-types";

export interface FirmSeed {
  id: string;
  name: string;
  tier: FirmTier;
  domain: string;
  hqCity?: string;
}

export interface GroupSeed {
  firmId: string;
  slug: string; // becomes groups.id as `${firmId}-${slug}`
  name: string;
  kind: GroupKind;
}

export const FIRM_SEEDS: FirmSeed[] = [
  // Bulge Bracket
  { id: "morgan-stanley", name: "Morgan Stanley", tier: "bulge_bracket", domain: "morganstanley.com", hqCity: "New York" },
  { id: "goldman-sachs", name: "Goldman Sachs", tier: "bulge_bracket", domain: "gs.com", hqCity: "New York" },
  { id: "jpmorgan", name: "JPMorgan", tier: "bulge_bracket", domain: "jpmorgan.com", hqCity: "New York" },
  { id: "citi", name: "Citi", tier: "bulge_bracket", domain: "citi.com", hqCity: "New York" },
  { id: "bofa", name: "Bank of America", tier: "bulge_bracket", domain: "bofa.com", hqCity: "New York" },
  { id: "barclays", name: "Barclays", tier: "bulge_bracket", domain: "barclays.com", hqCity: "New York" },
  { id: "deutsche-bank", name: "Deutsche Bank", tier: "bulge_bracket", domain: "db.com", hqCity: "New York" },
  { id: "ubs", name: "UBS", tier: "bulge_bracket", domain: "ubs.com", hqCity: "New York" },

  // Elite Boutique
  { id: "evercore", name: "Evercore", tier: "elite_boutique", domain: "evercore.com", hqCity: "New York" },
  { id: "centerview", name: "Centerview Partners", tier: "elite_boutique", domain: "centerviewpartners.com", hqCity: "New York" },
  { id: "lazard", name: "Lazard", tier: "elite_boutique", domain: "lazard.com", hqCity: "New York" },
  { id: "moelis", name: "Moelis & Company", tier: "elite_boutique", domain: "moelis.com", hqCity: "New York" },
  { id: "pjt", name: "PJT Partners", tier: "elite_boutique", domain: "pjtpartners.com", hqCity: "New York" },
  { id: "perella-weinberg", name: "Perella Weinberg Partners", tier: "elite_boutique", domain: "pwpartners.com", hqCity: "New York" },
  { id: "guggenheim", name: "Guggenheim Securities", tier: "elite_boutique", domain: "guggenheimpartners.com", hqCity: "New York" },
  { id: "greenhill", name: "Greenhill & Co.", tier: "elite_boutique", domain: "greenhill.com", hqCity: "New York" },

  // Middle Market
  { id: "jefferies", name: "Jefferies", tier: "middle_market", domain: "jefferies.com", hqCity: "New York" },
  { id: "houlihan-lokey", name: "Houlihan Lokey", tier: "middle_market", domain: "hl.com", hqCity: "Los Angeles" },
  { id: "william-blair", name: "William Blair", tier: "middle_market", domain: "williamblair.com", hqCity: "Chicago" },
  { id: "raymond-james", name: "Raymond James", tier: "middle_market", domain: "raymondjames.com", hqCity: "St. Petersburg" },
  { id: "piper-sandler", name: "Piper Sandler", tier: "middle_market", domain: "pipersandler.com", hqCity: "Minneapolis" },
  { id: "stifel", name: "Stifel", tier: "middle_market", domain: "stifel.com", hqCity: "St. Louis" },
  { id: "lincoln", name: "Lincoln International", tier: "middle_market", domain: "lincolninternational.com", hqCity: "Chicago" },
  { id: "harris-williams", name: "Harris Williams", tier: "middle_market", domain: "harriswilliams.com", hqCity: "Richmond" },
];

// Canonical groups every firm has (most of them; we keep it uniform for v1)
const COVERAGE_GROUPS: Array<{ slug: string; name: string }> = [
  { slug: "tmt", name: "TMT" },
  { slug: "healthcare", name: "Healthcare" },
  { slug: "consumer", name: "Consumer & Retail" },
  { slug: "industrials", name: "Industrials" },
  { slug: "fig", name: "FIG" },
  { slug: "energy", name: "Energy & Power" },
  { slug: "real-estate", name: "Real Estate" },
  { slug: "sponsors", name: "Financial Sponsors" },
];

const PRODUCT_GROUPS: Array<{ slug: string; name: string }> = [
  { slug: "m-and-a", name: "M&A" },
  { slug: "levfin", name: "Leveraged Finance" },
  { slug: "rssg", name: "Restructuring" },
  { slug: "ecm", name: "ECM" },
  { slug: "dcm", name: "DCM" },
];

export function buildGroupSeeds(): GroupSeed[] {
  const rows: GroupSeed[] = [];
  for (const firm of FIRM_SEEDS) {
    for (const cov of COVERAGE_GROUPS) {
      rows.push({ firmId: firm.id, slug: cov.slug, name: cov.name, kind: "coverage" });
    }
    for (const prod of PRODUCT_GROUPS) {
      rows.push({ firmId: firm.id, slug: prod.slug, name: prod.name, kind: "product" });
    }
  }
  return rows;
}
