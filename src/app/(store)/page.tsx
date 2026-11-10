import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { listCategoryCovers, listProducts } from "@/lib/data/catalog";
import { categorySlug } from "@/lib/data/catalog-shared";
import { ProductCard, ProductGridSkeleton } from "@/components/catalog/product-card";
import { SectionHeading } from "@/components/layout/section-heading";
import { RulerIcon, ScissorsIcon, TruckIcon } from "@/components/ui/icons";
import { formatMoney } from "@/lib/domain/money";

const PROMISES = [
  { Icon: ScissorsIcon, title: "Made with care", body: "Breathable cottons, soft rayons and silks, cut and finished by our own tailors in Chennai." },
  { Icon: RulerIcon, title: "Sizes XS to XXL", body: "Every style is measured flat before it ships. The size guide lists real garment measurements." },
  { Icon: TruckIcon, title: "Delivered in 3–6 days", body: "Tracked courier anywhere in India. Free delivery over ₹1,999. We call to confirm every order before it ships." },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="container-page grid gap-10 pt-10 pb-20 sm:pt-14 lg:grid-cols-[1fr_minmax(0,0.9fr)] lg:items-end lg:gap-16 lg:pt-12">
        <div className="lg:pb-16">
          <p className="eyebrow rise">New collection · Women&rsquo;s wear</p>
          <h1 className="rise rise-1 mt-5 font-serif text-display">
            Made for her, <em className="text-accent">every day.</em>
          </h1>
          <p className="rise rise-2 mt-6 max-w-md leading-relaxed text-muted">
            Dresses, kurtas, co-ords and sarees in easy fabrics and thoughtful prints — for work, for weddings, and for every day in between.
          </p>
          <div className="rise rise-3 mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/shop" className="btn-primary">Shop new arrivals</Link>
            <Link href="/help#sizes" className="btn-ghost hidden sm:inline-flex">Size guide</Link>
          </div>
        </div>
        <Suspense fallback={<div className="aspect-[4/5] animate-pulse bg-mist" />}>
          <HeroProduct />
        </Suspense>
      </section>

      <section className="container-page">
        <SectionHeading eyebrow="Loved this week" title="Bestsellers" link={{ href: "/shop", label: "Shop all" }} />
        <Suspense fallback={<ProductGridSkeleton count={4} />}>
          <FeaturedGrid />
        </Suspense>
      </section>

      <section className="container-page mt-24 sm:mt-32">
        <SectionHeading eyebrow="Browse" title="Shop by category" />
        <Suspense fallback={<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-square animate-pulse bg-mist" />)}</div>}>
          <CategoryTiles />
        </Suspense>
      </section>

      <section className="mt-24 bg-mist py-20 sm:mt-32 sm:py-24">
        <div className="container-page grid gap-10 md:grid-cols-3">
          {PROMISES.map(({ Icon, title, body }) => (
            <div key={title} className="border-t border-ink/80 pt-6">
              <Icon className="h-6 w-6 text-accent" />
              <h3 className="mt-4 font-serif text-[1.7rem] leading-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page mt-24 sm:mt-32">
        <SectionHeading eyebrow="New in" title="New arrivals" link={{ href: "/shop?sort=newest", label: "View all" }} />
        <Suspense fallback={<ProductGridSkeleton />}>
          <NewestGrid />
        </Suspense>
      </section>
    </>
  );
}

async function HeroProduct() {
  const [lead] = await listProducts({ featured: true, limit: 1 });
  if (!lead) return <div className="aspect-[4/5] bg-mist" />;
  return (
    <Link href={`/products/${lead.slug}`} className="rise rise-2 group block" data-testid="hero-product">
      <div className="relative aspect-[4/5] overflow-hidden bg-mist lg:max-h-[72vh] lg:w-full">
        <Image src={lead.image.url} alt={lead.image.alt} fill priority sizes="(min-width:1024px) 45vw, 100vw" className="object-cover transition-transform duration-1000 ease-soft group-hover:scale-[1.02]" />
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <div>
          <p className="font-serif text-2xl">{lead.title}</p>
          <p className="mt-1 text-xs text-muted">{lead.edition}</p>
        </div>
        <p className="text-sm tabular-nums">{formatMoney(lead.priceFrom, lead.currency)}</p>
      </div>
    </Link>
  );
}

async function FeaturedGrid() {
  const featured = (await listProducts({ featured: true, limit: 5 })).slice(1);
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
      {featured.map((p) => <ProductCard key={p.slug} product={p} />)}
    </div>
  );
}

async function CategoryTiles() {
  const covers = await listCategoryCovers();
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {covers.map((c) => (
        <Link key={c.name} href={`/shop?category=${categorySlug(c.name)}`} className="group block">
          <div className="relative aspect-square overflow-hidden bg-mist">
            {c.image && <Image src={c.image.url} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.04]" />}
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-serif text-2xl transition-colors group-hover:text-accent">{c.name}</span>
            <span className="text-xs text-muted tabular-nums">{c.count} styles</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

async function NewestGrid() {
  const products = await listProducts({ sort: "newest", limit: 8 });
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
      {products.map((p) => <ProductCard key={p.slug} product={p} />)}
    </div>
  );
}
