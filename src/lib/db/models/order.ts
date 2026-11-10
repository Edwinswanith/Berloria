import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { AddressSchema, EtaSchema, MoneySchema, TimelineEventSchema, modelOptions } from "./shared";
import { SHIPMENT_STATUSES } from "@/lib/domain/fulfillment";

export const ORDER_STATUSES = ["placed", "processing", "partially_shipped", "shipped", "delivered", "cancelled"] as const;
export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

/** What the customer paid. Fulfilment lives in `Shipment`, one per vendor. */
const OrderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    /** Unguessable key in the order link, so guests can see their order without an account. */
    accessKey: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    /** Contact for guest checkout (and a copy for signed-in users). */
    contact: {
      name: { type: String, required: true },
      email: { type: String, lowercase: true },
      phone: { type: String },
    },
    shippingAddress: { type: AddressSchema, required: true },
    currency: { type: String, required: true },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    gst: { type: Number, required: true },
    total: { type: Number, required: true },
    /** Rates used at checkout, so totals can always be explained later. */
    fxSnapshot: { type: Map, of: Number, default: {} },
    eta: EtaSchema,
    payment: {
      provider: { type: String, enum: ["razorpay", "manual", "cod", "mock"], default: "mock" },
      status: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
      providerOrderId: String,
      providerPaymentId: String,
      paidAt: Date,
    },
    status: { type: String, enum: ORDER_STATUSES, default: "placed", index: true },
  },
  modelOptions,
);

export type OrderDoc = InferSchemaType<typeof OrderSchema>;
export const Order: Model<OrderDoc> = models.Order ?? model<OrderDoc>("Order", OrderSchema);

const ShipmentLineSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    variantLabel: String,
    image: String,
    quantity: { type: Number, required: true, min: 1 },
    vendorUnitPrice: { type: Number, required: true },
    customerUnitPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
    gstRate: { type: Number, required: true },
    gst: { type: Number, required: true },
  },
  { _id: false },
);

/** One vendor's part of an order. This is the vendor's work queue. */
const ShipmentSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderNumber: { type: String, required: true },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    lines: { type: [ShipmentLineSchema], required: true },
    shippingAddress: { type: AddressSchema, required: true },
    currency: { type: String, required: true },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    gst: { type: Number, required: true },
    total: { type: Number, required: true },
    vendorPayout: { type: MoneySchema, required: true },
    status: { type: String, enum: SHIPMENT_STATUSES, default: "placed", index: true },
    statusSince: { type: Date, default: Date.now },
    timeline: { type: [TimelineEventSchema], default: [] },
    tracking: { carrier: String, number: String, url: String },
    eta: EtaSchema,
    placedAt: { type: Date, required: true },
  },
  modelOptions,
);

ShipmentSchema.index({ vendorId: 1, status: 1, placedAt: -1 });

export type ShipmentDoc = InferSchemaType<typeof ShipmentSchema>;
export const Shipment: Model<ShipmentDoc> = models.Shipment ?? model<ShipmentDoc>("Shipment", ShipmentSchema);

/** Running numbers, e.g. the next order number. */
const CounterSchema = new Schema({ _id: { type: String, required: true }, seq: { type: Number, required: true } }, { versionKey: false });
export type CounterDoc = InferSchemaType<typeof CounterSchema>;
export const Counter: Model<CounterDoc> = models.Counter ?? model<CounterDoc>("Counter", CounterSchema);
