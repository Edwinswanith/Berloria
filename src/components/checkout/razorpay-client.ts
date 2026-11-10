"use client";

/** Minimal typing for Razorpay's hosted checkout popup. Card and UPI details are entered there, never on our pages. */
interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("The payment window couldn't load. Check your connection and try again."));
    document.body.appendChild(script);
  });
}

export interface PayRequest {
  keyId: string;
  providerOrderId: string;
  amount: number;
  orderNumber: string;
  accessKey: string;
  brand: string;
  customer: { name: string; email: string; phone: string };
}

export type PayOutcome = "paid" | "dismissed";

/** Opens the payment popup and confirms the result with our server. Resolves "dismissed" if the shopper closes it. */
export async function payWithRazorpay(request: PayRequest): Promise<PayOutcome> {
  await loadScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("The payment window couldn't load. Please try again.");

  const response = await new Promise<RazorpaySuccess | null>((resolve) => {
    new Razorpay({
      key: request.keyId, order_id: request.providerOrderId, amount: request.amount, currency: "INR", name: request.brand,
      description: `Order ${request.orderNumber}`,
      prefill: { name: request.customer.name, email: request.customer.email, contact: request.customer.phone },
      theme: { color: "#8b2f4b" },
      handler: resolve,
      modal: { ondismiss: () => resolve(null) },
    }).open();
  });
  if (!response) return "dismissed";

  const res = await fetch("/api/checkout/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderNumber: request.orderNumber, accessKey: request.accessKey, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }),
  });
  const body = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null;
  if (!res.ok || !body?.success) throw new Error(body?.error ?? "We couldn't confirm the payment. Please contact us with your order number.");
  return "paid";
}
