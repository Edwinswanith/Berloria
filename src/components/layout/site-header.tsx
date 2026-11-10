import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CATEGORIES, categorySlug } from "@/lib/data/catalog-shared";
import { BagLink } from "@/components/bag/bag-link";
import { SearchIcon, UserIcon } from "@/components/ui/icons";
import { BRAND } from "@/lib/config/brand";
import { MobileMenu } from "./mobile-menu";

export function SiteHeader() {
  return (
    <>
      <p className="bg-ink px-4 py-2 text-center text-[11px] tracking-[0.12em] text-paper/85 uppercase">
        <span className="sm:hidden">Free delivery over ₹1,999 · Prices incl. GST</span>
        <span className="hidden sm:inline">Free delivery over ₹1,999 · Across India in 3–6 days · Pay after we confirm your order</span>
      </p>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur-md">
        <div className="container-page grid h-[4.5rem] grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex items-center">
            <MobileMenu />
            <nav aria-label="Shop" className="hidden items-center gap-7 text-sm lg:flex">
              <Link href="/shop" className="nav-link text-ink">Shop all</Link>
              {CATEGORIES.map((c) => (
                <Link key={c} href={`/shop?category=${categorySlug(c)}`} className="nav-link">
                  {c}
                </Link>
              ))}
            </nav>
          </div>
          <Link href="/" title={`${BRAND.name} home`}>
            <Logo />
          </Link>
          <div className="flex items-center justify-end gap-5 text-sm">
            <Link href="/help" className="nav-link hidden lg:inline">Help</Link>
            <Link href="/shop#search" className="inline-flex h-10 items-center gap-2 transition-colors hover:text-accent" aria-label="Search">
              <SearchIcon />
            </Link>
            <Link href="/account" className="hidden h-10 items-center gap-2 transition-colors hover:text-accent sm:inline-flex">
              <UserIcon />
              <span className="hidden md:inline">Account</span>
            </Link>
            <BagLink />
          </div>
        </div>
      </header>
    </>
  );
}
