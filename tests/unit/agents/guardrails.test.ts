import { describe, expect, it } from "vitest";
import { applyGuardrails, hasBlockingFlags, sanitizeEmailSubject } from "@/services/guardrails";

const LONG_ENOUGH_BODY = `
Hi Sarah,

Saw your team advised on the Hologic carve-out last spring. I'm a Brown sophomore trying to understand what analysts actually learn on a live M&A process and how the work changes from first model draft to client-ready materials.

Would 15 min by phone next week work?

Thanks,
Demetris
Brown '28 | Applied Mathematics-Computer Science
`;

describe("applyGuardrails", () => {
  it("normalizes em dashes out of email subjects", () => {
    expect(sanitizeEmailSubject("Brown CS sophomore — quick question on healthcare M&A")).toBe(
      "Brown CS sophomore - quick question on healthcare M&A"
    );
  });

  it("hard-blocks live tester casual hedge language", () => {
    const result = applyGuardrails(LONG_ENOUGH_BODY.replace("trying to understand", "kinda trying to understand"));

    expect(result.flags.bannedPhrasesFound).toContain("kinda");
    expect(result.flags.tooShort).toBe(false);
    expect(hasBlockingFlags(result.flags)).toBe(true);
  });

  it("hard-blocks unverified career-arc opener language", () => {
    const result = applyGuardrails(
      LONG_ENOUGH_BODY.replace("Saw your team advised on", "Saw you went from Brown to Lazard after")
    );

    expect(result.flags.bannedPhrasesFound).toContain("went from");
    expect(result.flags.tooShort).toBe(false);
    expect(hasBlockingFlags(result.flags)).toBe(true);
  });
});
