import { describe, expect, it } from "vitest";
import { shopDay, summariseSales, type SaleRecord } from "../sales";

const now = new Date("2026-11-10T09:00:00Z"); // 2:30 pm in Chennai
const sale = (at: string, total: number, over: Partial<SaleRecord> = {}): SaleRecord => ({
  placedAt: new Date(at), total, cancelled: false, awaitingOnlinePayment: false, lines: [{ title: "Marigold Wrap Dress", quantity: 1, lineTotal: total }], ...over,
});

describe("summariseSales", () => {
  it("uses Chennai days, not UTC days", () => {
    expect(shopDay(new Date("2026-11-09T19:00:00Z"))).toBe("2026-11-10"); // 12:30 am IST on the 10th
    const s = summariseSales([sale("2026-11-09T19:00:00Z", 100000), sale("2026-11-09T18:00:00Z", 50000)], now);
    expect(s.today).toEqual({ revenue: 100000, orders: 1 });
    expect(s.last7Days).toEqual({ revenue: 150000, orders: 2 });
  });

  it("leaves out cancelled orders and unpaid online orders", () => {
    const s = summariseSales([
      sale("2026-11-10T05:00:00Z", 200000),
      sale("2026-11-10T05:00:00Z", 300000, { cancelled: true }),
      sale("2026-11-10T05:00:00Z", 400000, { awaitingOnlinePayment: true }),
    ], now);
    expect(s.today).toEqual({ revenue: 200000, orders: 1 });
  });

  it("separates 7-day and 30-day windows and averages the order value", () => {
    const s = summariseSales([sale("2026-11-10T05:00:00Z", 300000), sale("2026-11-01T05:00:00Z", 100000), sale("2026-09-01T05:00:00Z", 900000)], now);
    expect(s.last7Days.orders).toBe(1);
    expect(s.last30Days).toEqual({ revenue: 400000, orders: 2 });
    expect(s.averageOrder).toBe(200000);
  });

  it("gives 14 daily entries, oldest first, with empty days as zero", () => {
    const s = summariseSales([sale("2026-11-10T05:00:00Z", 300000)], now);
    expect(s.daily).toHaveLength(14);
    expect(s.daily[0].date).toBe("2026-10-28");
    expect(s.daily.at(-1)).toEqual({ date: "2026-11-10", revenue: 300000, orders: 1 });
    expect(s.daily[5]).toMatchObject({ revenue: 0, orders: 0 });
  });

  it("ranks products by pieces sold", () => {
    const s = summariseSales([
      sale("2026-11-10T05:00:00Z", 100000, { lines: [{ title: "A", quantity: 1, lineTotal: 100000 }, { title: "B", quantity: 3, lineTotal: 90000 }] }),
      sale("2026-11-09T05:00:00Z", 100000, { lines: [{ title: "A", quantity: 1, lineTotal: 100000 }] }),
    ], now);
    expect(s.topProducts).toEqual([{ title: "B", quantity: 3, revenue: 90000 }, { title: "A", quantity: 2, revenue: 200000 }]);
  });

  it("handles no sales at all", () => {
    const s = summariseSales([], now);
    expect(s.averageOrder).toBe(0);
    expect(s.topProducts).toEqual([]);
  });
});
