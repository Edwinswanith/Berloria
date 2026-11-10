import "server-only";
import { assertAdmin, UnauthorizedError } from "@/lib/auth/admin";
import type { SessionClaims } from "@/lib/auth/session-token";
import { ImageRejectedError } from "@/lib/media/process";
import { logError } from "@/lib/log";
import { AdminError } from "./products";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const ok = <T>(data: T): Response => Response.json({ success: true, data } satisfies ApiResponse<T>);
export const fail = (error: string, status: number): Response => Response.json({ success: false, error } satisfies ApiResponse<never>, { status });

/**
 * Gate for admin route handlers: signed-in staff only, and only from our own pages.
 * (The session cookie is SameSite=Lax; the Origin check is a second line of defence against CSRF.)
 */
export async function guard(request: Request): Promise<SessionClaims> {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) throw new UnauthorizedError();
  return assertAdmin();
}

/** Map known errors to friendly responses; log and hide everything else. */
export function toErrorResponse(scope: string, error: unknown): Response {
  if (error instanceof UnauthorizedError) return fail("Please sign in again.", 401);
  if (error instanceof AdminError || error instanceof ImageRejectedError) return fail(error.message, 400);
  logError(scope, error);
  return fail("Something went wrong. Please try again.", 500);
}
