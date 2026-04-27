// Slug → display-name maps shared across UI surfaces.
// Keep in sync with src/data/seed/firms-groups.ts (groups) and
// src/app/setup/page.tsx (firm IDs are stored as slugs in profiles.target_firms).

export const GROUP_LABELS: Record<string, string> = {
  // coverage
  tmt: "TMT",
  healthcare: "Healthcare",
  consumer: "Consumer",
  industrials: "Industrials",
  fig: "FIG",
  energy: "Energy",
  "real-estate": "Real Estate",
  sponsors: "Sponsors",
  // product
  "m-and-a": "M&A",
  levfin: "LevFin",
  rssg: "Restructuring",
  ecm: "ECM",
  dcm: "DCM",
};

// Plain-English expansions for the abbreviation-heavy IB jargon.
// Surfaces under each chip on /setup and on /account.
export const GROUP_DESCRIPTIONS: Record<string, string> = {
  tmt: "Technology, Media & Telecom",
  healthcare: "Hospitals, biotech, devices, pharma",
  consumer: "Retail, food & beverage, apparel",
  industrials: "Aerospace, autos, chemicals, building products",
  fig: "Financial Institutions Group — banks, insurance, asset mgmt",
  energy: "Oil & gas, power, renewables",
  "real-estate": "REITs, real estate operating companies",
  sponsors: "Private equity & sponsor coverage",
  "m-and-a": "Mergers & Acquisitions",
  levfin: "Leveraged Finance — debt for buyouts",
  rssg: "Restructuring & Special Situations",
  ecm: "Equity Capital Markets — IPOs, follow-ons",
  dcm: "Debt Capital Markets — bond issuance",
};

export const GROUP_KIND: Record<string, "coverage" | "product"> = {
  tmt: "coverage",
  healthcare: "coverage",
  consumer: "coverage",
  industrials: "coverage",
  fig: "coverage",
  energy: "coverage",
  "real-estate": "coverage",
  sponsors: "coverage",
  "m-and-a": "product",
  levfin: "product",
  rssg: "product",
  ecm: "product",
  dcm: "product",
};

export function groupLabel(slug: string): string {
  return GROUP_LABELS[slug] ?? slug;
}

export function groupLabels(slugs: string[] | null | undefined): string[] {
  return (slugs ?? []).map(groupLabel);
}

export function groupDescription(slug: string): string | null {
  return GROUP_DESCRIPTIONS[slug] ?? null;
}
