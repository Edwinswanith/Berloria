import type { Metadata } from "next";
import Link from "next/link";
import { EMPTY_PRODUCT, ProductForm } from "@/components/admin/product-form";

export const metadata: Metadata = { title: "Add a dress" };

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/products" className="text-sm text-muted hover:text-ink">← Products</Link>
      <h1 className="mt-3 font-serif text-4xl">Add a dress</h1>
      <p className="mt-2 text-sm text-muted">Start with the basics. You&rsquo;ll add photos on the next screen, and nothing goes live until you publish.</p>
      <div className="card mt-8">
        <ProductForm values={EMPTY_PRODUCT} />
      </div>
    </div>
  );
}
