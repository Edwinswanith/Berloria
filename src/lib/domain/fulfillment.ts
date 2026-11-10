export const SHIPMENT_STATUSES = ["placed", "accepted", "packed", "shipped", "delivered", "cancelled"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export type OrderStatus = "placed" | "processing" | "partially_shipped" | "shipped" | "delivered" | "cancelled";

export interface Tracking {
  carrier: string;
  number: string;
  url?: string;
}

export interface TimelineEvent {
  status: ShipmentStatus;
  at: Date;
  note?: string;
}

export interface ShipmentState {
  status: ShipmentStatus;
  timeline: readonly TimelineEvent[];
  tracking?: Tracking;
}

export interface TransitionInput {
  to: ShipmentStatus;
  at: Date;
  note?: string;
  tracking?: Tracking;
}

/** Vendor-facing labels. "accepted" is what the vendor sees as "Order received". */
export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  placed: "New order",
  accepted: "Order received",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const TRANSITIONS: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["packed", "shipped", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: ShipmentStatus): readonly ShipmentStatus[] {
  return TRANSITIONS[from];
}

/** Returns a new shipment state with the transition applied. Never mutates `state`. */
export function transitionShipment<T extends ShipmentState>(state: T, input: TransitionInput): T {
  if (!canTransition(state.status, input.to)) {
    throw new Error(`Cannot move a shipment from ${state.status} to ${input.to}`);
  }
  if (input.to === "shipped" && !(input.tracking?.carrier && input.tracking?.number)) {
    throw new Error("A carrier and tracking number are required to mark a shipment as shipped");
  }
  if (input.to === "cancelled" && !input.note?.trim()) {
    throw new Error("A reason is required to cancel a shipment");
  }

  const event: TimelineEvent = { status: input.to, at: input.at, ...(input.note ? { note: input.note } : {}) };
  return {
    ...state,
    status: input.to,
    timeline: [...state.timeline, event],
    ...(input.tracking ? { tracking: { ...input.tracking } } : {}),
  };
}

/** Customer-facing order status derived from its shipments. */
export function deriveOrderStatus(statuses: readonly ShipmentStatus[]): OrderStatus {
  if (statuses.length === 0) throw new Error("An order must have at least one shipment");
  const active = statuses.filter((s) => s !== "cancelled");
  if (active.length === 0) return "cancelled";

  const isOut = (s: ShipmentStatus) => s === "shipped" || s === "delivered";
  if (active.every((s) => s === "delivered")) return "delivered";
  if (active.every(isOut)) return "shipped";
  if (active.some(isOut)) return "partially_shipped";
  if (active.some((s) => s === "accepted" || s === "packed")) return "processing";
  return "placed";
}
