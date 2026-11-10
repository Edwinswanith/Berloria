import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { MoneySchema, modelOptions } from "./shared";

/* ---------- Ticket: customer queries and complaints ---------- */
export const TICKET_STATUSES = ["open", "in_progress", "waiting_customer", "resolved", "closed"] as const;

const TicketSchema = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    contact: { name: String, email: String, phone: String },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    shipmentId: { type: Schema.Types.ObjectId, ref: "Shipment" },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", index: true },
    category: { type: String, enum: ["order", "delivery", "product", "payment", "other"], default: "other" },
    subject: { type: String, required: true, maxlength: 200 },
    priority: { type: String, enum: ["low", "normal", "high"], default: "normal" },
    status: { type: String, enum: TICKET_STATUSES, default: "open", index: true },
    /** Who raised it: the customer on the site, or admin logging a call/email. */
    source: { type: String, enum: ["customer", "admin"], default: "customer" },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User" },
    messages: [
      {
        authorId: { type: Schema.Types.ObjectId, ref: "User" },
        authorRole: { type: String, enum: ["customer", "vendor", "admin"], required: true },
        body: { type: String, required: true, maxlength: 4000 },
        internal: { type: Boolean, default: false },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
    firstResponseAt: Date,
    resolvedAt: Date,
  },
  modelOptions,
);
export type TicketDoc = InferSchemaType<typeof TicketSchema>;
export const Ticket: Model<TicketDoc> = models.Ticket ?? model<TicketDoc>("Ticket", TicketSchema);

/* ---------- Notification: in-app for now, email later ---------- */
const NotificationSchema = new Schema(
  {
    audience: { type: String, enum: ["customer", "vendor", "admin"], required: true },
    /** User for customers/admins, Vendor for vendors. Empty = all admins. */
    recipientId: { type: Schema.Types.ObjectId, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "order.placed",
        "shipment.new",
        "shipment.status",
        "shipment.overdue",
        "stock.low",
        "vendor.applied",
        "vendor.reviewed",
        "ticket.created",
        "ticket.updated",
      ],
    },
    title: { type: String, required: true },
    body: String,
    link: String,
    readAt: Date,
  },
  modelOptions,
);
NotificationSchema.index({ audience: 1, recipientId: 1, readAt: 1, createdAt: -1 });
export type NotificationDoc = InferSchemaType<typeof NotificationSchema>;
export const Notification: Model<NotificationDoc> =
  models.Notification ?? model<NotificationDoc>("Notification", NotificationSchema);

/* ---------- ExchangeRate ---------- */
const ExchangeRateSchema = new Schema(
  {
    base: { type: String, required: true, uppercase: true },
    quote: { type: String, required: true, uppercase: true },
    /** One `base` major unit buys `rate` `quote` major units. */
    rate: { type: Number, required: true, min: 0 },
    source: { type: String, default: "manual" },
  },
  modelOptions,
);
ExchangeRateSchema.index({ base: 1, quote: 1 }, { unique: true });
export type ExchangeRateDoc = InferSchemaType<typeof ExchangeRateSchema>;
export const ExchangeRate: Model<ExchangeRateDoc> =
  models.ExchangeRate ?? model<ExchangeRateDoc>("ExchangeRate", ExchangeRateSchema);

/* ---------- Payout: what is owed / paid to each vendor ---------- */
const PayoutSchema = new Schema(
  {
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    shipmentIds: [{ type: Schema.Types.ObjectId, ref: "Shipment" }],
    amount: { type: MoneySchema, required: true },
    status: { type: String, enum: ["owed", "processing", "paid"], default: "owed" },
    reference: String,
    paidAt: Date,
  },
  modelOptions,
);
export type PayoutDoc = InferSchemaType<typeof PayoutSchema>;
export const Payout: Model<PayoutDoc> = models.Payout ?? model<PayoutDoc>("Payout", PayoutSchema);
