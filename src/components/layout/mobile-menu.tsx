"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CATEGORIES, categorySlug } from "@/lib/data/catalog-shared";

const SECONDARY = [
  { href: "/bag", label: "Your bag" },
  { href: "/account", label: "My account & orders" },
  { href: "/help", label: "Help & delivery" },
  { href: "/help#sizes", label: "Size guide" },
];

const subscribe = () => () => {};
/** True only in the browser, so the portal never renders during SSR. */
const useIsClient = () => useSyncExternalStore(subscribe, () => true, () => false);

/**
 * Slide-out navigation for screens narrower than `lg`.
 * The panel is portalled to <body>: the sticky header uses backdrop-filter,
 * which would otherwise trap `position: fixed` children inside the header box.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isClient = useIsClient();

  // Close on any link tap. (usePathname would block prerendering of dynamic routes,
  // and query-only changes like switching category keep the same pathname anyway.)
  const closeOnLink = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPop = () => setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      trigger?.focus();
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="-ml-2 inline-flex h-10 items-center gap-2 px-2 text-sm"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M3 7h18M3 12h18M3 17h12" />
              </svg>
              Menu
            </button>

            {isClient &&
              createPortal(
                <div className="lg:hidden">
            <div
              className={`fixed inset-0 z-50 bg-ink/30 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              inert={!open}
              className={`fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-sm flex-col bg-paper shadow-xl transition-transform duration-300 ease-soft ${
                open ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="flex h-16 items-center justify-between border-b border-line px-5">
                <span className="eyebrow">Menu</span>
                <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="-mr-2 h-10 px-2 text-sm">
                  Close
                </button>
              </div>
              <nav aria-label="Mobile" onClick={closeOnLink} className="flex-1 overflow-y-auto px-5 py-6">
                <ul className="space-y-1">
                  <li>
                    <Link href="/shop" className="block py-2 font-serif text-3xl">Shop all</Link>
                  </li>
                  {CATEGORIES.map((c) => (
                    <li key={c}>
                      <Link href={`/shop?category=${categorySlug(c)}`} className="block py-2 font-serif text-3xl text-ink-soft">
                        {c}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-10 space-y-3 border-t border-line pt-6 text-sm">
            {SECONDARY.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-ink-soft">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
