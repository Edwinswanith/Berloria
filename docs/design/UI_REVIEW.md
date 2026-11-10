# UI review — storefront v0 (2026-11-07)

Brief: neat, white, aesthetic, made to show off unique products. Reviewed at desktop (1024px) and phone (375px) widths, on the home, shop, product, holding and 404 pages.

**Verdict:** the type and the restraint are right: a white page, a serif headline face, quiet details. But the layout works against the products. On first load you see a headline and an **empty grey box**. On a phone you scroll about 1,000px before you see a price. The navigation has holes.

## Critical — blocks a good first impression or a purchase

| # | Where | Problem | Fix |
|---|---|---|---|
| C1 | Home hero | No product is visible in the first screen. The lead image is crop-heavy and shows only its empty top half, so the page opens on a grey rectangle. | Put the headline and a lead product side by side, so the product is visible without scrolling on every screen size. |
| C2 | Home featured spread | The white gradient caption sits **on top of the product** (the bowl is hidden behind its own label). The lead and side cards don't line up in height. | Put captions below images, never over them. Use a calm, aligned grid. |
| C3 | Product page, phone | Two full-height images come before the title, price and Add-to-bag. You scroll about 1,000px to find the price. | Swipeable gallery with dots on phones. Title, price and options right below it. |
| C4 | Navigation, phone | No menu. Categories, Sell with us and Help can't be reached on a phone. | Add a menu button with a slide-out panel. |
| C5 | Footer | Track an order, Contact us and Delivery & customs all point to `/account`. | Add a real Help page with sections for each, and link to those sections. |

## Major — hurts usability or polish

| # | Where | Problem | Fix |
|---|---|---|---|
| M1 | Header | The announcement bar is sticky and wraps to two lines on phones. Together with the header it takes about 120px of a 812px screen. | The bar scrolls away and is one short line. Only the slim header stays at the top. |
| M2 | Hero buttons | "Shop the edition" wraps onto two lines inside the pill on phones. | Buttons never wrap text. Shorter labels. Full width on phones. |
| M3 | "By craft" tiles | Four large text-only boxes, mostly empty. A craft is shown in words when it could be shown in objects. | Tiles with a product image from each category. |
| M4 | Product cards | One image only, no hover response beyond a slight zoom, no sign of scarcity. For one-off objects, "Only 2 left" matters. | Second image on hover, a low-stock note, consistent price placement. |
| M5 | Product page | No quantity choice. The browser tab title is the generic site title. No "More from this maker", so the page is a dead end. | Quantity stepper, a title per product, and a related row from the same maker. |
| M6 | Shop | No sorting. | Sort by newest, price low to high, price high to low. |
| M7 | Product art | The second image is a broken crop (the jar is cut in half). The cushion cover is drawn as a notebook. | Use a proper second view and fix the drawing types. *Real photography is still the biggest single upgrade.* |
| M8 | Bag badge | Shows "0" all the time, which is noise. | Show the count only when the bag has items. |

## Minor

- The "Spring edition" label is wrong in November → use "Edition 01".
- The edition badge covers part of the image → make it smaller and lighter.
- The page has no entrance motion, so it feels static. Add one calm, staggered fade-in on the hero, and respect reduced-motion settings.
- Eyebrow labels at 11px with wide spacing are hard to read on phones → 11px is the floor; use it only for labels.
- The Makers section has no link to the maker's products → link it to a filtered shop.

## Already good — keep

- White page, ink-black type, warm off-white panels: calm and premium.
- Instrument Serif for display text paired with Geist for body text.
- Sold-out options are crossed out and the button disables. Prices clearly include GST.
- Loading skeletons on every database-backed section. No sideways scrolling on phones.

## Outcome (same day)

All Critical and Major items are fixed except **M7, real photography**, which still needs the client's assets. The tests also caught three problems that the visual review missed:

| Found by | Problem | Fix |
|---|---|---|
| Manual phone check | The menu panel was trapped inside the header: `backdrop-filter` makes the header the container for fixed-position children. | The panel now renders at the page root (portal to `<body>`). |
| Playwright | Tapping another category from inside the menu left it open, because only the query string changed. | The menu closes on any link tap, on back/forward, and on Escape. |
| Playwright console check | `usePathname()` in the menu blocked prerendering of `/products/[slug]` and logged an error on every product page. | Removed it; link taps and back/forward now close the menu instead. |
| axe | The phone image gallery couldn't be scrolled with a keyboard. | The gallery can now take keyboard focus. |

**Known trade-off:** an unknown product URL shows the not-found page with status 200 and `noindex`. Next 16 fixes the status once streaming starts. A true 404 would need a database check in `proxy.ts` on every product request. Revisit when product URLs matter for SEO, for example by prerendering known slugs.

**Results:** 39 unit tests and 64 Playwright tests (desktop + Pixel 7) pass. No serious or critical axe violations on the 6 key pages. Production build passes.

## Test plan

Playwright tests run each flow on desktop and on a phone:
home → featured → product; category filters; sorting; choosing a variant (price and stock change, sold-out state); quantity; Add-to-bag notice; phone menu; every internal link returns 200; 404 page; accessibility check (axe) on key pages; no sideways scrolling; no console errors.
