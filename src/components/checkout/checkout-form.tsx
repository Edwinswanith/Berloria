"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { bag } from "@/components/bag/bag-store";
import { OrderSummary } from "@/components/bag/order-summary";
import { useBagQuote } from "@/components/bag/use-bag-quote";
import { LockIcon } from "@/components/ui/icons";
import { BRAND } from "@/lib/config/brand";
import { INDIAN_STATES } from "@/lib/config/store";
import { formatMoney } from "@/lib/domain/money";
import { payWithRazorpay } from "./razorpay-client";

/** Contact and address are remembered on this device so the next order is quicker. Payment details are never stored. */
const SAVED_KEY = "berloria.checkout.v1";
const SAVED_FIELDS = ["name", "email", "phone", "line1", "line2", "city", "state", "postalCode"] as const;

interface CheckoutResponse {
  success: boolean;
  data?: { orderNumber: string; accessKey: string; payment?: { keyId: string; providerOrderId: string; amount: number } };
  error?: string;
  fieldErrors?: Record<string, string>;
  code?: string;
}

const orderUrl = (orderNumber: string, accessKey: string, flag: string) => `/orders/${orderNumber}?key=${accessKey}&${flag}=1`;

interface CheckoutFormProps {
  /** From the signed-in account. */
  customer: { name: string; email: string };
}

