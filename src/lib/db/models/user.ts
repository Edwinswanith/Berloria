import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { AddressSchema, modelOptions } from "./shared";

export const USER_ROLES = ["customer", "vendor", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const UserSchema = new Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    /** E.164, e.g. +919876543210 */
    phone: { type: String, trim: true, unique: true, sparse: true, match: /^\+[1-9]\d{6,14}$/ },
    /** scrypt hash, never returned by default queries. */
    passwordHash: { type: String, select: false },
    emailVerifiedAt: Date,
    phoneVerifiedAt: Date,
    roles: { type: [String], enum: USER_ROLES, default: ["customer"] },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    addresses: { type: [AddressSchema], default: [] },
    country: { type: String, uppercase: true, default: "IN" },
    lastLoginAt: Date,
  },
  modelOptions,
);

UserSchema.pre("validate", function () {
  if (!this.email && !this.phone) throw new Error("A user needs an email or a phone number");
});

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const User: Model<UserDoc> = models.User ?? model<UserDoc>("User", UserSchema);
