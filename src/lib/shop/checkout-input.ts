import { z } from "zod";
import { INDIAN_STATES } from "@/lib/config/store";
import { sanitizeItems, type BagItem } from "@/lib/domain/bag";

export const PAYMENT_METHODS = ["online", "manual"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Accepts "98400 12345", "+91 9840012345", "09840012345" and stores +919840012345. */
export function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

const text = (min: number, max: number, message: string) => z.string().trim().min(min, message).max(max, "That's too long");

const schema = z.object({
  name: text(2, 80, "Enter your full name"),
  email: z.string().trim().toLowerCase().max(120).pipe(z.email("Enter a valid email address")),
  phone: z.string().trim().max(20).refine((v) => normalisePhone(v) !== null, "Enter a 10-digit Indian mobile number"),
  line1: text(5, 120, "Enter your house number and street"),
  line2: z.string().trim().max(120).default(""),
  city: text(2, 60, "Enter your city or town"),
  state: z.enum(INDIAN_STATES, { message: "Choose your state" }),
  postalCode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6-digit PIN code"),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: "Choose how you'd like to pay" }),
  /** The total the shopper saw. If prices or stock moved since, we stop and show the new total. */
  expectedTotal: z.number().int().nonnegative(),
  items: z.array(z.unknown()).max(60),
});

export interface CheckoutInput {
  name: string;
  email: string;
  phone: string;
  address: { line1: string; line2: string; city: string; state: string; postalCode: string };
  paymentMethod: PaymentMethod;
  expectedTotal: number;
  items: BagItem[];
}

export type CheckoutParse = { success: true; data: CheckoutInput } | { success: false; errors: Record<string, string> };

export function parseCheckout(raw: unknown): CheckoutParse {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      errors[field] ??= issue.message;
    }
    return { success: false, errors };
  }
  const { line1, line2, city, state, postalCode, items, phone, ...rest } = parsed.data;
  const clean = sanitizeItems(items);
  if (clean.length === 0) return { success: false, errors: { items: "Your bag is empty." } };
  return { success: true, data: { ...rest, phone: normalisePhone(phone)!, address: { line1, line2, city, state, postalCode }, items: clean } };
}
