import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { AddressSchema, modelOptions } from "./shared";

export const VENDOR_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

const ShippingLaneSchema = new Schema(
  {
    destination: { type: String, required: true, uppercase: true },
    /** Flat fee per shipment in the vendor's currency, minor units. */
    fee: { type: Number, required: true, min: 0 },
    minDays: { type: Number, required: true, min: 0 },
    maxDays: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

/**
 * Bank details are sensitive. They are excluded from queries by default (`select: false`).
 * TODO(phase 3): encrypt at rest with a KMS key before storing real account numbers.
 */
const BankSchema = new Schema(
  {
    accountName: String,
    bankName: String,
    accountNumber: String,
    swiftCode: String,
    branch: String,
  },
  { _id: false },
);

const VendorSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    businessName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    country: { type: String, required: true, uppercase: true },
    currency: { type: String, required: true, uppercase: true },
    contact: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true },
      phone: { type: String, required: true },
    },
    warehouseAddress: { type: AddressSchema, required: true },
    bank: { type: BankSchema, select: false },
    story: String,
    city: String,
    status: { type: String, enum: VENDOR_STATUSES, default: "pending", index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    rejectionReason: String,
    handlingDays: { type: Number, default: 2, min: 0 },
    /** Listed prices already include GST (true for the single Indian seller). */
    pricesIncludeTax: { type: Boolean, default: false },
    shippingLanes: { type: [ShippingLaneSchema], default: [] },
  },
  modelOptions,
);

export type VendorDoc = InferSchemaType<typeof VendorSchema>;
export const Vendor: Model<VendorDoc> = models.Vendor ?? model<VendorDoc>("Vendor", VendorSchema);
