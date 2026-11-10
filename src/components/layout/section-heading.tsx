import Link from "next/link";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  link?: { href: string; label: string };
}

export function SectionHeading({ eyebrow, title, link }: SectionHeadingProps) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6 sm:mb-10">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-3 font-serif text-4xl leading-none sm:text-5xl">{title}</h2>
      </div>
      {link && <Link href={link.href} className="link-underline shrink-0 text-sm">{link.label}</Link>}
    </div>
  );
}
