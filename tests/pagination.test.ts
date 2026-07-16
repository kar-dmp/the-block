import { describe, expect, it } from "vitest";
import { clampPage } from "@/lib/pagination";

describe("clampPage", () => {
  it("normalizes malformed and negative page values", () => {
    expect(clampPage(Number.NaN, 200, 12)).toBe(1);
    expect(clampPage(-4, 200, 12)).toBe(1);
  });

  it("keeps a valid requested page", () => {
    expect(clampPage(4, 200, 12)).toBe(4);
  });

  it("clamps pages beyond the final result page", () => {
    expect(clampPage(999, 200, 12)).toBe(17);
  });

  it("uses page one for an empty result set", () => {
    expect(clampPage(3, 0, 12)).toBe(1);
  });
});
