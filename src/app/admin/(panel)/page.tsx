import type { Metadata } from "next";
import Link from "next/link";
import { ToContactList } from "@/components/admin/contact-bits";
import { OrderList } from "@/components/admin/order-bits";
import { getDashboard } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth/admin";
import { formatMoney } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Dashboard" };

const shortDay = (date: string): string => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

export default async function Dashboard() {
  await requireAdmin();
  const { sales, toContact, toFulfil, unpaid, recent, lowStock } = await getDashboard();
  const peak = Math.max(1, ...sales.daily.map((d) => d.revenue));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Today at a glance</p>
          <h1 className="mt-2 font-serif text-4xl">Dashboard</h1>
        </div>
        <Link href="/admin/products/new" className="btn-primary">Add a dress</Link>
      </div>

      {toContact.length > 0 && <ToContactList orders={toContact} />}

      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="sales-stats">
        {[
          ["Sales today", formatMoney(sales.today.revenue, "INR"), `${sales.today.orders} ${sales.today.orders === 1 ? "order" : "orders"}`],
          ["Last 7 days", formatMoney(sales.last7Days.revenue, "INR"), `${sales.last7Days.orders} orders`],
          ["Last 30 days", formatMoney(sales.last30Days.revenue, "INR"), `${sales.last30Days.orders} orders`],
          ["Average order", formatMoney(sales.averageOrder, "INR"), "over 30 days"],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-2xl border border-line bg-paper p-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 font-serif text-3xl tabular-nums">{value}</dd>
            <dd className="mt-0.5 text-xs text-muted">{note}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Link href="/admin/orders?show=to-fulfil" className="flex items-center justify-between rounded-2xl border border-line bg-paper p-4 transition-colors hover:border-ink" data-testid="to-fulfil">
          <span>
            <span className="block text-sm font-medium">Orders to pack and ship</span>
            <span className="text-xs text-muted">{toFulfil === 0 ? "All caught up" : "Waiting for you"}</span>
          </span>
          <span className={`font-serif text-4xl tabular-nums ${toFulfil > 0 ? "text-accent" : ""}`}>{toFulfil}</span>
        </Link>
        <Link href="/admin/orders?show=unpaid" className="flex items-center justify-between rounded-2xl border border-line bg-paper p-4 transition-colors hover:border-ink">
          <span>
            <span className="block text-sm font-medium">Online payments not completed</span>
            <span className="text-xs text-muted">Stock is held for these; cancel to release it</span>
          </span>
          <span className="font-serif text-4xl tabular-nums">{unpaid}</span>
        </Link>
      </div>

      <section className="card mt-6" aria-labelledby="chart-heading">
        <h2 id="chart-heading" className="font-serif text-2xl">Sales, last 14 days</h2>
        <div className="mt-6 flex h-40 items-end gap-1.5 sm:gap-2" role="img" aria-label={`Daily sales for the last 14 days. Total ${formatMoney(sales.daily.reduce((n, d) => n + d.revenue, 0), "INR")}.`}>
          {sales.daily.map((d) => (
            <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end" title={`${shortDay(d.date)}: ${formatMoney(d.revenue, "INR")} · ${d.orders} orders`}>
              <div className={`rounded-t-sm transition-colors ${d.revenue > 0 ? "bg-ink/80 group-hover:bg-accent" : "bg-line"}`} style={{ height: d.revenue > 0 ? `${Math.max(4, (d.revenue / peak) * 100)}%` : "2px" }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          <span>{shortDay(sales.daily[0].date)}</span>
          <span>{shortDay(sales.daily.at(-1)!.date)}</span>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card" aria-labelledby="top-heading">
          <h2 id="top-heading" className="font-serif text-2xl">Bestsellers, 30 days</h2>
          {sales.topProducts.length === 0 ? <p className="mt-3 text-sm text-muted">No sales yet.</p> : (
            <ol className="mt-4 space-y-3 text-sm">
              {sales.topProducts.map((p, i) => (
                <li key={p.title} className="flex items-baseline gap-3">
                  <span className="w-4 text-muted tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  <span className="text-muted tabular-nums">{p.quantity} sold</span>
                  <span className="w-20 text-right tabular-nums">{formatMoney(p.revenue, "INR")}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card" aria-labelledby="stock-heading">
          <h2 id="stock-heading" className="font-serif text-2xl">Running low</h2>
          {lowStock.length === 0 ? <p className="mt-3 text-sm text-muted">Every live style has stock.</p> : (
            <ul className="mt-4 space-y-3 text-sm">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-baseline justify-between gap-3">
                  <Link href={`/admin/products/${p.id}`} className="min-w-0 truncate hover:text-accent">{p.title}</Link>
                  <span className={p.left === 0 ? "text-accent" : "text-warn"}>{p.left === 0 ? "Sold out" : `${p.left} left`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8" aria-labelledby="recent-heading">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="recent-heading" className="font-serif text-2xl">Latest orders</h2>
          <Link href="/admin/orders" className="link-underline text-sm">All orders</Link>
        </div>
        {recent.length === 0 ? <p className="card text-sm text-muted">No orders yet.</p> : <OrderList orders={recent} />}
      </section>
    </>
  );
}
