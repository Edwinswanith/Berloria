"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
] as const;

export function AdminNav({ ordersBadge }: { ordersBadge?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      {TABS.map((tab) => {
        const active = "exact" in tab ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href} href={tab.href} aria-current={active ? "page" : undefined}
            className={`flex h-11 items-center border-b-2 px-3 whitespace-nowrap transition-colors sm:h-14 ${active ? "border-ink font-medium" : "border-transparent text-ink-soft hover:text-ink"}`}
          >
            {tab.label}
            {tab.href === "/admin/orders" && ordersBadge}
          </Link>
        );
      })}
    </>
  );
}
