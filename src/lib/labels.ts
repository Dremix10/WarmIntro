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

export function groupLabel(slug: string): string {
  return GROUP_LABELS[slug] ?? slug;
}

export function groupLabels(slugs: string[] | null | undefined): string[] {
  return (slugs ?? []).map(groupLabel);
}
