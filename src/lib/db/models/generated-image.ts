import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { modelOptions } from "./shared";

export const GENERATED_STATUSES = ["generating", "ready", "approved", "rejected", "failed"] as const;
export type GeneratedStatus = (typeof GENERATED_STATUSES)[number];

/**
 * One AI-generated candidate photo for a product. Staff review each one against the real
 * garment; only `approved` images are copied into the product's customer-facing gallery.
 */
const GeneratedImageSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    /** Shot preset id, e.g. "model-front" (see src/lib/ai/shots.ts). */
    shot: { type: String, required: true },
    status: { type: String, enum: GENERATED_STATUSES, default: "generating" },
    url: String,
    prompt: { type: String, required: true },
    /** Which generator produced it, e.g. "gemini-nano-banana-2.1" or "mock". */
    generator: { type: String, required: true },
    error: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  modelOptions,
);
GeneratedImageSchema.index({ productId: 1, shot: 1, createdAt: -1 });

export type GeneratedImageDoc = InferSchemaType<typeof GeneratedImageSchema>;
export const GeneratedImage: Model<GeneratedImageDoc> =
  models.GeneratedImage ?? model<GeneratedImageDoc>("GeneratedImage", GeneratedImageSchema);
