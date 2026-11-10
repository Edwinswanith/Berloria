"use client";

import { useMemo, useState } from "react";
import { bag } from "@/components/bag/bag-store";
import { CheckIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import { showToast } from "@/components/ui/toast";
import type { ProductVariantView } from "@/lib/data/catalog";
import { LOW_STOCK_THRESHOLD } from "@/lib/data/catalog-shared";
import { formatMoney } from "@/lib/domain/money";

interface VariantPickerProps {
  options: { name: string; values: string[] }[];
  variants: ProductVariantView[];
  currency: string;
  title: string;
}

function initialSelection(variants: ProductVariantView[]): Record<string, string> {
  const first = variants.find((v) => v.stock > 0) ?? variants[0];
  return { ...(first?.options ?? {}) };
}

const ADDED_MS = 1800;

export function VariantPicker({ options, variants, currency, title }: VariantPickerProps) {
  const [selected, setSelected] = useState(() => initialSelection(variants));
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = useMemo(
    () => variants.find((v) => options.every((o) => v.options[o.name] === selected[o.name])),
    [variants, options, selected],
  );
  const stock = variant?.stock ?? 0;
  const qty = Math.min(quantity, Math.max(1, stock));

  const isAvailable = (name: string, value: string) =>
    variants.some(
      (v) => v.stock > 0 && v.options[name] === value && options.every((o) => o.name === name || v.options[o.name] === selected[o.name]),
    );

  const addToBag = () => {
    if (!variant || stock === 0) return;
    bag.add(variant.sku, qty, stock);
    showToast(`${title} added to your bag`, { href: "/bag", label: "View bag" });
    setAdded(true);
    window.setTimeout(() => setAdded(false), ADDED_MS);
  };

  const choose = (name: string, value: string) => {
    setSelected((prev) => ({ ...prev, [name]: value }));
    setQuantity(1);
  };

  return (
    <div>
      <p className="text-2xl tabular-nums" data-testid="price">
        {variant ? formatMoney(variant.price * qty, currency) : "—"}
        {qty > 1 && variant && <span className="ml-2 text-sm text-muted">{formatMoney(variant.price, currency)} each</span>}
      </p>

      {options.map((o) => (
        <fieldset key={o.name} className="mt-6">
          <legend className="mb-3 text-sm">
            {o.name}: <span className="text-muted">{selected[o.name]}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {o.values.map((value) => {
              const active = selected[o.name] === value;
              const available = isAvailable(o.name, value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  aria-label={available ? value : `${value} (sold out)`}
                  onClick={() => choose(o.name, value)}
                  className={`min-h-11 min-w-11 rounded-full border px-4 py-2 text-sm transition-[border-color,background-color,transform] duration-200 ${
                    active ? "border-ink bg-ink text-paper" : "border-line hover:border-ink active:scale-95"
                  } ${available ? "" : "text-muted line-through decoration-1"}`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <p
        data-testid="stock"
        className={`mt-6 text-sm ${stock === 0 ? "text-accent" : stock <= LOW_STOCK_THRESHOLD ? "text-warn" : "text-muted"}`}
      >
        {stock === 0 ? "Sold out in this option" : stock <= LOW_STOCK_THRESHOLD ? `Only ${stock} left` : "In stock"}
      </p>

      <div className="mt-4 flex gap-3">
        <div className="flex h-12 items-center rounded-full border border-line" role="group" aria-label="Quantity">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={qty <= 1 || stock === 0}
            onClick={() => setQuantity(qty - 1)}
            className="grid h-full w-11 place-items-center transition-colors hover:text-accent disabled:text-ink/25"
          >
            <MinusIcon className="h-4 w-4" />
          </button>
          <span className="w-6 text-center text-sm tabular-nums" aria-live="polite" data-testid="quantity">{stock === 0 ? 0 : qty}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={qty >= stock}
            onClick={() => setQuantity(qty + 1)}
            className="grid h-full w-11 place-items-center transition-colors hover:text-accent disabled:text-ink/25"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
        <button type="button" disabled={stock === 0} onClick={addToBag} className="btn-primary flex-1" data-added={added}>
          {stock === 0 ? "Sold out" : added ? <><CheckIcon className="h-4 w-4" /> Added</> : "Add to bag"}
        </button>
      </div>
    </div>
  );
}
