import Image from "next/image";
import Link from "next/link";
import type { ProductCard as ProductCardData } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/domain/money";

interface ProductCardProps {
  product: ProductCardData;
  priority?: boolean;
  sizes?: string;
}

export function ProductCard({ product, priority, sizes = "(min-width: 1024px) 25vw, 50vw" }: ProductCardProps) {
  return (
    <Link href={`/products/${product.slug}`} className="group block" data-testid="product-card">
      <div className="relative aspect-[4/5] overflow-hidden bg-mist">
        <Image
          src={product.image.url}
          alt={product.image.alt}
          fill
          sizes={sizes}
          priority={priority}
          className={`object-cover transition-[opacity,transform] duration-700 ease-soft group-hover:scale-[1.03] ${
            product.hoverImage ? "group-hover:opacity-0" : ""
          }`}
        />
        {product.hoverImage && (
          <Image
            src={product.hoverImage.url}
            alt=""
            fill
            sizes={sizes}
            className="object-cover opacity-0 transition-opacity duration-700 ease-soft group-hover:opacity-100"
          />
        )}
        {product.stock === "sold_out" && (
          <span className="absolute left-3 top-3 bg-ink px-2 py-1 text-[10px] tracking-[0.12em] text-paper uppercase">Sold out</span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-xl leading-tight transition-colors group-hover:text-accent sm:text-[1.4rem]">{product.title}</h3>
          <p data-testid="card-price" className="hidden shrink-0 text-sm tabular-nums sm:block">
            {product.hasRange && <span className="text-muted">from </span>}
            {formatMoney(product.priceFrom, product.currency)}
          </p>
        </div>
        <p data-testid="card-price" className="text-sm tabular-nums sm:hidden">
          {product.hasRange && <span className="text-muted">from </span>}
          {formatMoney(product.priceFrom, product.currency)}
        </p>
        <p className="text-xs text-muted">
          {product.stock === "low" ? <span className="text-warn">Only {product.totalStock} left</span> : product.edition || product.category}
        </p>
      </div>
    </Link>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/5] bg-mist" />
          <div className="mt-3 h-5 w-2/3 bg-mist" />
          <div className="mt-2 h-3 w-1/3 bg-mist" />
        </div>
      ))}
    </div>
  );
}
