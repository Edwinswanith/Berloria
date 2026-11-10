import Link from "next/link";
import type { AdminOrderRow } from "@/lib/admin/orders";
import { BRAND } from "@/lib/config/brand";
import { whatsappLink } from "@/lib/domain/contact";
import { formatMoney } from "@/lib/domain/money";
import { formatDateTime } from "./order-bits";

interface ContactLinksProps {
  orderNumber: string;
  customer: string;
  phone: string;
  email: string;
}

/** Call, WhatsApp or email the customer in one tap. */
export function ContactLinks({ orderNumber, customer, phone, email }: ContactLinksProps) {
  const hello = `Hello ${customer.split(" ")[0]}, this is ${BRAND.name} about your order ${orderNumber}.`;
  return (
    <div className="flex flex-wrap gap-2" data-testid="contact-links">
      <a href={`tel:${phone}`} className="btn-sm-primary">Call {phone}</a>
      <a href={whatsappLink(phone, hello)} target="_blank" rel="noreferrer" className="btn-sm">WhatsApp</a>
      <a href={`mailto:${email}?subject=${encodeURIComponent(`Your ${BRAND.name} order ${orderNumber}`)}`} className="btn-sm">Email</a>
    </div>
  );
}

/** New orders nobody has rung yet. Each leaves the list when staff confirm or cancel it. */
export function ToContactList({ orders }: { orders: AdminOrderRow[] }) {
  return (
    <section className="mt-8 rounded-2xl border border-accent/30 bg-blush/50 p-5 sm:p-7" aria-labelledby="contact-heading" data-testid="to-contact">
      <h2 id="contact-heading" className="font-serif text-2xl">
        {orders.length === 1 ? "1 new order to call" : `${orders.length} new orders to call`}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Ring the customer to confirm the order and agree payment, then open the order and confirm it.</p>
      <ul className="mt-5 space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="rounded-xl border border-line bg-paper p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-accent">{o.orderNumber} · {o.customer}</Link>
              <span className="text-sm tabular-nums">{formatMoney(o.total, "INR")}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {formatDateTime(o.placedAt)} · {o.city} · {o.itemCount} {o.itemCount === 1 ? "item" : "items"} · <span className="break-all">{o.email}</span>
            </p>
            <div className="mt-3"><ContactLinks orderNumber={o.orderNumber} customer={o.customer} phone={o.phone} email={o.email} /></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
