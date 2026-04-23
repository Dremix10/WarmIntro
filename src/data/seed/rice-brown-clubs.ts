// Curated list of Rice + Brown clubs/societies the resume parser should recognize
// Feed into system prompt so parser catches these even when buried inline in resumes

export const RICE_CLUBS = [
  "Rice Finance Club",
  "Owls on Wall Street",
  "Rice Investment Club",
  "Rice Consulting Club",
  "Rice Data Science Club",
  "Rice Business Society",
  "Rice Alpha Kappa Psi",
  "Rice Women in Business",
  "Rice Pre-Law Society",
  "Rice Engineering Society",
  "Rice Computer Science Club",
  "Rice Entrepreneurship Club",
  "Student Association",
  "Rice Thresher", // student newspaper
  "Rice Sustainability",
  "Rice Program Council",
  "Rice Model UN",
  "Rice Debate Society",
];

export const BROWN_CLUBS = [
  "Brown Finance Club",
  "Brown Investment Group",
  "Brown Real Estate Club",
  "Brown Consulting Club",
  "Brown Entrepreneurship Program",
  "Brown Women in Business",
  "Brown Pre-Law Society",
  "Brown Engineering Society",
  "Brown Computer Science Student Association",
  "Brown Data Science Initiative",
  "Brown Technology Review",
  "Brown Political Review",
  "Brown Daily Herald", // student newspaper
  "Brown Debate Society",
  "Brown Model UN",
  "Brown Alpha Kappa Psi",
  "Brown Microfinance Initiative",
  "Brown BEAR",
  "Brown Market Review",
];

export const RICE_BROWN_CLUBS_PROMPT_BLOCK = `Known Rice + Brown clubs to watch for (even if buried in resume text or listed as single lines):

Rice: ${RICE_CLUBS.join(", ")}

Brown: ${BROWN_CLUBS.join(", ")}

Also watch for Greek organizations (Sigma Chi, Kappa Alpha, Delta Gamma, etc.) and honor societies (Phi Beta Kappa, Tau Beta Pi, etc.) which signal networking assets.`;