export function CheckoutForm({ customer }: CheckoutFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const { quote, lastQuote, isEmpty, onlinePayment, error: quoteError } = useBagQuote();
  const [method, setMethod] = useState<"online" | "manual" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shown = quote ?? lastQuote;

  // Fill in what this device remembers. Done on the DOM so server and client markup match.
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "{}") as Record<string, unknown>;
      for (const field of SAVED_FIELDS) {
        const input = formRef.current?.elements.namedItem(field);
        if ((input instanceof HTMLInputElement || input instanceof HTMLSelectElement) && typeof saved[field] === "string" && !input.value) input.value = saved[field];
      }
    } catch {
      // Nothing saved, or storage is unavailable: the form simply starts empty.
    }
  }, []);

  if (isEmpty && !busy) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif text-4xl">Your bag is empty</p>
        <Link href="/shop" className="btn-primary mt-8">Start shopping</Link>
      </div>
    );
  }

  const chosen = method ?? (onlinePayment ? "online" : "manual");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || busy) return;
    const form = new FormData(event.currentTarget);
    const fields = Object.fromEntries(SAVED_FIELDS.map((f) => [f, String(form.get(f) ?? "")]));
    setBusy(true);
    setErrors({});
    setMessage(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, paymentMethod: chosen, expectedTotal: quote.total, items: quote.lines.map((l) => ({ sku: l.sku, qty: l.quantity })) }),
      });
      const body = (await res.json().catch(() => null)) as CheckoutResponse | null;
      if (!res.ok || !body?.success || !body.data) {
        setErrors(body?.fieldErrors ?? {});
        setMessage(body?.error ?? "We couldn't place your order. Please try again.");
        if (body?.fieldErrors) formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
        setBusy(false);
        return;
      }

      try {
        window.localStorage.setItem(SAVED_KEY, JSON.stringify(fields));
      } catch {
        // Not being able to remember the address must never block an order.
      }
      const { orderNumber, accessKey, payment } = body.data;
      bag.clear(); // the order exists and its stock is held, whatever happens with payment next

      if (!payment) {
        router.push(orderUrl(orderNumber, accessKey, "placed"));
        return;
      }
      try {
        const outcome = await payWithRazorpay({
          ...payment, orderNumber, accessKey, brand: BRAND.name,
          customer: { name: fields.name, email: fields.email, phone: fields.phone },
        });
        router.push(orderUrl(orderNumber, accessKey, outcome === "paid" ? "placed" : "unpaid"));
      } catch {
        router.push(orderUrl(orderNumber, accessKey, "unpaid"));
      }
    } catch {
      setMessage("We couldn't reach the shop. Check your connection and try again.");
      setBusy(false);
    }
  }

  const field = (name: string) => ({ id: name, name, "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `${name}-error` : undefined, className: "field-input" });
  const hint = (name: string) => errors[name] && <p id={`${name}-error`} className="field-error">{errors[name]}</p>;

  return (
    <form ref={formRef} method="post" onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-[1fr_24rem] lg:gap-16">
      <div className="space-y-10">
        <fieldset>
          <legend className="font-serif text-3xl">Contact</legend>
          <p className="mt-1 text-sm text-muted">Our team will call or message you on these details to confirm your order.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="field-label">Full name</label>
              <input {...field("name")} autoComplete="name" defaultValue={customer.name} required />
              {hint("name")}
            </div>
            <div>
              <label htmlFor="email" className="field-label">Email</label>
              <input {...field("email")} type="email" autoComplete="email" inputMode="email" defaultValue={customer.email} required />
              {hint("email")}
            </div>
            <div>
              <label htmlFor="phone" className="field-label">Mobile number</label>
              <input {...field("phone")} type="tel" autoComplete="tel" inputMode="tel" placeholder="98400 12345" required />
              {hint("phone")}
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-serif text-3xl">Delivery address</legend>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="line1" className="field-label">House / flat number and street</label>
              <input {...field("line1")} autoComplete="address-line1" required />
              {hint("line1")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="line2" className="field-label">Area or landmark <span className="font-normal text-muted">(optional)</span></label>
              <input {...field("line2")} autoComplete="address-line2" />
            </div>
            <div>
              <label htmlFor="city" className="field-label">City / town</label>
              <input {...field("city")} autoComplete="address-level2" required />
              {hint("city")}
            </div>
            <div>
              <label htmlFor="postalCode" className="field-label">PIN code</label>
              <input {...field("postalCode")} autoComplete="postal-code" inputMode="numeric" maxLength={6} required />
              {hint("postalCode")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="state" className="field-label">State</label>
              <select {...field("state")} autoComplete="address-level1" defaultValue="" required>
                <option value="" disabled>Choose your state</option>
                {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
              {hint("state")}
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-serif text-3xl">Payment</legend>
          <div className="mt-5 space-y-3" role="radiogroup" aria-label="Payment method">
            {onlinePayment && (
              <PaymentOption value="online" checked={chosen === "online"} onChange={setMethod} title="Pay online" detail="UPI, cards, netbanking and wallets through Razorpay." />
            )}
            <PaymentOption
              value="manual" checked={chosen === "manual"} onChange={setMethod} title="Pay after we confirm"
              detail="Nothing to pay now. Our team will call or message you to confirm the order and agree how you'd like to pay: UPI, bank transfer or cash."
            />
          </div>
          {hint("paymentMethod")}
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        {shown ? (
          <>
            <ul className="mb-5 space-y-3" data-testid="checkout-lines">
              {shown.lines.map((l) => (
                <li key={l.sku} className="flex items-center gap-3 text-sm">
                  <span className="relative block h-16 w-[3.2rem] shrink-0 overflow-hidden rounded bg-mist">
                    <Image src={l.image} alt="" fill sizes="52px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{l.title}</span>
                    <span className="text-xs text-muted">{l.variantLabel ? `Size ${l.variantLabel} · ` : ""}Qty {l.quantity}</span>
                  </span>
                  <span className="tabular-nums">{formatMoney(l.lineTotal, "INR")}</span>
                </li>
              ))}
            </ul>
            <OrderSummary quote={shown} />
          </>
        ) : (
          <div className="h-56 animate-pulse rounded-2xl bg-mist" aria-hidden="true" />
        )}

        {(message || quoteError) && (
          <p role="alert" className="mt-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
            {message ?? quoteError} {shown?.hasIssues && <Link href="/bag" className="underline underline-offset-4">Review bag</Link>}
          </p>
        )}
        <button type="submit" className="btn-primary mt-5 w-full" disabled={!quote || quote.hasIssues || busy}>
          <LockIcon className="h-4 w-4" />
          {busy ? "Placing your order…" : chosen === "online" ? `Pay ${quote ? formatMoney(quote.total, "INR") : ""}` : "Place order"}
        </button>
        <p className="mt-3 text-center text-xs text-muted">Your details are used only to confirm and deliver this order.</p>
      </aside>
    </form>
  );
}

interface PaymentOptionProps {
  value: "online" | "manual";
  checked: boolean;
  disabled?: boolean;
  title: string;
  detail: string;
  onChange: (value: "online" | "manual") => void;
}

function PaymentOption({ value, checked, disabled, title, detail, onChange }: PaymentOptionProps) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${checked ? "border-ink bg-mist/60" : "border-line hover:border-ink/40"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}>
      <input type="radio" name="paymentMethod" value={value} checked={checked} disabled={disabled} onChange={() => onChange(value)} className="mt-1 h-4 w-4 accent-ink" />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-sm text-muted">{detail}</span>
      </span>
    </label>
  );
}
