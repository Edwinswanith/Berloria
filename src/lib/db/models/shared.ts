import { Schema } from "mongoose";
import { SHIPMENT_STATUSES } from "@/lib/domain/fulfillment";

export const MoneySchema = new Schema(
  {
    amount: { type: Number, required: true, validate: Number.isInteger },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
  },
  { _id: false },
);

export const AddressSchema = new Schema(
  {
    label: String,
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, uppercase: true, minlength: 2, maxlength: 2 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

export const TimelineEventSchema = new Schema(
  {
    status: { type: String, enum: SHIPMENT_STATUSES, required: true },
    at: { type: Date, required: true },
    note: String,
    by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

export const EtaSchema = new Schema({ minDays: Number, maxDays: Number }, { _id: false });

/** Re-use a compiled model during hot reload instead of redefining it. */
export const modelOptions = { timestamps: true } as const;
