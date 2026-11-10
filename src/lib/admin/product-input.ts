import { z } from "zod";
import { CATEGORIES } from "@/lib/data/catalog-shared";
import { apparelGstRate } from "@/lib/domain/tax";

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export const FREE_SIZE = "FREE";
const MAX_PRICE_RUPEES = 500_000;
const MAX_STOCK = 9_999;

const stockCount = z
  .string()
  .trim()
  .transform((v) => (v === "" ? "0" : v))
  .pipe(z.string().regex(/^\d+$/, "Stock must be a whole number"))
  .transform(Number)
  .pipe(z.number().max(MAX_STOCK, `Stock can't be more than ${MAX_STOCK}`));

const schema = z.object({
  title: z.string().trim().min(2, "Give the piece a name").max(120),
  category: z.enum(CATEGORIES, { message: "Choose a category" }),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter the price in rupees, e.g. 2499")
    .transform(Number)
    .pipe(z.number().positive("Price must be more than ₹0").max(MAX_PRICE_RUPEES, "That price looks too high")),
  summary: z.string().trim().max(200).default(""),
  description: z.string().trim().max(4000).default(""),
  story: z.string().trim().max(1000).default(""),
  materials: z.string().trim().max(300).default(""),
  edition: z.string().trim().max(60).default(""),
  featured: z.string().optional(),
  sized: z.string().default("true"),
  stock: z.record(z.string(), stockCount),
});

export interface ProductInput {
  title: string;
  category: (typeof CATEGORIES)[number];
  pricePaise: number;
  gstRate: number;
  summary: string;
  description: string;
  story: string;
  materials: string[];
  edition: string;
  featured: boolean;
  /** Units per size, or { FREE: n } for free-size pieces. */
  stock: Record<string, number>;
}

export type ParseResult = { success: true; data: ProductInput } | { success: false; errors: Record<string, string> };

/** Validates the admin product form. Everything arrives as strings from FormData. */
export function parseProductInput(raw: unknown): ParseResult {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.reduce<Record<string, string>>((acc, issue) => {
      const field = String(issue.path[0] ?? "form");
      return acc[field] ? acc : { ...acc, [field]: issue.message };
    }, {});
    return { success: false, errors };
  }
  const v = parsed.data;
  const pricePaise = Math.round(v.price * 100);
  const sized = v.sized !== "false";
  const stock = sized
    ? Object.fromEntries(SIZES.map((s) => [s, v.stock[s] ?? 0]))
    : { [FREE_SIZE]: v.stock[FREE_SIZE] ?? 0 };
  return {
    success: true,
    data: {
      title: v.title,
      category: v.category,
      pricePaise,
      gstRate: apparelGstRate(pricePaise),
      summary: v.summary,
      description: v.description,
      story: v.story,
      materials: v.materials.split(",").map((m) => m.trim()).filter(Boolean),
      edition: v.edition,
      featured: v.featured === "on" || v.featured === "true",
      stock,
    },
  };
}

export function slugify(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "item";
}

/** e.g. "Marigold Wrap Dress" + id …abcd → "MWD-ABCD". Unique because the id is. */
export function skuPrefix(title: string, id: string): string {
  const words = slugify(title).split("-").filter(Boolean);
  const letters = words.length >= 2 ? words.slice(0, 3).map((w) => w[0]).join("") : (words[0] ?? "itm").slice(0, 3);
  return `${letters.toUpperCase()}-${id.slice(-4).toUpperCase()}`;
}

export interface PublishCheck {
  imageCount: number;
  variants: { price: number; stock: number }[];
  description: string;
}

/** Reasons a product can't go live yet, in the words shown to staff. Empty = ready. */
export function publishBlockers(p: PublishCheck): string[] {
  return [
    ...(p.imageCount > 0 ? [] : ["Add at least one photo to the gallery."]),
    ...(p.description.trim() ? [] : ["Add a description."]),
    ...(p.variants.some((v) => v.stock > 0) ? [] : ["Add stock for at least one size."]),
  ];
}
