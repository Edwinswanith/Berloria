/** Sales figures for the staff dashboard. Pure: give it orders and "now", get numbers back. */
export interface SaleRecord {
  placedAt: Date;
  /** Paise. */
  total: number;
  cancelled: boolean;
  /** Online orders only count once paid; cash-on-delivery orders count when placed. */
  awaitingOnlinePayment: boolean;
  lines: readonly { title: string; quantity: number; lineTotal: number }[];
}

export interface Period {
  revenue: number;
  orders: number;
}

export interface SalesSummary {
  today: Period;
  last7Days: Period;
  last30Days: Period;
  averageOrder: number;
  /** Oldest first, one entry per day including days with no sales. */
  daily: { date: string; revenue: number; orders: number }[];
  topProducts: { title: string; quantity: number; revenue: number }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** India has one time zone and no daylight saving, so shop days are fixed UTC+5:30 days. */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAILY_DAYS = 14;
const TOP_PRODUCTS = 5;

/** Calendar day in the shop's time zone, as YYYY-MM-DD. */
export const shopDay = (at: Date, offsetMs = IST_OFFSET_MS): string => new Date(at.getTime() + offsetMs).toISOString().slice(0, 10);

const counts = (r: SaleRecord): boolean => !r.cancelled && !r.awaitingOnlinePayment;
const sum = (records: readonly SaleRecord[]): Period => ({ revenue: records.reduce((n, r) => n + r.total, 0), orders: records.length });

export function summariseSales(records: readonly SaleRecord[], now: Date, offsetMs = IST_OFFSET_MS): SalesSummary {
  const sales = records.filter(counts);
  const today = shopDay(now, offsetMs);
  const startOfToday = Date.parse(`${today}T00:00:00Z`) - offsetMs;
  const since = (days: number) => sales.filter((r) => r.placedAt.getTime() >= startOfToday - (days - 1) * DAY_MS);

  const daily = Array.from({ length: DAILY_DAYS }, (_, i) => {
    const date = shopDay(new Date(startOfToday + offsetMs - (DAILY_DAYS - 1 - i) * DAY_MS), 0);
    return { date, ...sum(sales.filter((r) => shopDay(r.placedAt, offsetMs) === date)) };
  });

  const byTitle = new Map<string, { quantity: number; revenue: number }>();
  for (const line of since(30).flatMap((r) => r.lines)) {
    const current = byTitle.get(line.title) ?? { quantity: 0, revenue: 0 };
    byTitle.set(line.title, { quantity: current.quantity + line.quantity, revenue: current.revenue + line.lineTotal });
  }
  const last30Days = sum(since(30));

  return {
    today: sum(since(1)),
    last7Days: sum(since(7)),
    last30Days,
    averageOrder: last30Days.orders ? Math.round(last30Days.revenue / last30Days.orders) : 0,
    daily,
    topProducts: [...byTitle].map(([title, v]) => ({ title, ...v })).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, TOP_PRODUCTS),
  };
}
