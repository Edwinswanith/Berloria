import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { requireCustomerId } from "@/lib/auth/customer";
import { STORE } from "@/lib/config/store";
import { getCustomer } from "@/lib/shop/accounts";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-page pt-10 sm:pt-14">
      <Link href="/bag" className="text-sm text-muted hover:text-ink">← Back to bag</Link>
      <h1 className="mt-3 mb-10 font-serif text-5xl sm:text-6xl">Checkout</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-mist" aria-hidden="true" />}>
        <SignedInCheckout />
      </Suspense>
    </div>
  );
}

async function SignedInCheckout() {
  const customer = await getCustomer(await requireCustomerId("/checkout"));
  return <CheckoutForm codLimit={STORE.codLimit} customer={{ name: customer?.name ?? "", email: customer?.email ?? "" }} />;
}
