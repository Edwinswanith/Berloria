import type { Metadata } from "next";
import Link from "next/link";
import { listAdminProducts } from "@/lib/admin/products";
import { requireAdmin } from "@/lib/auth/admin";
import { formatMoney } from "@/lib/domain/money";
import { LOW_STOCK_THRESHOLD } from "@/lib/data/catalog-shared";

export const metadata: Metadata = { title: "Products" };

const STATUS_STYLE: Record<string, string> = {
  active: "bg-ok/10 text-ok",
  draft: "bg-warn/10 text-warn",
  archived: "bg-ink/5 text-muted",
};
const STATUS_LABEL: Record<string, string> = { active: "Live", draft: "Draft", archived: "Hidden" };

export default async function ProductsPage() {
  await requireAdmin();
  const products = await listAdminProducts();
  const count = (status: string) => products.filter((p) => p.status === status).length;
  const toReview = products.reduce((sum, p) => sum + p.awaitingReview, 0);
  const lowStock = products.filter((p) => p.status === "active" && p.totalStock <= LOW_STOCK_THRESHOLD).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="mt-2 font-serif text-4xl">Products</h1>
        </div>
        <Link href="/admin/products/new" className="btn-primary">Add a dress</Link>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Live in shop", count("active")],
          ["Drafts", count("draft")],
          ["AI photos to review", toReview],
          ["Low or out of stock", lowStock],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-paper p-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 font-serif text-3xl tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {products.length === 0 ? (
        <div className="card mt-8 text-center">
          <p className="font-serif text-2xl">No products yet</p>
          <p className="mt-2 text-sm text-muted">Add your first dress, upload its photos and let the studio make the shop images.</p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper" data-testid="admin-products">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/products/${p.id}`} className="flex items-center gap-4 p-3 transition-colors hover:bg-mist/60 sm:p-4">
                <span className="relative block h-16 w-[3.2rem] shrink-0 overflow-hidden rounded-md bg-mist">
                  {/* eslint-disable-next-line @next/next/no-img-element -- staff-only media needs the session cookie */}
                  {p.thumb && <img src={p.thumb} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {p.category} · {formatMoney(p.price, "INR")} · {p.totalStock} in stock · {p.imageCount} {p.imageCount === 1 ? "photo" : "photos"}
                  </span>
                </span>
                {p.awaitingReview > 0 && (
                  <span className="hidden rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent sm:inline">{p.awaitingReview} to review</span>
                )}
                <span className={`rounded-full px-2.5 py-1 text-xs ${STATUS_STYLE[p.status] ?? ""}`}>{STATUS_LABEL[p.status] ?? p.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
