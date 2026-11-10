import { BRAND } from "@/lib/config/brand";

interface LogoProps {
  className?: string;
}

/** Monogram: a serif B inside a fine ring. Used where the full wordmark won't fit. */
export function LogoMark({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <circle cx="16" cy="16" r="14.2" fill="none" stroke="currentColor" strokeWidth="1" />
      <text x="16" y="22.5" textAnchor="middle" fontFamily="var(--font-display), Georgia, serif" fontSize="19" fontWeight="500" fill="currentColor">B</text>
    </svg>
  );
}

/** Wordmark: the name in the display serif with a small spaced-out descriptor beneath. */
export function Logo({ className }: LogoProps) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className ?? ""}`}>
      <span className="font-serif text-[27px] font-medium tracking-[0.04em]">{BRAND.shortName}</span>{" "}
      <span className="mt-1 text-[8.5px] font-medium tracking-[0.42em] text-ink-soft uppercase">Fashions</span>
    </span>
  );
}
