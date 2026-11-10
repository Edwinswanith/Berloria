import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProductTitle, listProducts } from "@/lib/data/catalog";
import { categorySlug } from "@/lib/data/catalog-shared";
import { VariantPicker } from "@/components/catalog/variant-picker";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductCard } from "@/components/catalog/product-card";
import { SectionHeading } from "@/components/layout/section-heading";

export async function generateMetadata(props: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductTitle(slug);
  return product ? { title: product.title, description: product.summary } : { title: "Not found" };
}

export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={props.params} />
    </Suspense>
  );
}

async function ProductContent({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <article className="container-page pt-6 sm:pt-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted">
        <ol className="flex gap-2">
          <li><Link href="/shop" className="hover:text-ink">Shop</Link></li>
          <li aria-hidden>/</li>
          <li><Link href={`/shop?category=${categorySlug(product.category)}`} className="hover:text-ink">{product.category}</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-ink-soft">{product.title}</li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
        <ProductGallery images={product.images} />

        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow">{product.edition}</p>
          <h1 className="mt-3 font-serif text-5xl leading-[1.02] sm:text-6xl">{product.title}</h1>
          <p className="mt-5 max-w-md leading-relaxed text-ink-soft">{product.summary}</p>

          <div className="mt-7">
            <VariantPicker options={product.options} variants={product.variants} currency={product.currency} title={product.title} />
          </div>

          <div className="mt-6 space-y-2 rounded-sm bg-mist p-4 text-sm">
            {product.eta && (
              <p className="flex items-center gap-2 text-ink-soft">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ok" />
                Ships from {product.vendorCity} · arrives in {product.eta.minDays}–{product.eta.maxDays} days
              </p>
            )}
            <p className="text-muted">Price includes {Math.round(product.gstRate * 100)}% GST. Tracked courier delivery.</p>
            {product.options.some((o) => o.name === "Size") && (
              <p><Link href="/help#sizes" className="link-underline">Size guide</Link></p>
            )}
          </div>

          <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
            <Detail term="About">{product.description}</Detail>
            {product.materials.length > 0 && <Detail term="Fabric">{product.materials.join(", ")}</Detail>}
            <Detail term="Delivery">
              Packed in our Chennai workroom and sent by tracked courier. <Link href="/help#delivery" className="link-underline">Delivery details</Link>
            </Detail>
          </dl>
        </div>
      </div>

      {product.hasAiImages && (
        <p className="mt-6 text-xs text-muted lg:w-[55%]" data-testid="ai-note">
          Photos on a model are AI-styled from pictures of this actual garment, and checked by our team against the real piece.
        </p>
      )}

      {product.story && (
        <section className="mx-auto mt-24 max-w-3xl text-center sm:mt-32">
          <p className="eyebrow">Design note</p>
          <blockquote className="mt-6 font-serif text-3xl leading-snug sm:text-4xl">&ldquo;{product.story}&rdquo;</blockquote>
        </section>
      )}

      <Suspense fallback={null}>
        <MoreLikeThis category={product.category} excludeSlug={product.slug} />
      </Suspense>
    </article>
  );
}

async function MoreLikeThis({ category, excludeSlug }: { category: string; excludeSlug: string }) {
  const products = await listProducts({ category, excludeSlug, limit: 4 });
  if (products.length === 0) return null;
  return (
    <section className="mt-24 sm:mt-32">
      <SectionHeading eyebrow="You may also like" title={`More ${category.toLowerCase()}`} link={{ href: `/shop?category=${categorySlug(category)}`, label: "See all" }} />
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {products.map((p) => <ProductCard key={p.slug} product={p} />)}
      </div>
    </section>
  );
}

function Detail({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-4 py-4">
      <dt className="text-muted">{term}</dt>
      <dd className="leading-relaxed text-ink-soft">{children}</dd>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="container-page grid gap-8 pt-14 lg:grid-cols-[1.25fr_1fr]" aria-hidden="true">
      <div className="aspect-[4/5] animate-pulse bg-mist" />
      <div className="space-y-4">
        <div className="h-4 w-24 bg-mist" />
        <div className="h-14 w-3/4 bg-mist" />
        <div className="h-24 bg-mist" />
      </div>
    </div>
  );
}
