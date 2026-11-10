"use client";

import Image from "next/image";
import Link from "next/link";
import { MinusIcon, PlusIcon, TrashIcon, TruckIcon } from "@/components/ui/icons";
import { MAX_PER_LINE } from "@/lib/domain/bag";
import { formatMoney } from "@/lib/domain/money";
import { bag } from "./bag-store";
import { OrderSummary } from "./order-summary";
import { useBagQuote } from "./use-bag-quote";

export function BagView() {
  const { quote, lastQuote, isEmpty, loading, error } = useBagQuote();
  const shown = quote ?? lastQuote;

  if (isEmpty) {
    return (
      <div className="py-16 text-center" data-testid="bag-empty">
        <p className="font-serif text-4xl">Your bag is empty</p>
        <p className="mt-3 text-muted">When you find something you love, it will wait for you here.</p>
        <Link href="/shop" className="btn-primary mt-8">Start shopping</Link>
      </div>
    );
  }
  if (error) return <p role="alert" className="py-16 text-center text-accent">{error}</p>;
  if (!shown) return <BagSkeleton />;

  const gap = shown.freeDeliveryGap;
  const progress = Math.min(100, Math.round((shown.subtotal / shown.freeDeliveryFrom) * 100));

  return (
    <div className={`grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-16 ${loading ? "opacity-70 transition-opacity" : "transition-opacity"}`} aria-busy={loading}>
      <div>
        <div className="mb-6 rounded-xl bg-mist p-4 text-sm" data-testid="delivery-progress">
          <p className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5 shrink-0 text-accent" />
            {gap > 0 ? <>Add <strong className="font-medium">{formatMoney(gap, "INR")}</strong> more for free delivery</> : <>You&rsquo;ve got <strong className="font-medium">free delivery</strong></>}
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-soft" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <ul className="divide-y divide-line border-y border-line" data-testid="bag-lines">
          {shown.lines.map((line) => (
            <li key={line.sku} className="flex gap-4 py-5" data-testid="bag-line">
              <Link href={`/products/${line.slug}`} className="relative block h-32 w-[6.4rem] shrink-0 overflow-hidden rounded-md bg-mist">
                <Image src={line.image} alt="" fill sizes="110px" className="object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/products/${line.slug}`} className="font-serif text-xl leading-tight hover:text-accent">{line.title}</Link>
                    {line.variantLabel && <p className="mt-1 text-sm text-muted">Size {line.variantLabel}</p>}
                  </div>
                  <p className="shrink-0 text-sm tabular-nums" data-testid="line-total">{formatMoney(line.lineTotal, "INR")}</p>
                </div>

                {line.issue === "sold_out" && <p className="mt-2 text-sm text-accent">Sold out — please remove it to continue.</p>}
                {line.issue === "reduced" && (
                  <p className="mt-2 text-sm text-warn">
                    Only {line.quantity} left.{" "}
                    <button type="button" className="underline underline-offset-4" onClick={() => bag.setQty(line.sku, line.quantity)}>Update my bag</button>
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between pt-3">
                  {line.issue === "sold_out" ? <span /> : (
                    <div className="flex h-10 items-center rounded-full border border-line" role="group" aria-label={`Quantity of ${line.title}`}>
                      <button type="button" aria-label="Decrease quantity" disabled={line.quantity <= 1} onClick={() => bag.setQty(line.sku, line.quantity - 1)} className="grid h-full w-10 place-items-center hover:text-accent disabled:text-ink/25">
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums" data-testid="line-qty">{line.quantity}</span>
                      <button type="button" aria-label="Increase quantity" disabled={line.quantity >= Math.min(line.stock, MAX_PER_LINE)} onClick={() => bag.setQty(line.sku, line.quantity + 1)} className="grid h-full w-10 place-items-center hover:text-accent disabled:text-ink/25">
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <button type="button" onClick={() => bag.remove(line.sku)} className="inline-flex h-10 items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent" aria-label={`Remove ${line.title}`}>
                    <TrashIcon className="h-4 w-4" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <OrderSummary quote={shown} />
        {shown.hasIssues || shown.itemCount === 0 ? (
          <p className="btn-primary mt-6 w-full cursor-not-allowed opacity-40" aria-disabled="true">Checkout</p>
        ) : (
          <Link href="/checkout" className="btn-primary mt-6 w-full">Checkout</Link>
        )}
        {shown.hasIssues && <p className="mt-3 text-center text-xs text-accent">Fix the items marked above to continue.</p>}
        <p className="mt-4 text-center text-xs text-muted">Nothing to pay now. We call to confirm your order and agree payment.</p>
      </aside>
    </div>
  );
}

function BagSkeleton() {
  return (
    <div className="grid animate-pulse gap-10 lg:grid-cols-[1fr_22rem] lg:gap-16" aria-hidden="true">
      <div className="space-y-5">
        {[0, 1].map((i) => <div key={i} className="h-32 rounded-md bg-mist" />)}
      </div>
      <div className="h-56 rounded-xl bg-mist" />
    </div>
  );
}
