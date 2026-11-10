import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { listProducts } from "@/lib/data/catalog";
import { CATEGORIES, PRICE_BANDS, SIZE_FILTERS, categoryFromSlug, categorySlug, parsePriceBand, parseQuery, parseSize, parseSort } from "@/lib/data/catalog-shared";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";
import { ProductCard, ProductGridSkeleton } from "@/components/catalog/product-card";
import { SortSelect } from "@/components/catalog/sort-select";

export const metadata: Metadata = { title: "Shop" };

type SearchParams = PageProps<"/shop">["searchParams"];

export default function ShopPage(props: PageProps<"/shop">) {
  return (
    <div className="container-page pt-10 sm:pt-14">
      <Suspense fallback={<ShopSkeleton />}>
        <ShopContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

function hrefWith(base: Record<string, string | undefined>, change: Record<string, string | undefined>): string {
  const merged = { ...base, ...change };
  const query = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => Boolean(e[1]))).toString();
  return query ? `/shop?${query}` : "/shop";
}

async function ShopContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const category = categoryFromSlug(one(params.category) ?? "");
  const sort = parseSort(one(params.sort));
  const filters = { q: parseQuery(one(params.q)), size: parseSize(one(params.size)), price: parsePriceBand(one(params.price)) };
  const products = await listProducts({ category, sort, filters });

  const current = {
    category: category ? categorySlug(category) : undefined,
    sort: sort === "featured" ? undefined : sort,
    q: filters.q, size: filters.size, price: filters.price,
  };
  const heading = filters.q ? `Results for \u201C${filters.q}\u201D` : (category ?? "Shop all");
  const narrowed = Boolean(filters.q || filters.size || filters.price || category);

  return (
    <>
      <header className="border-b border-line pb-6">
        <p className="eyebrow" data-testid="result-count">{products.length} {products.length === 1 ? "style" : "styles"}</p>
        <h1 className="mt-3 font-serif text-5xl sm:text-6xl">{heading}</h1>

        <form action="/shop" method="get" role="search" id="search" className="mt-8 flex max-w-xl scroll-mt-28 items-center gap-2">
          {current.category && <input type="hidden" name="category" value={current.category} />}
          {current.sort && <input type="hidden" name="sort" value={current.sort} />}
          {current.size && <input type="hidden" name="size" value={current.size} />}
          {current.price && <input type="hidden" name="price" value={current.price} />}
          <label className="relative flex-1">
            <span className="sr-only">Search the shop</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search" name="q" defaultValue={filters.q ?? ""} maxLength={60} placeholder="Search dresses, fabrics, colours…" enterKeyHint="search"
              className="h-12 w-full rounded-full border border-ink/15 bg-paper pr-4 pl-11 text-sm transition-colors placeholder:text-muted/80 hover:border-ink/40 focus:border-ink focus:outline-none"
            />
          </label>
          <button type="submit" className="btn-primary">Search</button>
        </form>

        <nav aria-label="Categories" className="snap-gallery -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 text-sm md:mx-0 md:flex-wrap md:px-0">
          <FilterPill href={hrefWith(current, { category: undefined })} active={!category}>All</FilterPill>
          {CATEGORIES.map((c) => (
            <FilterPill key={c} href={hrefWith(current, { category: categorySlug(c) })} active={c === category}>{c}</FilterPill>
          ))}
        </nav>

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <nav aria-label="Size" className="flex items-center gap-1.5 text-sm">
              <span className="mr-1 text-muted">Size</span>
              {SIZE_FILTERS.map((size) => (
                <Link
                  key={size} href={hrefWith(current, { size: filters.size === size ? undefined : size })} scroll={false}
                  aria-current={filters.size === size ? "true" : undefined} aria-label={`Size ${size}`}
                  className={`grid h-9 min-w-9 place-items-center rounded-full border px-2 text-xs transition-colors ${filters.size === size ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}
                >
                  {size}
                </Link>
              ))}
            </nav>
            <nav aria-label="Price" className="snap-gallery -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 text-sm sm:mx-0 sm:px-0">
              <span className="mr-1 shrink-0 text-muted">Price</span>
              {Object.entries(PRICE_BANDS).map(([key, band]) => (
                <Link
                  key={key} href={hrefWith(current, { price: filters.price === key ? undefined : key })} scroll={false}
                  aria-current={filters.price === key ? "true" : undefined}
                  className={`shrink-0 rounded-full border px-3 py-2 text-xs whitespace-nowrap transition-colors ${filters.price === key ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}
                >
                  {band.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {narrowed && (
              <Link href="/shop" scroll={false} className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent" data-testid="clear-filters">
                <CloseIcon className="h-3.5 w-3.5" /> Clear all
              </Link>
            )}
            <SortSelect />
          </div>
        </div>
      </header>

      {products.length === 0 ? (
        <div className="py-24 text-center" data-testid="no-results">
          <p className="font-serif text-3xl">{narrowed ? "Nothing matches that just yet." : "Nothing here yet."}</p>
          <p className="mt-3 text-sm text-muted">{narrowed ? "Try a different word, or remove a filter." : "New pieces arrive every week."}</p>
          <Link href="/shop" className="btn-ghost mt-8">See everything</Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-6 lg:grid-cols-4">
          {products.map((p, i) => <ProductCard key={p.slug} product={p} priority={i < 4} />)}
        </div>
      )}
    </>
  );
}

function FilterPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 transition-colors ${active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}
    >
      {children}
    </Link>
  );
}

function ShopSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="h-44 border-b border-line" />
      <div className="mt-10"><ProductGridSkeleton /></div>
    </div>
  );
}
