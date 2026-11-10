import { describe, expect, it } from "vitest";
import { findOverdue } from "../sla";

const h = (hours: number) => new Date(Date.UTC(2026, 10, 1) + hours * 3600_000);

describe("findOverdue", () => {
  const now = h(100);

  it("flags shipments not accepted within the acceptance window", () => {
    const result = findOverdue(
      [
        { id: "a", status: "placed", statusSince: h(70), placedAt: h(70), handlingDays: 2 },
        { id: "b", status: "placed", statusSince: h(90), placedAt: h(90), handlingDays: 2 },
      ],
      now,
      { acceptHours: 24 },
    );
    expect(result).toEqual([{ id: "a", reason: "not_accepted", hoursLate: 6 }]);
  });

  it("flags shipments not shipped within the vendor's handling days", () => {
    const result = findOverdue(
      [{ id: "c", status: "packed", statusSince: h(60), placedAt: h(40), handlingDays: 2 }],
      now,
      { acceptHours: 24 },
    );
    expect(result).toEqual([{ id: "c", reason: "not_shipped", hoursLate: 12 }]);
  });

  it("ignores shipped, delivered and cancelled shipments", () => {
    const result = findOverdue(
      ["shipped", "delivered", "cancelled"].map((status, i) => ({
        id: String(i),
        status: status as "shipped",
        statusSince: h(0),
        placedAt: h(0),
        handlingDays: 1,
      })),
      now,
      { acceptHours: 24 },
    );
    expect(result).toEqual([]);
  });
});
