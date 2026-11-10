import { describe, expect, it } from "vitest";
import { customerUnitPrice, gstBreakdown } from "../pricing";

const rates = { CNY: { INR: 11.75 } };

describe("customerUnitPrice", () => {
  it("converts, rounds up to a whole rupee, then adds GST", () => {
    // ¥100 → ₹1175 → +12% GST = ₹1316
    expect(customerUnitPrice({ amount: 10000, currency: "CNY" }, "INR", 0.12, rates)).toEqual({
      amount: 131600,
      currency: "INR",
    });
  });

  it("rounds the GST-inclusive price up to a whole rupee", () => {
    // ¥10.01 → 11762 paise → ₹118 → ×1.05 = ₹123.90 → ₹124
    expect(customerUnitPrice({ amount: 1001, currency: "CNY" }, "INR", 0.05, rates).amount).toBe(12400);
  });

  it("rejects a GST rate outside 0–0.5", () => {
    expect(() => customerUnitPrice({ amount: 100, currency: "CNY" }, "INR", 1.2, rates)).toThrow(/GST/);
  });
});

describe("customerUnitPrice with tax-inclusive seller prices", () => {
  it("keeps the seller's price as the customer price (same currency)", () => {
    // An Indian seller lists a dress at ₹1,499 including GST — the customer pays ₹1,499.
    expect(customerUnitPrice({ amount: 149900, currency: "INR" }, "INR", 0.05, {}, { taxInclusive: true })).toEqual({
      amount: 149900,
      currency: "INR",
    });
  });

  it("still converts currency and rounds up, without adding GST again", () => {
    expect(customerUnitPrice({ amount: 1001, currency: "CNY" }, "INR", 0.05, rates, { taxInclusive: true }).amount).toBe(11800);
  });
});

describe("gstBreakdown", () => {
  it("splits an inclusive price into taxable value and GST", () => {
    expect(gstBreakdown(112000, 0.12)).toEqual({ taxable: 100000, gst: 12000 });
  });

  it("keeps taxable + gst equal to the total", () => {
    const { taxable, gst } = gstBreakdown(99999, 0.18);
    expect(taxable + gst).toBe(99999);
  });
});
