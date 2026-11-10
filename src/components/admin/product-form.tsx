"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { saveProduct, type ActionState } from "@/app/admin/actions";
import { CATEGORIES } from "@/lib/data/catalog-shared";
import { FREE_SIZE, SIZES } from "@/lib/admin/product-input";
import { APPAREL_GST_THRESHOLD } from "@/lib/domain/tax";

export interface ProductFormValues {
  id?: string;
  title: string;
  category: string;
  /** Rupees, GST included. */
  price: string;
  summary: string;
  description: string;
  story: string;
  materials: string;
  edition: string;
  featured: boolean;
  sized: boolean;
  stock: Record<string, number>;
}

export const EMPTY_PRODUCT: ProductFormValues = {
  title: "", category: CATEGORIES[0], price: "", summary: "", description: "", story: "", materials: "", edition: "",
  featured: false, sized: true, stock: {},
};

const initial: ActionState = {};

export function ProductForm({ values }: { values: ProductFormValues }) {
  const [state, action, pending] = useActionState(saveProduct, initial);
  const [sized, setSized] = useState(values.sized);
  const [price, setPrice] = useState(values.price);
  // A price error stays only until the price is edited again.
  const [editedSince, setEditedSince] = useState<ActionState | null>(null);
  const errors = state.fieldErrors ?? {};
  const priceError = editedSince === state ? undefined : errors.price;
  const isNew = !values.id;

  /** Submit without a native form action, so a failed save never wipes what staff typed. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }

  const rupees = Number(price);
  const gstNote = Number.isFinite(rupees) && rupees > 0
    ? `Includes ${rupees * 100 <= APPAREL_GST_THRESHOLD ? "5%" : "18%"} GST (set automatically from the price).`
    : "Enter the price customers pay, GST included.";

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="sized" value={String(sized)} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="field-label">Name</label>
          <input id="title" name="title" defaultValue={values.title} required maxLength={120} placeholder="e.g. Marigold Wrap Dress" className="field-input" aria-invalid={Boolean(errors.title)} />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="category" className="field-label">Category</label>
          <select
            id="category" name="category" defaultValue={values.category} className="field-input"
            onChange={(e) => isNew && setSized(e.target.value !== "Sarees")}
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          {errors.category && <p className="field-error">{errors.category}</p>}
        </div>

        <div>
          <label htmlFor="price" className="field-label">Price (₹)</label>
          <input id="price" name="price" inputMode="decimal" value={price} onChange={(e) => { setPrice(e.target.value); setEditedSince(state); }} required placeholder="2499" className="field-input" aria-invalid={Boolean(priceError)} aria-describedby="price-note" />
          <p id="price-note" className={priceError ? "field-error" : "mt-1.5 text-xs text-muted"}>{priceError ?? gstNote}</p>
        </div>
      </div>

      <fieldset>
        <legend className="field-label">Stock</legend>
        <label className="mb-3 flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={!sized} onChange={(e) => setSized(!e.target.checked)} className="h-4 w-4 accent-ink" />
          Free size (sarees, stoles)
        </label>
        {sized ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {SIZES.map((size) => (
              <label key={size} className="block">
                <span className="mb-1 block text-center text-xs text-muted">{size}</span>
                <input name={`stock.${size}`} inputMode="numeric" defaultValue={values.stock[size] ?? ""} placeholder="0" aria-label={`Stock for size ${size}`} className="field-input text-center tabular-nums" />
              </label>
            ))}
          </div>
        ) : (
          <input name={`stock.${FREE_SIZE}`} inputMode="numeric" defaultValue={values.stock[FREE_SIZE] ?? ""} placeholder="0" aria-label="Stock" className="field-input max-w-[8rem] tabular-nums" />
        )}
        {errors.stock && <p className="field-error">{errors.stock}</p>}
      </fieldset>

      <div>
        <label htmlFor="summary" className="field-label">One-line summary</label>
        <input id="summary" name="summary" defaultValue={values.summary} maxLength={200} placeholder="A true wrap dress in marigold mul cotton." className="field-input" />
      </div>

      <div>
        <label htmlFor="description" className="field-label">Description</label>
        <textarea id="description" name="description" defaultValue={values.description} rows={4} maxLength={4000} placeholder="Fit, length, neckline, sleeves, lining, pockets, care." className="field-input" />
        <p className="mt-1.5 text-xs text-muted">Needed before the product can go live.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="materials" className="field-label">Fabric</label>
          <input id="materials" name="materials" defaultValue={values.materials} maxLength={300} placeholder="Mul cotton, Hand block print" className="field-input" />
          <p className="mt-1.5 text-xs text-muted">Separate with commas. Also guides the AI photos.</p>
        </div>
        <div>
          <label htmlFor="edition" className="field-label">Label <span className="font-normal text-muted">(optional)</span></label>
          <input id="edition" name="edition" defaultValue={values.edition} maxLength={60} placeholder="New this week" className="field-input" />
        </div>
      </div>

      <div>
        <label htmlFor="story" className="field-label">Design note <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="story" name="story" defaultValue={values.story} rows={2} maxLength={1000} placeholder="One or two lines about how it's made." className="field-input" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="featured" defaultChecked={values.featured} className="h-4 w-4 accent-ink" />
        Feature on the home page
      </label>

      <div className="flex items-center gap-4 border-t border-line pt-5">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : isNew ? "Save and add photos" : "Save changes"}
        </button>
        <p role="status" className={`text-sm ${state.error ? "text-accent" : "text-ok"}`}>
          {state.error ?? (state.ok ? "Saved." : "")}
        </p>
      </div>
    </form>
  );
}
