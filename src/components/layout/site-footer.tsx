import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BRAND } from "@/lib/config/brand";
import { CATEGORIES, categorySlug } from "@/lib/data/catalog-shared";

const columns = [
  { title: "Shop", links: [{ href: "/shop", label: "Shop all" }, ...CATEGORIES.map((c) => ({ href: `/shop?category=${categorySlug(c)}`, label: c }))] },
  { title: "Help", links: [{ href: "/account", label: "My orders" }, { href: "/help#delivery", label: "Delivery" }, { href: "/help#contact", label: "Contact us" }] },
  { title: "Berloria", links: [{ href: "/help#sizes", label: "Size guide" }, { href: "/help#returns", label: "Returns & exchanges" }, { href: "/admin", label: "Staff sign in" }] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line sm:mt-32">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm space-y-4">
          <Logo className="items-start" />
          <p className="text-sm leading-relaxed text-muted">{BRAND.description}</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="eyebrow mb-4">{col.title}</p>
            <ul className="space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-ink-soft hover:text-ink">{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-page flex flex-col gap-2 border-t border-line py-6 text-xs text-muted sm:flex-row sm:justify-between">
        <span>© {BRAND.name}, Chennai. Prices include GST.</span>
        <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-ink">{BRAND.supportEmail}</a>
      </div>
    </footer>
  );
}
