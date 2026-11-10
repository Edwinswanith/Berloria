import { describe, expect, it } from "vitest";
import { addItem, countItems, priceBag, removeItem, sanitizeItems, setItemQty, MAX_PER_LINE, type BagLineInput } from "../bag";

const line = (over: Partial<BagLineInput> = {}): BagLineInput => ({
  sku: "MWD-M", productId: "p1", slug: "marigold-wrap-dress", title: "Marigold Wrap Dress", variantLabel: "M", image: "/a.jpg",
  unitPrice: 249900, gstRate: 0.05, requested: 1, stock: 6, ...over,
});
const delivery = { fee: 7900, freeFrom: 199900 };

describe("bag items", () => {
  it("adds, merges and caps quantities without mutating", () => {
    const start = [{ sku: "A-M", qty: 1 }];
    const next = addItem(start, "A-M", 2);
    expect(next).toEqual([{ sku: "A-M", qty: 3 }]);
    expect(start).toEqual([{ sku: "A-M", qty: 1 }]);
    expect(addItem(next, "B-S", 1)).toHaveLength(2);
    expect(addItem(start, "A-M", 50)[0].qty).toBe(MAX_PER_LINE);
    expect(addItem(start, "A-M", 5, 2)[0].qty).toBe(2);
  });

  it("changes and removes lines", () => {
    const items = [{ sku: "A-M", qty: 2 }, { sku: "B-S", qty: 1 }];
    expect(setItemQty(items, "A-M", 4)[0].qty).toBe(4);
    expect(setItemQty(items, "A-M", 0)).toEqual([{ sku: "B-S", qty: 1 }]);
    expect(removeItem(items, "B-S")).toEqual([{ sku: "A-M", qty: 2 }]);
    expect(countItems(items)).toBe(3);
  });

  it("throws away anything malformed from storage or a request", () => {
    expect(sanitizeItems("nope")).toEqual([]);
    expect(sanitizeItems([{ sku: "A-M", qty: 1 }, { sku: "A-M", qty: 2 }, { sku: "$where", qty: 1 }, { sku: "B", qty: -1 }, { sku: 4, qty: 1 }, null]))
      .toEqual([{ sku: "A-M", qty: 3 }]);
    expect(sanitizeItems([{ sku: "A-M", qty: 999 }])[0].qty).toBe(MAX_PER_LINE);
  });
});

describe("priceBag", () => {
  it("totals lines and adds the delivery fee below the free-delivery mark", () => {
    const bag = priceBag([line({ unitPrice: 99900, gstRate: 0.05 })], delivery);
    expect(bag.subtotal).toBe(99900);
    expect(bag.shipping).toBe(7900);
    expect(bag.total).toBe(107800);
    expect(bag.freeDeliveryGap).toBe(100000);
    expect(bag.hasIssues).toBe(false);
  });

  it("delivers free at or above the mark", () => {
    const bag = priceBag([line({ requested: 1 })], delivery);
    expect(bag.shipping).toBe(0);
    expect(bag.total).toBe(249900);
    expect(bag.freeDeliveryGap).toBe(0);
  });

  it("reports the GST already inside the price", () => {
    const bag = priceBag([line({ unitPrice: 105000, gstRate: 0.05 })], delivery);
    expect(bag.gst).toBe(5000);
  });

  it("lowers a quantity to what is in stock and flags it", () => {
    const bag = priceBag([line({ requested: 4, stock: 2 })], delivery);
    expect(bag.lines[0].quantity).toBe(2);
    expect(bag.lines[0].issue).toBe("reduced");
    expect(bag.hasIssues).toBe(true);
  });

  it("keeps a sold-out line visible but free, and charges no delivery on an empty order", () => {
    const bag = priceBag([line({ stock: 0 })], delivery);
    expect(bag.lines[0].issue).toBe("sold_out");
    expect(bag.itemCount).toBe(0);
    expect(bag.total).toBe(0);
    expect(bag.shipping).toBe(0);
  });
});
