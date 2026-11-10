/** Sample catalogue for local development. Prices are in paise and include GST. */
import { apparelGstRate } from "@/lib/domain/tax";

export type ArtKind = "dress" | "kurta" | "coord" | "saree";
export type SeedCategory = "Dresses" | "Kurtas & Sets" | "Co-ords" | "Sarees";

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export const SEED_STORE = {
  businessName: "Berloria Fashions",
  slug: "berloria-fashions",
  city: "Chennai",
  state: "Tamil Nadu",
  postalCode: "600017",
  story: "A Chennai label for women, designing and finishing every piece in its own workroom.",
  handlingDays: 1,
  /** Flat delivery fee within India, in paise, and courier days. */
  lane: { fee: 7900, minDays: 2, maxDays: 5 },
  owner: { name: "Store Owner", phone: "+919800000000" },
} as const;

export interface SeedVariant {
  sku: string;
  options: Record<string, string>;
  price: number;
  stock: number;
}

export interface SeedProduct {
  slug: string;
  title: string;
  category: SeedCategory;
  summary: string;
  description: string;
  story: string;
  materials: string[];
  edition: string;
  featured?: boolean;
  gstRate: number;
  options: { name: string; values: string[] }[];
  variants: SeedVariant[];
  art: { kind: ArtKind; color: string; accent: string; bg: string };
}

interface Draft extends Omit<SeedProduct, "gstRate" | "options" | "variants"> {
  sku: string;
  /** Price in rupees, GST included. */
  price: number;
  /** Stock per size, XS → XXL. Omit for free-size pieces (sarees). */
  stock: number[] | number;
}

