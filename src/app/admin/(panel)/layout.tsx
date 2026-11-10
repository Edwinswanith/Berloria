import { Suspense } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminNav } from "@/components/admin/admin-nav";
import { OrdersBadge } from "@/components/admin/orders-badge";
import { BRAND } from "@/lib/config/brand";
import { logout } from "../actions";

/**
 * Every staff screen reads the session, so none of it can be prerendered. Per the Next guide
 * "Authentication with Cache Components", session-gated segments opt out of instant navigation.
 */
export const instant = false;

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="mx-auto flex min-h-14 w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 sm:px-6">
          <Link href="/admin" className="flex h-14 items-center gap-2.5 text-sm font-medium">
            <LogoMark className="h-5 w-5" />
            {BRAND.shortName} admin
          </Link>
          <nav aria-label="Admin" className="order-3 -mx-4 flex w-screen gap-1 overflow-x-auto border-t border-line px-4 text-sm sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:border-0 sm:px-6">
            <AdminNav ordersBadge={<Suspense fallback={null}><OrdersBadge /></Suspense>} />
          </nav>
          <nav aria-label="Account" className="flex items-center gap-4 text-sm">
            <Link href="/" className="hidden text-ink-soft hover:text-ink sm:inline">View shop ↗</Link>
            <form action={logout}>
              <button type="submit" className="text-ink-soft hover:text-ink">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-paper" aria-hidden="true" />}>
          <Gate>{children}</Gate>
        </Suspense>
      </main>
    </>
  );
}

/** Nothing inside the panel renders until the staff session is confirmed. */
async function Gate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
