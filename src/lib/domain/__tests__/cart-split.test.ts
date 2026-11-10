import { describe, expect, it } from "vitest";
import { splitCart } from "../cart-split";
import type { CartLineInput, VendorShippingInfo } from "../cart-split";

const rates = { CNY: { INR: 11.75 } };

const vendors: Record<string, VendorShippingInfo> = {
  v1: {
    id: "v1",
    name: "Kiln & Thread",
    country: "CN",
    currency: "CNY",
    handlingDays: 2,
    lanes: [{ destination: "IN", fee: 5000, minDays: 7, maxDays: 12 }],
  },
  v2: {
    id: "v2",
    name: "Paper Moon",
    country: "CN",
    currency: "CNY",
    handlingDays: 1,
    lanes: [{ destination: "IN", fee: 3000, minDays: 9, maxDays: 15 }],
  },
};

const line = (overrides: Partial<CartLineInput>): CartLineInput => ({
  productId: "p1",
  sku: "SKU-1",
  title: "Vase",
  vendorId: "v1",
  unitPrice: { amount: 10000, currency: "CNY" },
  gstRate: 0.12,
  quantity: 1,
  stock: 10,
  ...overrides,
});

describe("splitCart", () => {
  it("groups lines into one shipment per vendor", () => {
    const result = splitCart(
      [line({}), line({ sku: "SKU-2", vendorId: "v2" }), line({ sku: "SKU-3" })],
      vendors,
      { destination: "IN", currency: "INR", rates },
    );
    expect(result.shipments.map((s) => s.vendorId)).toEqual(["v1", "v2"]);
    expect(result.shipments[0].lines).toHaveLength(2);
  });

  it("computes customer totals and vendor payout per shipment", () => {
    const result = splitCart([line({ quantity: 2 })], vendors, { destination: "IN", currency: "INR", rates });
    const s = result.shipments[0];
    expect(s.subtotal).toBe(263200); // 2 × ₹1316
    expect(s.shipping).toBe(58800); // ¥50 → ₹587.50 → ₹588
    expect(s.total).toBe(322000);
    expect(s.vendorPayout).toEqual({ amount: 25000, currency: "CNY" }); // 2 × ¥100 + ¥50
    expect(result.total).toBe(322000);
    expect(result.currency).toBe("INR");
  });

  it("estimates delivery per shipment and for the whole order", () => {
    const result = splitCart([line({}), line({ vendorId: "v2" })], vendors, {
      destination: "IN",
      currency: "INR",
      rates,
    });
    expect(result.shipments[0].eta).toEqual({ minDays: 9, maxDays: 14 });
    expect(result.shipments[1].eta).toEqual({ minDays: 10, maxDays: 16 });
    expect(result.eta).toEqual({ minDays: 10, maxDays: 16 });
  });

  it("does not add GST on top when the seller's prices already include it", () => {
    const store: Record<string, VendorShippingInfo> = {
      s: { id: "s", name: "Store", country: "IN", currency: "INR", handlingDays: 1, pricesIncludeTax: true,
        lanes: [{ destination: "IN", fee: 9900, minDays: 2, maxDays: 5 }] },
    };
    const result = splitCart(
      [line({ vendorId: "s", unitPrice: { amount: 149900, currency: "INR" }, gstRate: 0.05, quantity: 2 })],
      store,
      { destination: "IN", currency: "INR", rates: {} },
    );
    expect(result.subtotal).toBe(299800);
    expect(result.shipping).toBe(9900);
    expect(result.gst).toBe(14276); // GST contained inside ₹2,998 at 5%
    expect(result.eta).toEqual({ minDays: 3, maxDays: 6 });
  });

  it("does not mutate its inputs", () => {
    const lines = [line({})];
    const snapshot = JSON.stringify(lines);
    splitCart(lines, vendors, { destination: "IN", currency: "INR", rates });
    expect(JSON.stringify(lines)).toBe(snapshot);
  });

  it("rejects quantities above stock", () => {
    expect(() =>
      splitCart([line({ quantity: 11 })], vendors, { destination: "IN", currency: "INR", rates }),
    ).toThrow(/stock/);
  });

  it("rejects vendors that do not ship to the destination", () => {
    expect(() => splitCart([line({})], vendors, { destination: "US", currency: "INR", rates })).toThrow(
      /does not ship/,
    );
  });

  it("rejects unknown vendors and empty carts", () => {
    expect(() => splitCart([line({ vendorId: "x" })], vendors, { destination: "IN", currency: "INR", rates })).toThrow(
      /Unknown vendor/,
    );
    expect(() => splitCart([], vendors, { destination: "IN", currency: "INR", rates })).toThrow(/empty/);
  });
});