function build(d: Draft): SeedProduct {
  const { sku, price, stock, ...rest } = d;
  const paise = price * 100;
  const sized = Array.isArray(stock);
  return {
    ...rest,
    gstRate: apparelGstRate(paise),
    options: sized ? [{ name: "Size", values: [...SIZES] }] : [],
    variants: sized
      ? SIZES.map((size, i) => ({ sku: `${sku}-${size}`, options: { Size: size }, price: paise, stock: stock[i] ?? 0 }))
      : [{ sku, options: {}, price: paise, stock }],
  };
}

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    slug: "indigo-tiered-maxi", title: "Indigo Tiered Maxi", category: "Dresses", featured: true, sku: "ITM", price: 3290,
    summary: "A three-tier maxi in hand-dyed indigo cotton.",
    description: "Square neck, adjustable tie-back and deep side pockets. The tiers are gathered by hand so the skirt moves without adding bulk. Fully lined to the knee.",
    story: "Dyed in small vats, so the blue shifts a little from piece to piece.",
    materials: ["100% cotton", "Natural indigo"], edition: "Limited run of 40", stock: [3, 6, 8, 7, 4, 2],
    art: { kind: "dress", color: "#2f4268", accent: "#e8dcc4", bg: "#f2efe9" },
  },
  {
    slug: "marigold-wrap-dress", title: "Marigold Wrap Dress", category: "Dresses", featured: true, sku: "MWD", price: 2499,
    summary: "A true wrap dress in marigold mul cotton.",
    description: "Wraps and ties at the waist, so it adjusts across a size. Elbow sleeves, midi length, hidden snap at the neckline.",
    story: "Cut from mul so light it dries in an hour on a Chennai afternoon.",
    materials: ["Mul cotton"], edition: "New this week", stock: [0, 2, 6, 5, 3, 0],
    art: { kind: "dress", color: "#d99a2b", accent: "#8c4a2f", bg: "#f5f1e8" },
  },
  {
    slug: "kanchi-check-midi", title: "Kanchi Check Midi", category: "Dresses", sku: "KCM", price: 2890,
    summary: "A shirt-waist midi in woven Kanchi cotton checks.",
    description: "Button front, notch collar and a removable belt. The checks are woven, not printed, and matched at the side seams.",
    story: "Woven on handlooms an hour outside the city.",
    materials: ["Handloom cotton"], edition: "Handloom", stock: [2, 5, 7, 6, 3, 1],
    art: { kind: "dress", color: "#7b2f3a", accent: "#e9c46a", bg: "#f3efe9" },
  },
  {
    slug: "jasmine-shirt-dress", title: "Jasmine Shirt Dress", category: "Dresses", sku: "JSD", price: 2190,
    summary: "An easy white shirt dress with pintucks.",
    description: "Relaxed fit, knee length, rolled-tab sleeves. Twelve rows of pintucks down the front placket.",
    story: "Our take on the one white dress everyone ends up living in.",
    materials: ["Cotton poplin"], edition: "Bestseller", stock: [4, 9, 12, 10, 6, 3],
    art: { kind: "dress", color: "#f4f1ea", accent: "#b9b2a3", bg: "#e9ece8" },
  },
  {
    slug: "temple-border-shift", title: "Temple Border Shift", category: "Dresses", sku: "TBS", price: 2690,
    summary: "A straight shift finished with a temple-border hem.",
    description: "Boat neck, cap sleeves and side slits. The hem border is cut from a saree length and mitred at the slits.",
    story: "Each border comes from a different saree, so the hem varies.",
    materials: ["Cotton silk"], edition: "One border, one dress", stock: [1, 3, 4, 3, 2, 0],
    art: { kind: "dress", color: "#1f5d50", accent: "#d4a23a", bg: "#f2efe8" },
  },
  {
    slug: "mul-cotton-sundress", title: "Mul Cotton Sundress", category: "Dresses", sku: "MCS", price: 1890,
    summary: "A strappy sundress in block-printed mul.",
    description: "Adjustable straps, smocked back and a full skirt. Lined through the bodice.",
    story: "Printed by hand with a carved teak block, one repeat at a time.",
    materials: ["Mul cotton", "Hand block print"], edition: "Hand block printed", stock: [3, 7, 9, 8, 4, 2],
    art: { kind: "dress", color: "#e6b8a2", accent: "#9b4a3c", bg: "#f4f1eb" },
  },
  {
    slug: "chanderi-anarkali", title: "Chanderi Anarkali", category: "Kurtas & Sets", featured: true, sku: "CAK", price: 4890,
    summary: "A floor-length anarkali in sheer Chanderi with a cotton lining.",
    description: "Twenty-four panels flare from an empire waist. Comes with a matching lining and a dupatta finished in zari.",
    story: "The panels take a full day to cut and join.",
    materials: ["Chanderi silk cotton", "Zari"], edition: "Festive", stock: [1, 3, 5, 4, 2, 1],
    art: { kind: "kurta", color: "#7a3b5e", accent: "#d9b56a", bg: "#f3efea" },
  },
  {
    slug: "madras-check-kurta-set", title: "Madras Check Kurta Set", category: "Kurtas & Sets", sku: "MKS", price: 3190,
    summary: "A straight kurta and trousers in classic Madras checks.",
    description: "Mandarin collar, side slits and two pockets. Paired with solid straight trousers with an elasticated back.",
    story: "Madras checks, made where they were named.",
    materials: ["Cotton"], edition: "Set of 2", stock: [3, 6, 9, 8, 5, 2],
    art: { kind: "kurta", color: "#c2553f", accent: "#2f4268", bg: "#f1efe9" },
  },
  {
    slug: "kalamkari-straight-kurta", title: "Kalamkari Straight Kurta", category: "Kurtas & Sets", sku: "KSK", price: 1790,
    summary: "A hand-drawn kalamkari kurta in earthy tones.",
    description: "Round neck with a keyhole, three-quarter sleeves, calf length.",
    story: "Drawn with a bamboo pen and vegetable dyes.",
    materials: ["Cotton", "Vegetable dyes"], edition: "Hand drawn", stock: [4, 8, 10, 9, 5, 3],
    art: { kind: "kurta", color: "#b08a5a", accent: "#5a3a2a", bg: "#f2f0ea" },
  },
  {
    slug: "ikat-a-line-kurta", title: "Ikat A-line Kurta", category: "Kurtas & Sets", sku: "IAK", price: 1990,
    summary: "An A-line kurta in tied-and-dyed ikat.",
    description: "V-neck, elbow sleeves and a gentle flare. Pockets in both side seams.",
    story: "The yarn is tie-dyed before weaving, which gives ikat its soft edges.",
    materials: ["Handloom ikat cotton"], edition: "Handloom", stock: [2, 5, 8, 7, 4, 1],
    art: { kind: "kurta", color: "#2d6a77", accent: "#f0e6d2", bg: "#eef0ec" },
  },
  {
    slug: "block-print-kurta-set", title: "Block Print Kurta Set", category: "Kurtas & Sets", sku: "BPK", price: 2790,
    summary: "A printed kurta, trousers and dupatta.",
    description: "Straight kurta with a notched neck, tapered trousers and a mul dupatta with tassels.",
    story: "Three pieces printed from the same set of blocks.",
    materials: ["Cotton", "Hand block print"], edition: "Set of 3", stock: [2, 6, 7, 6, 3, 2],
    art: { kind: "kurta", color: "#e4d4b8", accent: "#a14a3b", bg: "#eceee9" },
  },
  {
    slug: "ajrakh-co-ord", title: "Ajrakh Co-ord", category: "Co-ords", featured: true, sku: "AJC", price: 3490,
    summary: "A boxy shirt and wide trousers in ajrakh print.",
    description: "Camp-collar shirt with a relaxed fit, and high-waisted wide trousers with pockets. Wear together or apart.",
    story: "Ajrakh is printed on both sides of the cloth, over fourteen stages.",
    materials: ["Modal", "Ajrakh print"], edition: "Limited run of 30", stock: [2, 4, 6, 5, 2, 1],
    art: { kind: "coord", color: "#8a2f2a", accent: "#1f2f4a", bg: "#f3f0ea" },
  },
  {
    slug: "linen-co-ord-set", title: "Linen Co-ord Set", category: "Co-ords", sku: "LCS", price: 3890,
    summary: "A sleeveless top and culottes in washed linen.",
    description: "Shell top with a back button, and pleated culottes that sit at the natural waist.",
    story: "Pre-washed, so it arrives soft and stays the size you bought.",
    materials: ["Linen"], edition: "Everyday", stock: [3, 5, 7, 6, 4, 2],
    art: { kind: "coord", color: "#c9bfa8", accent: "#8c7f66", bg: "#eef0ec" },
  },
  {
    slug: "handloom-shirt-and-trouser", title: "Handloom Shirt & Trouser", category: "Co-ords", sku: "HST", price: 2990,
    summary: "A striped handloom shirt with matching trousers.",
    description: "Oversized shirt with dropped shoulders and straight trousers with a drawstring waist.",
    story: "The stripe is woven in, so it looks the same inside and out.",
    materials: ["Handloom cotton"], edition: "Handloom", stock: [2, 4, 5, 5, 3, 1],
    art: { kind: "coord", color: "#5f7a6a", accent: "#f0ead8", bg: "#f2f0ea" },
  },
  {
    slug: "chettinad-cotton-saree", title: "Chettinad Cotton Saree", category: "Sarees", featured: true, sku: "CCS", price: 2390,
    summary: "A crisp Chettinad cotton saree with a contrast border.",
    description: "5.5 metres with a broad contrast border and a striped pallu. Comes with an unstitched blouse piece.",
    story: "Chettinad cottons are known for bold colour pairs. This one is mustard and maroon.",
    materials: ["Cotton"], edition: "With blouse piece", stock: 6,
    art: { kind: "saree", color: "#d6a21e", accent: "#7b1f2b", bg: "#f3f0e9" },
  },
  {
    slug: "kanchi-cotton-saree", title: "Kanchi Cotton Saree", category: "Sarees", sku: "KCS", price: 2890,
    summary: "A Kanchi cotton saree with a temple border.",
    description: "5.5 metres, temple-motif border on both sides and a rich pallu. Comes with an unstitched blouse piece.",
    story: "The same looms that weave Kanchipuram silk, set up for cotton.",
    materials: ["Cotton"], edition: "With blouse piece", stock: 2,
    art: { kind: "saree", color: "#215b63", accent: "#d9b04a", bg: "#f1efe9" },
  },
].map((d) => build(d as Draft));
