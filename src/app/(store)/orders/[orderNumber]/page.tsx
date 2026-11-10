import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderSummary } from "@/components/bag/order-summary";
import { PayNow } from "@/components/checkout/pay-now";
import { CheckIcon } from "@/components/ui/icons";
import { BRAND } from "@/lib/config/brand";
import { formatMoney } from "@/lib/domain/money";
import { getOrderView, type OrderView } from "@/lib/shop/orders";
import { razorpayKeys } from "@/lib/shop/razorpay";

// The link carries the order's private key, so it must never be indexed or leaked to other sites.
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false }, referrer: "no-referrer" };

const STEPS = [
  { status: "placed", label: "Order placed" },
  { status: "accepted", label: "Confirmed" },
  { status: "packed", label: "Packed" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
] as const;

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso));

export default function OrderPage(props: PageProps<"/orders/[orderNumber]">) {
  return (
    <div className="container-page pt-10 sm:pt-14">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-mist" aria-hidden="true" />}>
        <OrderContent params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function OrderContent({ params, searchParams }: Pick<PageProps<"/orders/[orderNumber]">, "params" | "searchParams">) {
  const [{ orderNumber }, query] = await Promise.all([params, searchParams]);
  const key = typeof query.key === "string" ? query.key : "";
  const order = await getOrderView(orderNumber, key);
  if (!order) notFound();

  const cancelled = order.shipmentStatus === "cancelled";
  const awaitingPayment = order.payment.method === "online" && order.payment.status !== "paid" && !cancelled;
  // The thank-you only fits a fresh order; the same link later shows the normal status view.
  const justPlaced = query.placed === "1" && !awaitingPayment && order.shipmentStatus === "placed";
  const keys = razorpayKeys();

  return (
    <>
      {justPlaced ? (
        <header className="rise mb-10" data-testid="order-confirmed">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-ok/10 text-ok"><CheckIcon className="h-6 w-6" /></span>
          <h1 className="mt-5 font-serif text-5xl sm:text-6xl">Thank you, {order.contact.name.split(" ")[0]}.</h1>
          <p className="mt-3 max-w-xl text-muted">
            Your order <strong className="font-medium text-ink">{order.orderNumber}</strong> is in. You can follow it any time under{" "}
            <Link href="/account" className="link-underline">My orders</Link>.
          </p>
          {order.payment.method === "manual" && (
            <p className="mt-5 max-w-xl rounded-2xl bg-blush px-5 py-4 text-sm text-ink-soft" data-testid="contact-notice">
              <strong className="font-medium text-ink">What happens next:</strong> our team will call or message you on{" "}
              <strong className="font-medium text-ink">{order.contact.phone}</strong> (or write to {order.contact.email}) to confirm your order and agree payment and delivery. There is nothing to pay right now.
            </p>
          )}
        </header>
      ) : (
        <header className="mb-10">
          <p className="eyebrow">Order {order.orderNumber}</p>
          <h1 className="mt-3 font-serif text-5xl sm:text-6xl">{cancelled ? "Order cancelled" : awaitingPayment ? "Payment pending" : "Your order"}</h1>
          <p className="mt-2 text-sm text-muted">Placed on {formatDate(order.placedAt)}</p>
        </header>
      )}

      {awaitingPayment && (
        <div className="mb-10 rounded-2xl border border-warn/30 bg-warn/5 p-5" data-testid="payment-pending">
          <p className="font-medium">We haven&rsquo;t received payment for this order yet.</p>
          <p className="mt-1 mb-4 text-sm text-muted">Your items are held for you. Complete the payment to confirm the order.</p>
          {keys && order.payment.providerOrderId ? (
            <PayNow
              label={`Pay ${formatMoney(order.total, "INR")}`}
              request={{ keyId: keys.keyId, providerOrderId: order.payment.providerOrderId, amount: order.total, orderNumber: order.orderNumber, accessKey: key, brand: BRAND.name, customer: order.contact }}
            />
          ) : (
            <p className="text-sm">Please write to {BRAND.supportEmail} to complete this order.</p>
          )}
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-16">
        <div className="space-y-10">
          {!cancelled && <Progress order={order} />}
          {cancelled && <p className="rounded-2xl bg-mist p-5 text-sm">This order was cancelled{order.timeline.at(-1)?.note ? `: ${order.timeline.at(-1)!.note}` : "."} If you paid online, your refund is on its way.</p>}

          <section aria-labelledby="items-heading">
            <h2 id="items-heading" className="font-serif text-3xl">Items</h2>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {order.lines.map((l, i) => (
                <li key={i} className="flex items-center gap-4 py-4">
                  <span className="relative block h-24 w-[4.8rem] shrink-0 overflow-hidden rounded-md bg-mist">
                    <Image src={l.image} alt="" fill sizes="80px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-xl leading-tight">{l.title}</span>
                    <span className="text-sm text-muted">{l.variantLabel ? `Size ${l.variantLabel} · ` : ""}Qty {l.quantity}</span>
                  </span>
                  <span className="text-sm tabular-nums">{formatMoney(l.lineTotal, "INR")}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-5">
          <OrderSummary quote={{ ...order, itemCount: order.lines.reduce((n, l) => n + l.quantity, 0), delivery: undefined }} title="Total" />
          <div className="rounded-2xl border border-line p-5 text-sm">
            <h2 className="font-serif text-2xl">Delivery</h2>
            <address className="mt-3 leading-relaxed text-ink-soft not-italic">
              {order.contact.name}<br />
              {order.address.line1}<br />
              {order.address.line2 && <>{order.address.line2}<br /></>}
              {order.address.city}, {order.address.state} {order.address.postalCode}<br />
              {order.contact.phone}
            </address>
          </div>
          <div className="rounded-2xl border border-line p-5 text-sm">
            <h2 className="font-serif text-2xl">Payment</h2>
            <p className="mt-3 text-ink-soft" data-testid="payment-summary">
              {order.payment.method === "manual"
                ? order.payment.status === "paid" ? "Payment received. Thank you." : `${formatMoney(order.total, "INR")} to pay. Our team will contact you to arrange it.`
                : order.payment.status === "paid" ? "Paid online." : "Online payment not completed."}
            </p>
          </div>
          <p className="text-sm text-muted">Need help? <Link href="/help#contact" className="link-underline">Contact us</Link> with your order number.</p>
        </aside>
      </div>
    </>
  );
}

function Progress({ order }: { order: OrderView }) {
  const reached = STEPS.findIndex((s) => s.status === order.shipmentStatus);
  const timeOf = (status: string) => order.timeline.find((t) => t.status === status)?.at;
  return (
    <section aria-labelledby="progress-heading">
      <h2 id="progress-heading" className="font-serif text-3xl">Progress</h2>
      <ol className="mt-5 space-y-0" data-testid="order-progress">
        {STEPS.map((step, i) => {
          const done = i <= reached;
          const at = timeOf(step.status);
          return (
            <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0" aria-current={i === reached ? "step" : undefined}>
              {i < STEPS.length - 1 && <span aria-hidden="true" className={`absolute top-6 left-[11px] h-full w-px ${i < reached ? "bg-ink" : "bg-line"}`} />}
              <span className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${done ? "border-ink bg-ink text-paper" : "border-line bg-paper"}`}>
                {done && <CheckIcon className="h-3.5 w-3.5" />}
              </span>
              <span>
                <span className={`block text-sm ${done ? "font-medium" : "text-muted"}`}>{step.label}</span>
                {at && <span className="text-xs text-muted">{formatDate(at)}</span>}
                {step.status === "shipped" && order.tracking && (
                  <span className="mt-1 block text-sm text-ink-soft">
                    {order.tracking.carrier} · {order.tracking.url ? <a href={order.tracking.url} target="_blank" rel="noreferrer" className="link-underline">{order.tracking.number}</a> : order.tracking.number}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {order.eta && reached < 3 && <p className="mt-5 text-sm text-muted">Usually arrives {order.eta.minDays}–{order.eta.maxDays} days after it&rsquo;s placed.</p>}
    </section>
  );
}
