import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { requireCustomerId } from "@/lib/auth/customer";
import { formatMoney } from "@/lib/domain/money";
import { getCustomer, listCustomerOrders } from "@/lib/shop/accounts";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

const STATUS_LABEL: Record<string, string> = { placed: "Order placed", accepted: "Confirmed", packed: "Packed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso));

export default function AccountPage() {
  return (
    <div className="container-page pt-10 sm:pt-14">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<div className="h-80 animate-pulse rounded-2xl bg-mist" aria-hidden="true" />}>
          <Account />
        </Suspense>
      </div>
    </div>
  );
}

async function Account() {
  const userId = await requireCustomerId("/account");
  const [customer, orders] = await Promise.all([getCustomer(userId), listCustomerOrders(userId)]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My account</p>
          <h1 className="mt-3 font-serif text-5xl">Hello, {customer?.name.split(" ")[0] || "there"}</h1>
          <p className="mt-2 text-sm text-muted">{customer?.email}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="btn-ghost">Sign out</button>
        </form>
      </div>

      <section className="mt-12" aria-labelledby="orders-heading">
        <h2 id="orders-heading" className="font-serif text-3xl">My orders</h2>
        {orders.length === 0 ? (
          <div className="mt-5 rounded-2xl bg-mist p-8 text-center" data-testid="no-orders">
            <p>You haven&rsquo;t ordered anything yet.</p>
            <Link href="/shop" className="btn-primary mt-5">Start shopping</Link>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-line border-y border-line" data-testid="my-orders">
            {orders.map((o) => (
              <li key={o.orderNumber}>
                <Link href={`/orders/${o.orderNumber}?key=${o.accessKey}`} className="group flex items-center gap-4 py-4">
                  <span className="relative block h-20 w-16 shrink-0 overflow-hidden rounded-md bg-mist">
                    <Image src={o.image} alt="" fill sizes="64px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium group-hover:text-accent">{o.orderNumber}</span>
                    <span className="block truncate text-sm text-muted">
                      {o.firstItem}{o.itemCount > 1 ? ` + ${o.itemCount - 1} more` : ""} · {formatDate(o.placedAt)}
                    </span>
                  </span>
                  <span className="text-right text-sm">
                    <span className="block tabular-nums">{formatMoney(o.total, "INR")}</span>
                    <span className={o.status === "cancelled" ? "text-muted" : o.status === "delivered" ? "text-ok" : "text-accent"}>{STATUS_LABEL[o.status] ?? o.status}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
