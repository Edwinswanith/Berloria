import Link from "next/link";
import type { AdminOrderRow } from "@/lib/admin/orders";
import { formatMoney } from "@/lib/domain/money";

const STATUS: Record<string, { label: string; style: string }> = {
  placed: { label: "New", style: "bg-accent/10 text-accent" },
  accepted: { label: "Confirmed", style: "bg-warn/10 text-warn" },
  packed: { label: "Packed", style: "bg-warn/10 text-warn" },
  shipped: { label: "Shipped", style: "bg-ink/5 text-ink-soft" },
  delivered: { label: "Delivered", style: "bg-ok/10 text-ok" },
  cancelled: { label: "Cancelled", style: "bg-ink/5 text-muted" },
};

export const statusLabel = (status: string): string => STATUS[status]?.label ?? status;

export function StatusPill({ status }: { status: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs whitespace-nowrap ${STATUS[status]?.style ?? ""}`} data-testid="order-status">{statusLabel(status)}</span>;
}

export function paymentLabel(payment: AdminOrderRow["payment"]): string {
  if (payment.method === "manual") return payment.status === "paid" ? "Payment received" : "Payment to arrange";
  return payment.status === "paid" ? "Paid online" : "Online · not paid";
}

export const formatDateTime = (iso: string): string =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(iso));

export function OrderList({ orders }: { orders: AdminOrderRow[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper" data-testid="admin-orders">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-mist/60">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{o.orderNumber} <span className="font-normal text-muted">· {o.customer}</span></span>
              <span className="mt-0.5 block truncate text-xs text-muted">
                {formatDateTime(o.placedAt)} · {o.city} · {o.itemCount} {o.itemCount === 1 ? "item" : "items"} · {paymentLabel(o.payment)}
              </span>
            </span>
            <span className="text-sm tabular-nums">{formatMoney(o.total, "INR")}</span>
            <StatusPill status={o.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
