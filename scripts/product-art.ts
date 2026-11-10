/**
 * Generates placeholder garment illustrations (SVG, 4:5) into public/products.
 * These stand in until real or AI-studio photos are approved for each product.
 * Run: npm run art
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SEED_PRODUCTS, type ArtKind } from "./seed-data";

const W = 800;
const H = 1000;

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.max(0, Math.min(255, ((n >> shift) & 255) + amount));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

const HANGER = `
  <path d="M400 96 C372 96 372 136 400 136 L400 170" fill="none" stroke="#3a3a3a" stroke-width="5" stroke-linecap="round"/>
  <path d="M400 170 L250 236 M400 170 L550 236" fill="none" stroke="#b08a5a" stroke-width="12" stroke-linecap="round"/>`;

/** Each garment: body in `c`, trims in accent `a`. */
const shapes: Record<ArtKind, (c: string, a: string) => string> = {
  dress: (c, a) => `${HANGER}
    <path d="M330 206 Q400 250 470 206 L512 262 L476 296 L482 430 L612 850 L188 850 L318 430 L324 296 L288 262 Z" fill="${c}"/>
    <path d="M318 430 L482 430 L488 452 L312 452 Z" fill="${shade(c, -28)}"/>
    <path d="M207 788 L593 788 L612 850 L188 850 Z" fill="${a}"/>
    <path d="M330 206 Q400 250 470 206" fill="none" stroke="${a}" stroke-width="8"/>
    <path d="M352 470 L300 780 M448 470 L500 780 M400 470 L400 786" stroke="${shade(c, -18)}" stroke-width="3" opacity=".7"/>`,
  kurta: (c, a) => `${HANGER}
    <path d="M326 204 Q400 244 474 204 L618 316 L572 380 L506 330 L516 880 L284 880 L294 330 L228 380 L182 316 Z" fill="${c}"/>
    <path d="M284 826 L516 826 L516 880 L284 880 Z" fill="${a}"/>
    <path d="M400 232 L400 470" stroke="${a}" stroke-width="6"/>
    ${[270, 320, 370, 420].map((y) => `<circle cx="400" cy="${y}" r="6" fill="${shade(a, -20)}"/>`).join("")}
    <path d="M326 204 Q400 244 474 204" fill="none" stroke="${a}" stroke-width="9"/>
    <path d="M197 336 L246 392 M603 336 L554 392" stroke="${a}" stroke-width="10"/>`,
  coord: (c, a) => `${HANGER}
    <path d="M330 204 Q400 240 470 204 L582 292 L544 346 L498 312 L498 478 L302 478 L302 312 L256 346 L218 292 Z" fill="${c}"/>
    <path d="M302 452 L498 452 L498 478 L302 478 Z" fill="${a}"/>
    <path d="M400 232 L400 452" stroke="${shade(c, -30)}" stroke-width="4"/>
    <path d="M306 506 L494 506 L524 900 L416 900 L400 640 L384 900 L276 900 Z" fill="${c}"/>
    <path d="M306 506 L494 506 L496 532 L304 532 Z" fill="${shade(c, -28)}"/>
    <path d="M279 866 L384 866 L384 900 L276 900 Z M416 866 L521 866 L524 900 L416 900 Z" fill="${a}"/>`,
  saree: (c, a) => `
    <path d="M190 330 L610 330 L610 800 L190 800 Z" fill="${c}"/>
    <path d="M190 330 L610 330 L610 392 L190 392 Z" fill="${a}"/>
    <path d="M190 738 L610 738 L610 800 L190 800 Z" fill="${a}"/>
    ${[410, 480, 550, 620, 690].map((y) => `<path d="M190 ${y} L610 ${y}" stroke="${shade(c, -22)}" stroke-width="3"/>`).join("")}
    ${Array.from({ length: 14 }, (_, i) => `<path d="M${205 + i * 30} 392 l15 -22 l15 22 Z" fill="${shade(a, 40)}" opacity=".85"/>`).join("")}
    <path d="M610 330 L650 360 L650 830 L610 800 Z" fill="${shade(c, -35)}"/>
    <path d="M190 800 L610 800 L650 830 L230 830 Z" fill="${shade(c, -50)}"/>`,
};

function svg(kind: ArtKind, color: string, accent: string, bg: string, detail: boolean): string {
  // Second view: a closer crop of the neckline and bodice.
  const viewBox = detail ? "200 170 400 500" : `0 0 ${W} ${H}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
  <rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
  ${shapes[kind](color, accent)}
</svg>`;
}

const outDir = path.resolve(process.cwd(), "public/products");
mkdirSync(outDir, { recursive: true });
writeFileSync(
  path.join(outDir, "placeholder.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#f6f4f0"/></svg>`,
);
for (const p of SEED_PRODUCTS) {
  writeFileSync(path.join(outDir, `${p.slug}-1.svg`), svg(p.art.kind, p.art.color, p.art.accent, p.art.bg, false));
  writeFileSync(path.join(outDir, `${p.slug}-2.svg`), svg(p.art.kind, p.art.color, p.art.accent, shade(p.art.bg, -6), true));
}
process.stdout.write(`Wrote ${SEED_PRODUCTS.length * 2} images to public/products\n`);
