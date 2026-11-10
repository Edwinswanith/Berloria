import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { BRAND } from "@/lib/config/brand";

/** Sign-in and sign-up: the first screens a visitor sees, so they carry the brand and nothing else. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between bg-blush p-12 lg:flex">
        <Logo className="items-start" />
        <div>
          <p className="font-serif text-6xl leading-[1.02]">Made for her, <em className="text-accent">every day.</em></p>
          <p className="mt-6 max-w-sm leading-relaxed text-ink-soft">{BRAND.description}</p>
        </div>
        <p className="text-xs tracking-[0.14em] text-ink-soft uppercase">Free delivery over ₹1,999 · Pay after we confirm your order</p>
      </aside>
      <main className="flex flex-col items-center justify-center px-5 py-12">
        <div className="mb-10 lg:hidden"><Logo /></div>
        <div className="w-full max-w-sm">{children}</div>
        <p className="mt-10 text-xs text-muted"><Link href="/help" className="hover:text-ink">Help &amp; delivery</Link></p>
      </main>
    </div>
  );
}
