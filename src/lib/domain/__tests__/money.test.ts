import { describe, expect, it } from "vitest";
import { convert, formatMoney, ceilToWholeUnit } from "../money";
import type { RateTable } from "../money";

const rates: RateTable = { CNY: { INR: 11.75 } };

describe("convert", () => {
  it("returns the same amount for the same currency", () => {
    expect(convert(12345, "INR", "INR", rates)).toBe(12345);
  });

  it("converts minor units using a direct rate", () => {
    // ¥100.00 = 10000 fen → ₹1175.00 = 117500 paise
    expect(convert(10000, "CNY", "INR", rates)).toBe(117500);
  });

  it("uses the inverse rate when only the reverse pair exists", () => {
    expect(convert(117500, "INR", "CNY", rates)).toBe(10000);
  });

  it("rounds to the nearest minor unit", () => {
    expect(convert(1, "CNY", "INR", rates)).toBe(12);
  });

  it("throws when no rate exists", () => {
    expect(() => convert(100, "CNY", "USD", rates)).toThrow(/No exchange rate/);
  });

  it("rejects non-integer amounts", () => {
    expect(() => convert(10.5, "CNY", "INR", rates)).toThrow(/integer/);
  });
});

describe("ceilToWholeUnit", () => {
  it("rounds paise up to the next rupee", () => {
    expect(ceilToWholeUnit(117501, "INR")).toBe(117600);
    expect(ceilToWholeUnit(117500, "INR")).toBe(117500);
  });
});

describe("formatMoney", () => {
  it("formats INR with Indian grouping", () => {
    expect(formatMoney(12345600, "INR")).toBe("₹1,23,456");
  });

  it("shows decimals only when present", () => {
    expect(formatMoney(12350, "CNY")).toBe("¥123.50");
  });
});
