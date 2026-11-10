import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/admin/order-actions";
import { StatusPill, formatDateTime, paymentLabel, statusLabel } from "@/components/admin/order-bits";
import { getAdminOrder } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth/admin";
import { formatMoney } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Order" };

export default async function OrderDetailPage(props: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-muted hover:text-ink">← Orders</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-4xl">{order.orderNumber}</h1>
          <StatusPill status={order.status} />
        </div>
        <p className="mt-1 text-sm text-muted">Placed {formatDateTime(order.placedAt)} · {paymentLabel(order.payment)}</p>
      </div>

      <OrderActions key={order.status} id={order.id} nextSteps={order.nextSteps} blockedByPayment={order.blockedByPayment} />

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="card" aria-labelledby="items-heading">
          <h2 id="items-heading" className="font-serif text-2xl">Items to pack</h2>
          <ul className="mt-4 divide-y divide-line">
            {order.lines.map((l) => (
              <li key={l.sku} className="flex items-center gap-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- small thumbnail in the staff area */}
                <img src={l.image} alt="" className="h-20 w-16 shrink-0 rounded-md bg-mist object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{l.title}</span>
                  <span className="text-sm text-muted">{l.variantLabel ? `Size ${l.variantLabel} · ` : ""}{l.sku}</span>
                </span>
                <span className="text-sm">× {l.quantity}</span>
                <span className="w-20 text-right text-sm tabular-nums">{formatMoney(l.lineTotal, "INR")}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatMoney(order.subtotal, "INR")}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd className="tabular-nums">{order.shipping === 0 ? "Free" : formatMoney(order.shipping, "INR")}</dd></div>
            <div className="flex justify-between font-medium"><dt>Total (incl. {formatMoney(order.gst, "INR")} GST)</dt><dd className="tabular-nums">{formatMoney(order.total, "INR")}</dd></div>
          </dl>
          {order.payment.method === "cod" && order.payment.status !== "paid" && order.status !== "cancelled" && (
            <p className="mt-4 rounded-lg bg-mist px-4 py-3 text-sm">Collect <strong className="font-medium">{formatMoney(order.total, "INR")}</strong> in cash on delivery.</p>
          )}
        </section>

        <div className="space-y-6">
          <section className="card text-sm" aria-labelledby="ship-heading">
            <h2 id="ship-heading" className="font-serif text-2xl">Ship to</h2>
            <address className="mt-3 leading-relaxed not-italic">
              {order.contact.name}<br />
              {order.address.line1}<br />
              {order.address.line2 && <>{order.address.line2}<br /></>}
              {order.address.city}, {order.address.state} {order.address.postalCode}
            </address>
            <p className="mt-3"><a href={`tel:${order.contact.phone}`} className="link-underline">{order.contact.phone}</a></p>
            <p className="mt-1 break-all"><a href={`mailto:${order.contact.email}`} className="link-underline">{order.contact.email}</a></p>
            {order.tracking && <p className="mt-3 text-muted">Sent with {order.tracking.carrier} · {order.tracking.number}</p>}
          </section>

          <section className="card text-sm" aria-labelledby="history-heading">
            <h2 id="history-heading" className="font-serif text-2xl">History</h2>
            <ol className="mt-3 space-y-2" data-testid="order-history">
              {order.timeline.map((t, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{statusLabel(t.status)}{t.note ? <span className="text-muted"> — {t.note}</span> : null}</span>
                  <span className="shrink-0 text-muted">{formatDateTime(t.at)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
