"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { BagQuote } from "@/lib/shop/quote";
import { bag, useBagItems } from "./bag-store";

interface QuoteState {
  /** The items this quote was made for, so a stale quote is never shown as current. */
  forKey: string;
  quote: BagQuote | null;
  onlinePayment: boolean;
  error: string | null;
}

interface QuoteResponse {
  success: boolean;
  data?: { quote: BagQuote; onlinePayment: boolean };
  error?: string;
}

const noop = () => () => {};
/** False on the server and during hydration, true afterwards: lets us tell "empty bag" from "not loaded yet". */
export const useHydrated = (): boolean => useSyncExternalStore(noop, () => true, () => false);

/** Live prices, stock and totals for whatever is in the bag. */
export function useBagQuote() {
  const items = useBagItems();
  const hydrated = useHydrated();
  const key = JSON.stringify(items);
  const [state, setState] = useState<QuoteState>({ forKey: "", quote: null, onlinePayment: false, error: null });

  useEffect(() => {
    if (items.length === 0) return;
    const controller = new AbortController();
    fetch("/api/bag/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: `{"items":${key}}`, signal: controller.signal })
      .then(async (res) => (await res.json()) as QuoteResponse)
      .then((body) => {
        if (!body.success || !body.data) throw new Error(body.error ?? "We couldn't load your bag.");
        // Styles that are no longer sold leave the bag quietly; the next quote reflects it.
        if (body.data.quote.missing.length) body.data.quote.missing.forEach((sku) => bag.remove(sku));
        setState({ forKey: key, quote: body.data.quote, onlinePayment: body.data.onlinePayment, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ forKey: key, quote: null, onlinePayment: false, error: error instanceof Error ? error.message : "We couldn't load your bag." });
      });
    return () => controller.abort();
  }, [key, items.length]);

  const current = state.forKey === key;
  return {
    items,
    hydrated,
    isEmpty: hydrated && items.length === 0,
    quote: current ? state.quote : null,
    /** Last known quote, kept on screen while a change is being re-priced. */
    lastQuote: state.quote,
    onlinePayment: state.onlinePayment,
    error: current ? state.error : null,
    loading: !hydrated || (items.length > 0 && !current),
  };
}
