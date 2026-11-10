import { describe, expect, it } from "vitest";
import { apparelGstRate, APPAREL_GST_THRESHOLD } from "../tax";

describe("apparelGstRate", () => {
  it("charges 5% up to the threshold and 18% above it", () => {
    expect(apparelGstRate(149900)).toBe(0.05);
    expect(apparelGstRate(APPAREL_GST_THRESHOLD)).toBe(0.05);
    expect(apparelGstRate(APPAREL_GST_THRESHOLD + 100)).toBe(0.18);
  });

  it("rejects invalid prices", () => {
    expect(() => apparelGstRate(-1)).toThrow();
    expect(() => apparelGstRate(10.5)).toThrow();
  });
});
