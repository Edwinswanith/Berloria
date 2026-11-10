import { describe, expect, it } from "vitest";
import { canTransition, transitionShipment, deriveOrderStatus } from "../fulfillment";
import type { ShipmentState } from "../fulfillment";

const now = new Date("2026-11-07T10:00:00Z");
const placed: ShipmentState = { status: "placed", timeline: [{ status: "placed", at: now }] };

describe("transitionShipment", () => {
  it("follows the happy path to delivered", () => {
    const accepted = transitionShipment(placed, { to: "accepted", at: now });
    const packed = transitionShipment(accepted, { to: "packed", at: now });
    const shipped = transitionShipment(packed, {
      to: "shipped",
      at: now,
      tracking: { carrier: "SF Express", number: "SF123" },
    });
    const delivered = transitionShipment(shipped, { to: "delivered", at: now });
    expect(delivered.status).toBe("delivered");
    expect(delivered.timeline.map((t) => t.status)).toEqual(["placed", "accepted", "packed", "shipped", "delivered"]);
    expect(delivered.tracking?.number).toBe("SF123");
  });

  it("returns a new object and leaves the original untouched", () => {
    const next = transitionShipment(placed, { to: "accepted", at: now });
    expect(next).not.toBe(placed);
    expect(placed.status).toBe("placed");
    expect(placed.timeline).toHaveLength(1);
  });

  it("requires tracking details to ship", () => {
    const packed: ShipmentState = { status: "packed", timeline: [] };
    expect(() => transitionShipment(packed, { to: "shipped", at: now })).toThrow(/tracking/);
  });

  it("requires a reason to cancel", () => {
    expect(() => transitionShipment(placed, { to: "cancelled", at: now })).toThrow(/reason/);
    expect(transitionShipment(placed, { to: "cancelled", at: now, note: "Out of stock" }).status).toBe("cancelled");
  });

  it("rejects skipping steps or moving backwards", () => {
    expect(canTransition("placed", "shipped")).toBe(false);
    expect(canTransition("shipped", "packed")).toBe(false);
    expect(canTransition("delivered", "cancelled")).toBe(false);
    expect(() => transitionShipment(placed, { to: "delivered", at: now })).toThrow(/Cannot move/);
  });
});

describe("deriveOrderStatus", () => {
  it("summarises shipment statuses for the customer", () => {
    expect(deriveOrderStatus(["placed", "placed"])).toBe("placed");
    expect(deriveOrderStatus(["accepted", "placed"])).toBe("processing");
    expect(deriveOrderStatus(["shipped", "packed"])).toBe("partially_shipped");
    expect(deriveOrderStatus(["shipped", "delivered"])).toBe("shipped");
    expect(deriveOrderStatus(["delivered", "delivered"])).toBe("delivered");
    expect(deriveOrderStatus(["delivered", "cancelled"])).toBe("delivered");
    expect(deriveOrderStatus(["cancelled", "cancelled"])).toBe("cancelled");
  });

  it("rejects an order with no shipments", () => {
    expect(() => deriveOrderStatus([])).toThrow();
  });
});
