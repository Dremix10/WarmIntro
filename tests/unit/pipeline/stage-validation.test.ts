// Unit test — pure logic, no DB. Verifies the stage-name validator
// rejects nonsense and accepts the seven IB-pipeline stages plus
// closed_lost. This is the foundational test for the unit suite —
// if it doesn't run, the rig is broken.

import { describe, expect, it } from "vitest";
import { isValidStage, VALID_STAGES } from "@/services/pipeline/upsertConnectionAtStage";

describe("isValidStage", () => {
  it("accepts every IB pipeline stage", () => {
    for (const s of VALID_STAGES) {
      expect(isValidStage(s)).toBe(true);
    }
  });

  it("accepts closed_lost (terminal stage)", () => {
    expect(isValidStage("closed_lost")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isValidStage("")).toBe(false);
  });

  it("rejects legacy / unknown stages", () => {
    expect(isValidStage("interview")).toBe(false);
    expect(isValidStage("phoneScreen")).toBe(false);
    expect(isValidStage("SENT")).toBe(false);
  });

  it("rejects values that look like stages but aren't", () => {
    expect(isValidStage("first round")).toBe(false);
    expect(isValidStage("super_day")).toBe(false);
  });
});
