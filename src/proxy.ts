import { NextResponse, type NextRequest } from "next/server";
import { CUSTOMER_COOKIE, SESSION_COOKIE, verifySession } from "@/lib/auth/session-token";

const ADMIN_LOGIN = "/admin/login";
const LOGIN = "/login";
/** Open to everyone: the two auth screens and the help page (delivery, sizes, contact). */
const PUBLIC_PATHS = new Set([LOGIN, "/signup", "/help"]);
const AFTER_LOGIN = "/shop";

/**
 * The front door.
 *  - Staff area: signed-out visitors go to the staff sign-in.
 *  - Shop: visitors sign in (or create an account) first, then land on the shop.
 * Pages, actions and API routes still check the session themselves; this is the convenient first gate.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const secret = process.env.SESSION_SECRET ?? "";
  const now = new Date();
  const isStaff = verifySession(request.cookies.get(SESSION_COOKIE)?.value, secret, now, "admin") !== null;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!isStaff && pathname !== ADMIN_LOGIN) return NextResponse.redirect(new URL(ADMIN_LOGIN, request.url));
    if (isStaff && pathname === ADMIN_LOGIN) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }

  const isCustomer = verifySession(request.cookies.get(CUSTOMER_COOKIE)?.value, secret, now, "customer") !== null;
  if (isCustomer && (pathname === LOGIN || pathname === "/signup")) return NextResponse.redirect(new URL(AFTER_LOGIN, request.url));
  // Staff can look around the shop without a customer account.
  if (isCustomer || isStaff || PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const login = new URL(LOGIN, request.url);
  if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

/** Everything except API routes, uploaded media, Next's own files and static assets. */
export const config = { matcher: ["/((?!api/|media/|_next/|.*\\.[\\w]+$).*)"] };
