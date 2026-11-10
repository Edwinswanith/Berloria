# Foundation — Berloria Fashions (single-seller women's wear store)

_Last updated 10 Nov 2026. Replaces the earlier multi-vendor marketplace plan._

## What this is

A shop for Berloria Fashions, a Chennai women's wear label selling its own dresses, kurtas, co-ords and sarees (≈500–600 styles, several
sizes each) to customers in India. Two jobs matter most:

1. **Customers** browse and buy easily on a phone.
2. **Staff** add a new style in minutes: a few photos of the garment in, shop-ready photos out.

## Decisions

| Topic | Decision |
| --- | --- |
| Seller model | One seller. Stored as a single `Vendor` record ("the store") so shipping and tax settings live in data, not code. |
| Market | India only, INR. Prices are entered and shown GST-inclusive. |
| GST | Apparel: 5% up to ₹2,500, 18% above (`src/lib/domain/tax.ts`). To be confirmed by the accountant. |
| Sizes | XS–XXL by default; "Free size" for sarees and stoles. Stock is per size. |
| Photos | Staff upload 1–3 photos (front required; back, side). Gemini generates six shots; staff approve each one. |
| Honesty | AI photos are reviewed against the real garment before publishing; product pages say when photos are AI-assisted. |
| Staff login | One shared login from environment variables, signed 12-hour session cookie. Per-person accounts later. |
| Payments | Razorpay (UPI, cards, netbanking) when keys are set, plus cash on delivery up to ₹10,000. Nothing is marked paid without a verified Razorpay signature. |
| Accounts | Visitors sign in or create an account first (email + password, scrypt-hashed), then land on the shop. `/help` stays public. Controlled in `src/proxy.ts`. |
| Checkout | For signed-in shoppers: name, email, mobile, address. The bag lives in the browser (SKUs and quantities only); every price, stock level and total is recomputed on the server. |
| Delivery | Flat ₹79, free from ₹1,999 (`src/lib/config/store.ts`). |
| Order access | Orders are listed under Account → My orders; each order page also needs its unguessable key. |
| Shop | Search (name, category, fabric), category, size-in-stock and price-band filters, sort. Rules in `src/lib/data/catalog-shared.ts`. |
| Brand | Berloria Fashions. Cormorant Garamond headings, Jost body, white background with a wine-rose accent. |
| Stack | Next.js 16 (App Router, Cache Components), React 19, Tailwind 4, MongoDB/Mongoose, `@google/genai`, sharp. Hosting: Vercel. |

## Photo studio

```
upload (front/back/side) → normalise (≤2000px webp) → sources/   (staff-only)
generate one shot        → Gemini with the source photos → candidates/ (staff-only)
approve                  → copy as 1600×2000 webp → gallery/  (public) + product.images
publish                  → needs ≥1 gallery photo, a description, and stock
```

- Shots (`src/lib/ai/shots.ts`): on model front / back / three-quarter, without model front / back, fabric detail.
  Back shots need the back photo.
- One studio look for the whole catalogue (backdrop, light) is defined in `STUDIO` in that file.
- **One model for the whole catalogue:** `public/studio/model.webp` is attached to every on-model shot as an identity
  reference, so the same person appears on every product. Replace that file to change the model; delete it to fall
  back to the written description.
- Uploads are treated as rough phone snapshots: the prompt names what each photo shows (front / back / side), tells
  the model to ignore the room, hanger, wrinkles and indoor colour cast, and lists what must stay identical.
- Sarees get their own directions: draped on the model, neatly folded for the garment-only shot.
- Trial on rough photos (10 Nov 2026): see `docs/design/ai-trial/`. Shape, colour, collar, buttons, borders and
  small repeat prints carried over well. Large prints keep their look but not the exact position of every motif,
  and anything not in the photo (blouse, trousers, the unseen side) is invented — hence the staff approval step.
- Generator (`src/lib/ai/generator.ts`): Gemini when `GEMINI_API_KEY` is set; otherwise a clearly labelled sample.
- Rate limit: 40 generations per 10 minutes per staff session.

## Data model (Mongoose, `src/lib/db/models`)

- `Product` — title, slug, category, variants (sku, size, price in paise, stock), `images` (url, alt, kind, ai),
  `sourcePhotos` (url, view), status `draft | active | archived`.
- `GeneratedImage` — productId, shot, status `generating | ready | approved | rejected | failed`, url, prompt.
- `Vendor` (the store), `User`, `Order` + `Shipment`, `Cart`, `Wishlist`, `Review`, `Ticket`, `Notification`.

Money is always integer paise. Domain rules (pricing, GST, order status, stock signals) are pure functions in
`src/lib/domain` with unit tests.

## Security

- `/admin/**` is gated three times: `src/proxy.ts` (redirect), each page (`requireAdmin`), each action and API
  route (`assertAdmin` + same-origin check).
- Login: constant-time comparison, 5 attempts per 15 minutes, generic error message.
- Uploads: decoded with sharp (type by content, not extension), ≤12 MB, re-encoded; storage keys are generated
  UUIDs validated by a strict pattern.
- Secrets only in environment variables.

## Order flow

```
bag (browser) → POST /api/bag/quote → POST /api/checkout
  validate → re-price → reserve stock (atomic per size) → Order + Shipment
  cash on delivery: done        online: Razorpay popup → POST /api/checkout/verify (signature check) → paid
staff: placed → accepted → packed → shipped (courier + tracking) → delivered     any open step → cancelled (stock returned)
```

- Rules are pure functions with unit tests: `domain/bag.ts` (totals, stock caps), `domain/fulfillment.ts`
  (allowed steps), `domain/sales.ts` (dashboard numbers, Chennai-time days).
- An unpaid online order holds its stock and shows under "Not paid" in admin until it is paid or cancelled.

## Phases

1. **Done** — customer accounts, storefront with search and filters, bag, checkout, My orders; staff sign-in, dashboard, orders, products, photo studio; tests.
2. **Next** — Razorpay live keys + webhook, order emails/SMS, returns policy, bulk upload, blob storage for images.
3. Password reset and phone OTP sign-in; saved addresses.
4. Search and filters (size, price, fabric), wishlist, reviews, discount codes.

## Open questions for the studio

- Garment mix (sarees vs kurtis vs western) and whether sizes are standard or made-to-measure.
- Who uploads: one person or several? (decides when per-person staff accounts are needed)
- Preferred model look and backdrop; a real logo file if one exists (the current wordmark is typeset).
- Returns and exchange policy; courier partner; GST number for invoices.
