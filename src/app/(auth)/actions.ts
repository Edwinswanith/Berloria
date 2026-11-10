"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createCustomerSession, destroyCustomerSession } from "@/lib/auth/customer";
import { createRateLimiter } from "@/lib/auth/rate-limit";
import { logError } from "@/lib/log";
import { parseSignIn, parseSignUp, safeNextPath } from "@/lib/shop/account-input";
import { AccountError, authenticateCustomer, registerCustomer } from "@/lib/shop/accounts";

export interface AuthState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Per address: 10 wrong sign-ins every 15 minutes (a success resets the count) and 20 new accounts an hour. */
const signInLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60_000 });
// Local development and test runs create accounts repeatedly from one address; only production is strict.
const SIGN_UP_LIMIT = process.env.NODE_ENV === "production" ? 20 : 1000;
const signUpLimiter = createRateLimiter({ limit: SIGN_UP_LIMIT, windowMs: 60 * 60_000 });

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

const tooMany = (ms: number): AuthState => ({ error: `Too many tries. Please wait ${Math.ceil(ms / 60_000)} minutes and try again.` });

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const ip = await clientIp();
  const attempt = signInLimiter.hit(ip);
  if (!attempt.allowed) return tooMany(attempt.retryAfterMs);

  const parsed = parseSignIn({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: parsed.errors };

  let userId: string | null;
  try {
    userId = await authenticateCustomer(parsed.data);
  } catch (error: unknown) {
    logError("auth.signIn", error);
    return { error: "We couldn't sign you in just now. Please try again." };
  }
  if (!userId) return { error: "That email or password isn't right." };

  signInLimiter.reset(ip);
  await createCustomerSession(userId);
  redirect(safeNextPath(formData.get("next")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const attempt = signUpLimiter.hit(await clientIp());
  if (!attempt.allowed) return tooMany(attempt.retryAfterMs);

  const parsed = parseSignUp({ name: formData.get("name"), email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fieldErrors: parsed.errors };

  let userId: string;
  try {
    userId = await registerCustomer(parsed.data);
  } catch (error: unknown) {
    if (error instanceof AccountError) return { error: error.message };
    logError("auth.signUp", error);
    return { error: "We couldn't create your account just now. Please try again." };
  }
  await createCustomerSession(userId);
  redirect(safeNextPath(formData.get("next")));
}

export async function signOut(): Promise<void> {
  await destroyCustomerSession();
  redirect("/login");
}
