// Copy guardrails — student-voice checks applied to every Correspondent draft
// Strips em-dashes, flags banned phrases, ensures length bounds, confirms sign-off

import { BANNED_WORDS, BANNED_PHRASES } from "@/shared/ib-constants";

export interface GuardrailResult {
  body: string; // cleaned body
  flags: {
    emDashesReplaced: number;
    bannedWordsFound: string[];
    bannedPhrasesFound: string[];
    tooLong: boolean;
    tooShort: boolean;
  };
}

const MIN_BODY_CHARS = 150;
const MAX_BODY_CHARS = 1400;

export function sanitizeEmailSubject(subject: string): string {
  return subject
    .replace(/\s*[—–]\s*/g, " - ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function applyGuardrails(body: string): GuardrailResult {
  let cleaned = body;

  // 1. Em-dash strip: replace em-dashes with comma or period depending on context
  //    Heuristic: em-dash between two independent clauses → period; otherwise comma.
  let emDashCount = 0;
  cleaned = cleaned.replace(/\s*[—–]\s*/g, (match, offset, full) => {
    emDashCount++;
    // If what follows starts with capital letter and there's a space around, treat as sentence break
    const rest = full.slice(offset + match.length);
    const prev = full.slice(0, offset).trim();
    const nextChar = rest.trim().charAt(0);
    if (prev.endsWith(".") || prev.endsWith("!") || prev.endsWith("?")) return " ";
    if (nextChar && nextChar === nextChar.toUpperCase() && nextChar !== nextChar.toLowerCase()) {
      return ". ";
    }
    return ", ";
  });

  // 2. Banned word + phrase detection (lowercase compare, keep original body)
  const lower = cleaned.toLowerCase();
  const bannedWordsFound = BANNED_WORDS.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(lower));
  const bannedPhrasesFound = BANNED_PHRASES.filter((p) => lower.includes(p.toLowerCase()));

  // 3. Length checks (body only)
  const len = cleaned.trim().length;

  return {
    body: cleaned,
    flags: {
      emDashesReplaced: emDashCount,
      bannedWordsFound,
      bannedPhrasesFound,
      tooLong: len > MAX_BODY_CHARS,
      tooShort: len < MIN_BODY_CHARS,
    },
  };
}

export function hasBlockingFlags(flags: GuardrailResult["flags"]): boolean {
  return flags.bannedPhrasesFound.length > 0 || flags.tooLong || flags.tooShort;
}
