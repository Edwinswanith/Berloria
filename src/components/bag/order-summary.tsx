import { formatMoney } from "@/lib/domain/money";

interface SummaryTotals {
  itemCount: number;
  subtotal: number;
  shipping: number;
  gst: number;
  total: number;
  delivery?: { minDays: number; maxDays: number };
}

/** Totals box shared by the bag, checkout and order pages. */
export function OrderSummary({ quote, title = "Order summary" }: { quote: SummaryTotals; title?: string }) {
  return (
    <div className="rounded-2xl border border-line p-5" data-testid="order-summary">
      <h2 className="font-serif text-2xl">{title}</h2>
      <dl className="mt-4 space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Subtotal ({quote.itemCount} {quote.itemCount === 1 ? "item" : "items"})</dt>
          <dd className="tabular-nums">{formatMoney(quote.subtotal, "INR")}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Delivery</dt>
          <dd className="tabular-nums" data-testid="summary-delivery">{quote.shipping === 0 ? <span className="text-ok">Free</span> : formatMoney(quote.shipping, "INR")}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-base font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums" data-testid="summary-total">{formatMoney(quote.total, "INR")}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-muted">Includes {formatMoney(quote.gst, "INR")} GST.</p>
      {quote.delivery && <p className="mt-1 text-xs text-muted">Arrives in {quote.delivery.minDays}–{quote.delivery.maxDays} days.</p>}
    </div>
  );
}
