import type { Metadata } from "next";
import Link from "next/link";
import { OrderList } from "@/components/admin/order-bits";
import { listAdminOrders, type OrderFilter } from "@/lib/admin/orders";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Orders" };

const FILTERS: { key: OrderFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New, to call" },
  { key: "to-fulfil", label: "To pack & ship" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "unpaid", label: "Not paid" },
  { key: "cancelled", label: "Cancelled" },
];

export default async function OrdersPage(props: PageProps<"/admin/orders">) {
  await requireAdmin();
  const { show } = await props.searchParams;
  const filter = FILTERS.find((f) => f.key === show)?.key ?? "all";
  const orders = await listAdminOrders(filter);

  return (
    <>
      <p className="eyebrow">Sales</p>
      <h1 className="mt-2 font-serif text-4xl">Orders</h1>
      <nav aria-label="Filter orders" className="mt-6 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key} href={f.key === "all" ? "/admin/orders" : `/admin/orders?show=${f.key}`} aria-current={f.key === filter ? "page" : undefined}
            className={`rounded-full border px-4 py-2 transition-colors ${f.key === filter ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <div className="mt-6">
        {orders.length === 0 ? <p className="card text-sm text-muted">No orders here.</p> : <OrderList orders={orders} />}
      </div>
    </>
  );
}
