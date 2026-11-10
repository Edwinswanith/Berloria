"use client";

import { useSyncExternalStore } from "react";
import { addItem, countItems, removeItem, sanitizeItems, setItemQty, type BagItem } from "@/lib/domain/bag";

/**
 * The bag lives in this browser (localStorage) so shoppers don't need an account.
 * It only stores SKUs and quantities; names, prices and stock always come from the server.
 */
const KEY = "berloria.bag.v1";
const EMPTY: readonly BagItem[] = [];
const listeners = new Set<() => void>();
let cache: readonly BagItem[] | null = null;

function read(): readonly BagItem[] {
  if (cache) return cache;
  try {
    const items = sanitizeItems(JSON.parse(window.localStorage.getItem(KEY) ?? "[]"));
    cache = items.length ? items : EMPTY;
  } catch {
    cache = EMPTY; // storage blocked or corrupted: start with an empty bag
  }
  return cache;
}

function write(items: readonly BagItem[]): void {
  cache = items.length ? items : EMPTY;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Private mode or full storage: the bag still works for this page view.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = null;
    notify();
  };
  listeners.add(notify);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

export const bag = {
  add: (sku: string, qty: number, stock?: number): void => write(addItem(read(), sku, qty, stock)),
  setQty: (sku: string, qty: number): void => write(setItemQty(read(), sku, qty)),
  remove: (sku: string): void => write(removeItem(read(), sku)),
  replace: (items: readonly BagItem[]): void => write(sanitizeItems([...items])),
  clear: (): void => write(EMPTY),
};

/** Items in the bag. Empty during server render and the first client paint, then the stored bag. */
export function useBagItems(): readonly BagItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useBagCount(): number {
  return countItems(useBagItems());
}
