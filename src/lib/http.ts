import "server-only";

/** Standard JSON envelope for every API route. */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const ok = <T>(data: T): Response => Response.json({ success: true, data } satisfies ApiResponse<T>);

export const fail = (error: string, status: number, extra: Partial<ApiResponse<unknown>> = {}): Response =>
  Response.json({ success: false, error, ...extra } satisfies ApiResponse<unknown>, { status });

/** Browsers send Origin on POST; if it is present it must be our own site. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null; // not JSON: validation will reject it
  }
}
