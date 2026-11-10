import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { MAX_GST_RATE } from "@/lib/domain/pricing";
import { modelOptions } from "./shared";

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export const IMAGE_KINDS = ["model", "flat", "detail", "other"] as const;
export const SOURCE_VIEWS = ["front", "back", "side"] as const;
export type SourceView = (typeof SOURCE_VIEWS)[number];

const VariantSchema = new Schema(
  {
    sku: { type: String, required: true, trim: true },
    /** e.g. { Size: "M", Colour: "Indigo" } */
    options: { type: Map, of: String, default: {} },
    /** Vendor's price in the vendor's currency, minor units. */
    price: { type: Number, required: true, min: 0, validate: Number.isInteger },
    stock: { type: Number, required: true, min: 0, default: 0 },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

const ProductSchema = new Schema(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    summary: { type: String, trim: true },
    /** May be empty while a product is a draft; required to publish. */
    description: { type: String, default: "" },
    /** The maker's story — the heart of a one-of-a-kind listing. */
    story: String,
    materials: [String],
    category: { type: String, required: true, index: true },
    tags: { type: [String], default: [] },
    /** The gallery customers see, in display order. */
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String, required: true },
        kind: { type: String, enum: IMAGE_KINDS, default: "other" },
        /** True when produced by the AI photo studio rather than a camera. */
        ai: { type: Boolean, default: false },
        _id: false,
      },
    ],
    /** Raw photos of the real garment uploaded by staff; the AI studio works from these. Never shown to customers. */
    sourcePhotos: [
      {
        url: { type: String, required: true },
        view: { type: String, enum: SOURCE_VIEWS, required: true },
        _id: false,
      },
    ],
    /** Option names and allowed values, e.g. [{ name: "Size", values: ["S","M"] }] */
    options: [{ name: String, values: [String], _id: false }],
    variants: { type: [VariantSchema], validate: (v: unknown[]) => v.length > 0 },
    currency: { type: String, required: true, uppercase: true },
    gstRate: { type: Number, required: true, min: 0, max: MAX_GST_RATE, default: 0.12 },
    hsnCode: String,
    status: { type: String, enum: PRODUCT_STATUSES, default: "draft", index: true },
    featured: { type: Boolean, default: false },
    edition: { type: String, trim: true },
    rating: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
  },
  modelOptions,
);

ProductSchema.index({ "variants.sku": 1 }, { unique: true });
ProductSchema.index({ title: "text", summary: "text", tags: "text" });

export type ProductDoc = InferSchemaType<typeof ProductSchema>;
export const Product: Model<ProductDoc> = models.Product ?? model<ProductDoc>("Product", ProductSchema);
