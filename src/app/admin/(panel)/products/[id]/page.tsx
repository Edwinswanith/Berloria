import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminProduct } from "@/lib/admin/products";
import { requireAdmin } from "@/lib/auth/admin";
import { isAiConfigured } from "@/lib/ai/generator";
import { SHOTS } from "@/lib/ai/shots";
import { ProductForm } from "@/components/admin/product-form";
import { PhotoStudio } from "@/components/admin/photo-studio";
import { GalleryManager, PublishBar } from "@/components/admin/product-controls";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const product = await getAdminProduct(id);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/admin/products" className="text-sm text-muted hover:text-ink">← Products</Link>
        <h1 className="mt-3 font-serif text-4xl">{product.title}</h1>
      </div>

      <PublishBar id={product.id} status={product.status} slug={product.slug} blockers={product.blockers} />

      <section className="card" aria-labelledby="gallery-heading">
        <h2 id="gallery-heading" className="font-serif text-2xl">Shop gallery</h2>
        <p className="mb-5 mt-1 text-sm text-muted">What customers see on the product page. The first photo is the cover.</p>
        <GalleryManager id={product.id} images={product.images} />
      </section>

      <section className="card" aria-labelledby="studio-heading">
        <h2 id="studio-heading" className="font-serif text-2xl">Photo studio</h2>
        <p className="mb-6 mt-1 text-sm text-muted">Turn a few quick photos of the dress into shop-ready images, with and without a model.</p>
        <PhotoStudio
          productId={product.id}
          sourcePhotos={product.sourcePhotos}
          candidates={product.candidates}
          shots={SHOTS.map((s) => ({ id: s.id, label: s.label, hint: s.hint, kind: s.kind, requires: [...s.requires] }))}
          aiConfigured={isAiConfigured()}
        />
      </section>

      <section className="card" aria-labelledby="details-heading">
        <h2 id="details-heading" className="mb-6 font-serif text-2xl">Details</h2>
        <ProductForm
          key={product.id}
          values={{
            id: product.id,
            title: product.title,
            category: product.category,
            price: String(product.price / 100),
            summary: product.summary,
            description: product.description,
            story: product.story,
            materials: product.materials.join(", "),
            edition: product.edition,
            featured: product.featured,
            sized: product.sized,
            stock: product.stock,
          }}
        />
      </section>
    </div>
  );
}
