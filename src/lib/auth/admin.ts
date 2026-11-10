import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SESSION_COOKIE as COOKIE, signSession, verifySession, type SessionClaims } from "./session-token";

const TTL_SECONDS = 12 * 60 * 60;

function env(name: "ADMIN_EMAIL" | "ADMIN_PASSWORD" | "SESSION_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See .env.example.`);
  return value;
}

/** Constant-time comparison that does not leak length. */
function safeEqual(a: string, b: string): boolean {
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(a), digest(b));
}

/** v1 has one staff login, configured in the environment. Per-person staff accounts come later. */
export function checkAdminCredentials(email: string, password: string): boolean {
  const emailOk = safeEqual(email.trim().toLowerCase(), env("ADMIN_EMAIL").toLowerCase());
  const passwordOk = safeEqual(password, env("ADMIN_PASSWORD"));
  return emailOk && passwordOk;
}

export async function createAdminSession(email: string): Promise<void> {
  const token = signSession({ sub: email.toLowerCase(), role: "admin" }, env("SESSION_SECRET"), { now: new Date(), ttlSeconds: TTL_SECONDS });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function destroyAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getAdminSession(): Promise<SessionClaims | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  await connection(); // the expiry check reads the clock, so it must run at request time
  return verifySession(token, process.env.SESSION_SECRET ?? "", new Date());
}

/** For pages: send signed-out visitors to the login page. */
export async function requireAdmin(): Promise<SessionClaims> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Not signed in");
  }
}

/** For server actions and route handlers: throw instead of redirecting. */
export async function assertAdmin(): Promise<SessionClaims> {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError();
  return session;
}
