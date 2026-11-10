import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { modelOptions } from "./shared";

/* ---------- Cart ---------- */
const CartSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },
    guestToken: { type: String, unique: true, sparse: true },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        sku: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        _id: false,
      },
    ],
    /** Guest carts expire after 30 days of inactivity. */
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  modelOptions,
);
export type CartDoc = InferSchemaType<typeof CartSchema>;
export const Cart: Model<CartDoc> = models.Cart ?? model<CartDoc>("Cart", CartSchema);

/* ---------- Wishlist ---------- */
const WishlistSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    productIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  },
  modelOptions,
);
export type WishlistDoc = InferSchemaType<typeof WishlistSchema>;
export const Wishlist: Model<WishlistDoc> = models.Wishlist ?? model<WishlistDoc>("Wishlist", WishlistSchema);

/* ---------- Review ---------- */
const ReviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    body: { type: String, maxlength: 4000 },
    verifiedPurchase: { type: Boolean, default: false },
    status: { type: String, enum: ["published", "hidden"], default: "published" },
  },
  modelOptions,
);
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
export type ReviewDoc = InferSchemaType<typeof ReviewSchema>;
export const Review: Model<ReviewDoc> = models.Review ?? model<ReviewDoc>("Review", ReviewSchema);
