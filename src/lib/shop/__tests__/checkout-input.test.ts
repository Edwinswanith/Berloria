import { describe, expect, it } from "vitest";
import { normalisePhone, parseCheckout } from "../checkout-input";

const valid = {
  name: "Asha Rao", email: " Asha@Example.com ", phone: "98400 12345", line1: "12, 3rd Cross Street", line2: "", city: "Chennai",
  state: "Tamil Nadu", postalCode: "600017", paymentMethod: "manual", expectedTotal: 249900, items: [{ sku: "MWD-M", qty: 1 }],
};

describe("normalisePhone", () => {
  it("accepts common ways of writing an Indian mobile number", () => {
    for (const raw of ["9840012345", "98400 12345", "+91 98400 12345", "09840012345", "91-9840012345"]) expect(normalisePhone(raw)).toBe("+919840012345");
  });
  it("rejects landlines, short and foreign numbers", () => {
    for (const raw of ["12345", "5840012345", "+1 415 555 0100", ""]) expect(normalisePhone(raw)).toBeNull();
  });
});

describe("parseCheckout", () => {
  it("normalises a valid order", () => {
    const result = parseCheckout(valid);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.email).toBe("asha@example.com");
    expect(result.data.phone).toBe("+919840012345");
    expect(result.data.address).toEqual({ line1: "12, 3rd Cross Street", line2: "", city: "Chennai", state: "Tamil Nadu", postalCode: "600017" });
    expect(result.data.items).toEqual([{ sku: "MWD-M", qty: 1 }]);
  });

  it("explains each wrong field in plain words", () => {
    const result = parseCheckout({ ...valid, name: "", email: "nope", phone: "123", postalCode: "0123", state: "Atlantis", paymentMethod: "cheque" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(result.errors).sort()).toEqual(["email", "name", "paymentMethod", "phone", "postalCode", "state"]);
    expect(result.errors.postalCode).toMatch(/6-digit/);
  });

  it("refuses an empty or junk bag", () => {
    const result = parseCheckout({ ...valid, items: [{ sku: "$bad", qty: 1 }] });
    expect(result).toEqual({ success: false, errors: { items: "Your bag is empty." } });
  });
});
