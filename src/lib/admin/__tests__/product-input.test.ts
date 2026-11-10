import { describe, expect, it } from "vitest";
import { parseProductInput, slugify, skuPrefix, publishBlockers } from "../product-input";

const valid = {
  title: "  Marigold Wrap Dress ",
  category: "Dresses",
  price: "2499",
  summary: "A true wrap dress.",
  description: "Wraps and ties at the waist.",
  materials: "Mul cotton, Hand block print",
  edition: "New",
  sized: "true",
  stock: { XS: "0", S: "2", M: "6", L: "5", XL: "3", XXL: "" },
};

describe("parseProductInput", () => {
  it("normalises a valid form into paise, trimmed text and per-size stock", () => {
    const result = parseProductInput(valid);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.title).toBe("Marigold Wrap Dress");
    expect(result.data.pricePaise).toBe(249900);
    expect(result.data.gstRate).toBe(0.05);
    expect(result.data.materials).toEqual(["Mul cotton", "Hand block print"]);
    expect(result.data.stock).toEqual({ XS: 0, S: 2, M: 6, L: 5, XL: 3, XXL: 0 });
  });

  it("uses 18% GST above ₹2,500", () => {
    const result = parseProductInput({ ...valid, price: "3290" });
    expect(result.success && result.data.gstRate).toBe(0.18);
  });

  it("accepts a free-size piece with a single stock count", () => {
    const result = parseProductInput({ ...valid, category: "Sarees", sized: "false", stock: { FREE: "4" } });
    expect(result.success && result.data.stock).toEqual({ FREE: 4 });
  });

  it("reports field errors in plain language", () => {
    const result = parseProductInput({ ...valid, title: "", category: "Shoes", price: "-5", stock: { S: "1.5" } });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.keys(result.errors).sort()).toEqual(["category", "price", "stock", "title"]);
  });

  it("rejects absurd prices and stock", () => {
    expect(parseProductInput({ ...valid, price: "0" }).success).toBe(false);
    expect(parseProductInput({ ...valid, price: "10000000" }).success).toBe(false);
    expect(parseProductInput({ ...valid, stock: { S: "100000" } }).success).toBe(false);
  });
});

describe("slugify / skuPrefix", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("  Handloom Shirt & Trouser!! ")).toBe("handloom-shirt-trouser");
    expect(slugify("Chettinād Cotton—Saree")).toBe("chettinad-cotton-saree");
    expect(slugify("!!!")).toBe("item");
  });

  it("derives a short SKU prefix from the title and id", () => {
    expect(skuPrefix("Marigold Wrap Dress", "65f0c0ffee0123456789abcd")).toBe("MWD-ABCD");
    expect(skuPrefix("saree", "65f0c0ffee0123456789abcd")).toBe("SAR-ABCD");
  });
});

describe("publishBlockers", () => {
  const ready = { imageCount: 2, variants: [{ price: 249900, stock: 3 }], description: "x" };
  it("allows a complete product", () => expect(publishBlockers(ready)).toEqual([]));
  it("explains what is missing", () => {
    expect(publishBlockers({ ...ready, imageCount: 0 })).toEqual(["Add at least one photo to the gallery."]);
    expect(publishBlockers({ imageCount: 1, variants: [{ price: 100, stock: 0 }], description: "" })).toEqual([
      "Add a description.",
      "Add stock for at least one size.",
    ]);
  });
});
