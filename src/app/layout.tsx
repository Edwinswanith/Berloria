import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { BRAND } from "@/lib/config/brand";
import "./globals.css";

// Jost: a clean geometric sans that stays readable at small sizes. Cormorant: a high-contrast fashion serif for headings.
const sans = Jost({ variable: "--font-body", subsets: ["latin"] });
const display = Cormorant_Garamond({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
