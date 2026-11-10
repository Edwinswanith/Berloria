import Link from "next/link";

interface ComingSoonProps {
  eyebrow: string;
  title: string;
  body: string;
}

/** Holding page for areas scheduled in later build phases (see docs/FOUNDATION.md). */
export function ComingSoon({ eyebrow, title, body }: ComingSoonProps) {
  return (
    <section className="container-page flex min-h-[55vh] flex-col items-start justify-center py-24">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-4 max-w-2xl font-serif text-5xl sm:text-6xl">{title}</h1>
      <p className="mt-6 max-w-lg leading-relaxed text-muted">{body}</p>
      <Link href="/shop" className="btn-ghost mt-10">Back to the shop</Link>
    </section>
  );
}
