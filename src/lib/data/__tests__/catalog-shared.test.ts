import { describe, expect, it } from "vitest";
import { categoryFromSlug, categorySlug, parseSort, sortCards, stockSignal } from "../catalog-shared";

const cards = [
  { id: "a", priceFrom: 300, createdAt: 1, featured: false },
  { id: "b", priceFrom: 100, createdAt: 3, featured: true },
  { id: "c", priceFrom: 200, createdAt: 2, featured: false },
];

describe("sortCards", () => {
  it.each([
    ["featured", ["b", "a", "c"]],
    ["newest", ["b", "c", "a"]],
    ["price-asc", ["b", "c", "a"]],
    ["price-desc", ["a", "c", "b"]],
  ] as const)("sorts by %s", (sort, expected) => {
    expect(sortCards(cards, sort).map((c) => c.id)).toEqual(expected);
  });

  it("does not mutate the input", () => {
    sortCards(cards, "price-asc");
    expect(cards.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});

describe("parseSort", () => {
  it("accepts known keys and falls back to featured", () => {
    expect(parseSort("price-asc")).toBe("price-asc");
    expect(parseSort("drop table")).toBe("featured");
    expect(parseSort(undefined)).toBe("featured");
    expect(parseSort(["newest"])).toBe("featured");
  });
});

describe("categories", () => {
  it("round-trips slugs", () => {
    expect(categorySlug("Kurtas & Sets")).toBe("kurtas-and-sets");
    expect(categoryFromSlug("kurtas-and-sets")).toBe("Kurtas & Sets");
    expect(categoryFromSlug("nope")).toBeUndefined();
  });
});

describe("stockSignal", () => {
  it("classifies stock levels", () => {
    expect(stockSignal(0)).toBe("sold_out");
    expect(stockSignal(3)).toBe("low");
    expect(stockSignal(4)).toBe("in_stock");
  });
});

import { filterCards, parsePriceBand, parseQuery, parseSize } from "../catalog-shared";

describe("shop search and filters", () => {
  const cards = [
    { slug: "a", keywords: "marigold wrap dress dresses mul cotton", sizes: ["S", "M"], priceFrom: 249900 },
    { slug: "b", keywords: "indigo tiered maxi dresses cotton natural indigo", sizes: ["M", "L"], priceFrom: 329000 },
    { slug: "c", keywords: "chettinad cotton saree sarees", sizes: [], priceFrom: 239000 },
  ];
  const slugs = (f: Parameters<typeof filterCards>[1]) => filterCards(cards, f).map((c) => c.slug);

  it("matches every typed word, in any order and case", () => {
    expect(slugs({ q: "cotton" })).toEqual(["a", "b", "c"]);
    expect(slugs({ q: "Cotton SAREE" })).toEqual(["c"]);
    expect(slugs({ q: "velvet" })).toEqual([]);
  });

  it("filters by a size that is in stock, and by price band", () => {
    expect(slugs({ size: "S" })).toEqual(["a"]);
    expect(slugs({ size: "M" })).toEqual(["a", "b"]);
    expect(slugs({ price: "2000-3000" })).toEqual(["a", "c"]);
    expect(slugs({ price: "3000-4000" })).toEqual(["b"]);
  });

  it("combines filters and returns everything when none are set", () => {
    expect(slugs({ q: "dress", size: "M", price: "3000-4000" })).toEqual(["b"]);
    expect(slugs({})).toEqual(["a", "b", "c"]);
  });

  it("ignores junk in the address bar", () => {
    expect(parseQuery("   ")).toBeUndefined();
    expect(parseQuery(["x"])).toBeUndefined();
    expect(parseQuery("  silk   saree ")).toBe("silk saree");
    expect(parseQuery("x".repeat(200))).toHaveLength(60);
    expect(parseSize("m")).toBe("M");
    expect(parseSize("XXXL")).toBeUndefined();
    expect(parsePriceBand("over-4000")).toBe("over-4000");
    expect(parsePriceBand("free")).toBeUndefined();
  });
});
