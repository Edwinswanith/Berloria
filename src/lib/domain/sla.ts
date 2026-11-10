import type { ShipmentStatus } from "./fulfillment";

export interface SlaShipment {
  id: string;
  status: ShipmentStatus;
  statusSince: Date;
  placedAt: Date;
  handlingDays: number;
}

export interface SlaPolicy {
  /** Hours a vendor has to accept a new order. */
  acceptHours: number;
}

export type OverdueReason = "not_accepted" | "not_shipped";

export interface OverdueShipment {
  id: string;
  reason: OverdueReason;
  hoursLate: number;
}

export const DEFAULT_SLA: SlaPolicy = { acceptHours: 24 };

const HOUR = 3_600_000;

function deadlineFor(s: SlaShipment, policy: SlaPolicy): { reason: OverdueReason; due: number } | null {
  if (s.status === "placed") return { reason: "not_accepted", due: s.placedAt.getTime() + policy.acceptHours * HOUR };
  if (s.status === "accepted" || s.status === "packed") {
    return { reason: "not_shipped", due: s.placedAt.getTime() + s.handlingDays * 24 * HOUR };
  }
  return null;
}

/** Shipments that have missed their acceptance or dispatch deadline, for admin alerts. */
export function findOverdue(
  shipments: readonly SlaShipment[],
  now: Date,
  policy: SlaPolicy = DEFAULT_SLA,
): OverdueShipment[] {
  return shipments.flatMap((s) => {
    const deadline = deadlineFor(s, policy);
    if (!deadline || now.getTime() <= deadline.due) return [];
    return [{ id: s.id, reason: deadline.reason, hoursLate: Math.floor((now.getTime() - deadline.due) / HOUR) }];
  });
}
