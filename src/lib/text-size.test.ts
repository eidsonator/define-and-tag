import { describe, expect, it } from "vitest";
import { normalizeTextSize, stepTextSize } from "./text-size";

describe("text size", () => {
  it("defaults to 100% for missing or invalid values", () => {
    expect(normalizeTextSize(null)).toBe(100);
    expect(normalizeTextSize("120")).toBe(100);
  });
  it("steps through 90,100,115,130,150,175", () => {
    expect(stepTextSize(100, 1)).toBe(115);
    expect(stepTextSize(130, 1)).toBe(150);
    expect(stepTextSize(100, -1)).toBe(90);
  });
  it("stops at the ends", () => {
    expect(stepTextSize(175, 1)).toBe(175);
    expect(stepTextSize(90, -1)).toBe(90);
  });
});
