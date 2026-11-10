import { createHmac, timingSafeEqual } from "node:crypto";

export type SessionRole = "admin" | "customer";

export interface SessionClaims {
  sub: string;
  role: SessionRole;
}

interface StoredClaims extends SessionClaims {
  exp: number;
}

export const SESSION_COOKIE = "admin_session";
export const CUSTOMER_COOKIE = "customer_session";

const MIN_SECRET_LENGTH = 32;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function assertSecret(secret: string): void {
  if (secret.length < MIN_SECRET_LENGTH) throw new Error(`SESSION_SECRET must be at least ${MIN_SECRET_LENGTH} characters`);
}

/** Signed, tamper-evident session value: base64url(JSON claims) + "." + HMAC-SHA256. */
export function signSession(claims: SessionClaims, secret: string, opts: { now: Date; ttlSeconds: number }): string {
  assertSecret(secret);
  const stored: StoredClaims = { ...claims, exp: Math.floor(opts.now.getTime() / 1000) + opts.ttlSeconds };
  const payload = Buffer.from(JSON.stringify(stored)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the claims if the token is authentic and unexpired, otherwise null. Never throws on bad input. */
/** `role` must match: a customer token never opens the staff area, and the other way round. */
export function verifySession(token: string | undefined, secret: string, now: Date, role: SessionRole = "admin"): SessionClaims | null {
  if (!token || secret.length < MIN_SECRET_LENGTH) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;

  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<StoredClaims>;
    if (typeof claims.sub !== "string" || claims.role !== role || typeof claims.exp !== "number") return null;
    if (claims.exp * 1000 <= now.getTime()) return null;
    return { sub: claims.sub, role: claims.role };
  } catch {
    return null;
  }
}
