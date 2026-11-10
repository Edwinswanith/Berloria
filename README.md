# Berloria Fashions — women's wear store

Online shop for Berloria Fashions, a Chennai women's wear label (~500–600 dresses, kurtas, co-ords and sarees).
Two flows:

- **Customers:** sign in or create an account (the first screen every visitor sees) → shop with search,
  category, size and price filters → bag → checkout (address, payment) → order confirmation → My orders.
  Nothing is paid at checkout for now: the order alerts staff with the customer's phone and email, the team calls to
  confirm and agree payment, then marks it received. Razorpay online payment switches on once keys are added.
- **Staff (`/admin`):** sales dashboard, orders (confirm → pack → ship with tracking → delivered, or cancel),
  products with stock per size, and the **photo studio** that turns phone photos into shop images with Google Gemini.

Not built yet: password reset, order emails/SMS, returns, bulk product upload.

See [docs/FOUNDATION.md](docs/FOUNDATION.md) for decisions, data model and phases.

## Run it locally

```bash
cp .env.example .env.local   # then fill in the values (see below)
npm install
npm run db      # local MongoDB (keeps data in .data/mongo) — leave running
npm run seed    # 16 sample products, 3 sample orders (refuses to wipe real uploads/orders without -- --force)
npm run dev     # http://localhost:3000
```

### Environment (`.env.local`)

| Variable | What it is |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | The one staff login for `/admin` |
| `SESSION_SECRET` | 32+ random characters; signs the staff session cookie (`openssl rand -base64 48`) |
| `GEMINI_API_KEY` | Google Gemini key for the photo studio. **Empty = sample mode** (results are labelled samples) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay keys for online payment. **Empty = pay after the team confirms** |
| `GEMINI_IMAGE_MODEL`, `GEMINI_IMAGE_SIZE` | Optional overrides (defaults: `gemini-nano-banana-2.1`, `2K`) |

Never commit `.env.local` or paste keys into chat or code.

## Adding a dress (staff flow)

1. `/admin` → **Add a dress**: name, category, price (GST included), stock per size.
2. **Photo studio**: upload Front (required), Back and Side photos of the real garment.
3. **Create shop photos**: on a model (front / back / three-quarter), without a model (front / back), fabric detail.
4. Compare each result with the real dress → **Approve** (goes to the shop gallery), **Try again** or **Reject**.
5. Add a description → **Publish to shop**. Product pages with AI photos carry a short note saying so.

Uploaded originals and unapproved results are staff-only (`/media/sources|candidates/...` answers 404 to everyone else).

## Handling an order (staff flow)

1. **Dashboard** shows sales (today, 7 and 30 days), orders waiting, bestsellers and styles running low.
2. **Orders → To pack & ship**: open an order, **Confirm**, **Mark as packed**, then **Mark as shipped** with the courier and tracking number. The customer's order page updates at each step.
3. **Mark as delivered** when it arrives; cash-on-delivery orders are marked collected at that point.
4. **Cancel order** needs a reason (shown to the customer) and puts the stock back on sale.

## Checks

```bash
npm test            # unit tests (Vitest)
npm run e2e         # browser flows on desktop + phone (Playwright); needs db + seed
npm run typecheck
npm run lint
npm run build
```

The browser tests sign in with the login from `.env.local`, create and delete one product, and place a few
cash-on-delivery orders that are removed again afterwards (`npm run e2e:clean`). With a Gemini key set, the
product test makes two real (billed) image generations.

## Deploying to Vercel

1. **Database:** create a MongoDB Atlas cluster and set `MONGODB_URI` to its connection string (the local `npm run db` database is for development only). Run `npm run seed` against it once, or add products through `/admin`.
2. **Environment variables** (Vercel → Project → Settings → Environment Variables): `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_SECRET` (new random value, 32+ characters), `GEMINI_API_KEY`, and later `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
3. **Photo uploads need blob storage first.** Uploaded and generated photos are currently written to `.data/uploads` on disk, and Vercel's disk is read-only and not shared between requests. Until storage is moved to Vercel Blob (or S3), the photo studio will not work on Vercel; browsing, sign-in, bag, checkout and the dashboard will.
4. Sign-in and generation rate limits are held in memory per server instance; move them to a shared store (e.g. Upstash Redis) for strict limits on Vercel.

## Before going live

- Move image storage to a blob store (see Deploying to Vercel).
- Add password reset for customers (needs an email service).
- Replace the single shared staff login with per-person accounts.
- Confirm GST rates with the accountant (currently 5% up to ₹2,500, 18% above).
- Add Razorpay live keys and a Razorpay webhook (so a payment still counts if the customer closes the tab right after paying).
- Send order emails/SMS; today the customer only has the order page and Track order.
- Publish the returns policy on the Help page.
- Login and generate rate limits are in-memory; use a shared store when running more than one instance.
