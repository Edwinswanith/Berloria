"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LockIcon } from "@/components/ui/icons";
import { payWithRazorpay, type PayRequest } from "./razorpay-client";

/** Lets a shopper finish an online payment they closed or that failed. */
export function PayNow({ request, label }: { request: PayRequest; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      if ((await payWithRazorpay(request)) === "paid") router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Payment didn't go through. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn-primary" disabled={busy} onClick={pay}>
        <LockIcon className="h-4 w-4" /> {busy ? "Opening payment…" : label}
      </button>
      {error && <p role="alert" className="field-error mt-2">{error}</p>}
    </div>
  );
}
