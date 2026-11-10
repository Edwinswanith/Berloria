import { randomBytes } from "node:crypto";
/**
 * Resets the local database and loads the sample store, catalogue, users and a few orders.
 * Run: npm run seed   (requires `npm run db` in another terminal, or MONGODB_URI)
 * Refuses to run against a non-local database.
 */
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { Counter, Order, Product, Shipment, Ticket, User, Vendor } from "@/lib/db/models";
import { splitCart, type VendorShippingInfo } from "@/lib/domain/cart-split";
import { transitionShipment, deriveOrderStatus, type ShipmentState } from "@/lib/domain/fulfillment";
import { SEED_PRODUCTS, SEED_STORE } from "./seed-data";

const DAY = 86_400_000;
const PATH: ShipmentState["status"][] = ["accepted", "packed", "shipped", "delivered"];

const address = (name: string, phone: string, city: string, state: string, postalCode: string) => ({
  name, phone, line1: "12 Sample Street", city, state, postalCode, country: "IN", isDefault: true,
});

function assertLocal(): void {
  const uri = process.env.MONGODB_URI ?? "";
  if (!/localhost|127\.0\.0\.1/.test(uri)) throw new Error(`Refusing to seed a non-local database: ${uri || "(unset)"}`);
}

async function seedStore(adminId: mongoose.Types.ObjectId) {
  const s = SEED_STORE;
  return Vendor.create({
    ownerId: adminId, businessName: s.businessName, slug: s.slug, country: "IN", currency: "INR", city: s.city,
    contact: { name: s.owner.name, email: process.env.ADMIN_EMAIL ?? "admin@berloria.example", phone: s.owner.phone },
    story: s.story, status: "approved", reviewedAt: new Date(), handlingDays: s.handlingDays, pricesIncludeTax: true,
    warehouseAddress: address(s.businessName, s.owner.phone, s.city, s.state, s.postalCode),
    shippingLanes: [{ destination: "IN", ...s.lane }],
  });
}

type StoreDoc = Awaited<ReturnType<typeof seedStore>>;

async function seedProducts(store: StoreDoc) {
  return Product.insertMany(
    SEED_PRODUCTS.map(({ art: _art, ...p }) => ({
      ...p, vendorId: store._id, currency: "INR", status: "active",
      images: [1, 2].map((n) => ({ url: `/products/${p.slug}-${n}.svg`, alt: n === 1 ? p.title : `${p.title}, detail`, kind: "other" })),
      tags: [p.category.toLowerCase(), ...p.materials.map((m) => m.toLowerCase())],
    })),
  );
}

async function seedOrder(
  customer: { _id: mongoose.Types.ObjectId; name: string; email: string; phone: string },
  products: Awaited<ReturnType<typeof seedProducts>>,
  store: StoreDoc,
  picks: { slug: string; sku: string; qty: number }[],
  daysAgo: number,
  target: ShipmentState["status"],
  orderNumber: string,
) {
  const placedAt = new Date(Date.now() - daysAgo * DAY);
  const storeInfo: Record<string, VendorShippingInfo> = {
    [String(store._id)]: {
      id: String(store._id), name: store.businessName, country: store.country, currency: store.currency,
      handlingDays: store.handlingDays, pricesIncludeTax: store.pricesIncludeTax, lanes: store.shippingLanes,
    },
  };
  const lines = picks.map(({ slug, sku, qty }) => {
    const p = products.find((x) => x.slug === slug)!;
    const variant = p.variants.find((v) => v.sku === sku)!;
    return { productId: String(p._id), sku, title: p.title, vendorId: String(p.vendorId),
      unitPrice: { amount: variant.price, currency: p.currency }, gstRate: p.gstRate, quantity: qty, stock: variant.stock };
  });
  const split = splitCart(lines, storeInfo, { destination: "IN", currency: "INR", rates: {} });
  const shippingAddress = address(customer.name, customer.phone, "Bengaluru", "Karnataka", "560001");

  const order = await Order.create({
    orderNumber, accessKey: randomBytes(18).toString("base64url"), userId: customer._id, contact: { name: customer.name, email: customer.email, phone: customer.phone },
    shippingAddress, currency: "INR", subtotal: split.subtotal, shipping: split.shipping, gst: split.gst, total: split.total,
    eta: split.eta, payment: { provider: "mock", status: "paid", paidAt: placedAt },
  });

  const statuses = await Promise.all(split.shipments.map(async (s) => {
    const steps = target === "placed" ? [] : PATH.slice(0, PATH.indexOf(target) + 1);
    const state = steps.reduce<ShipmentState>(
      (st, to, n) => transitionShipment(st, { to, at: new Date(placedAt.getTime() + (n + 1) * (DAY / 2)),
        ...(to === "shipped" ? { tracking: { carrier: "Delhivery", number: `DL${orderNumber.slice(-6)}` } } : {}) }),
      { status: "placed", timeline: [{ status: "placed", at: placedAt }] },
    );
    await Shipment.create({
      orderId: order._id, orderNumber, vendorId: s.vendorId, shippingAddress, currency: "INR",
      lines: s.lines.map((l) => {
        const p = products.find((x) => String(x._id) === l.productId)!;
        const seedVariant = SEED_PRODUCTS.find((x) => x.slug === p.slug)?.variants.find((v) => v.sku === l.sku);
        return { productId: l.productId, sku: l.sku, title: l.title, quantity: l.quantity,
          variantLabel: Object.values(seedVariant?.options ?? {}).join(" / "), image: p.images[0]?.url,
          vendorUnitPrice: l.unitPrice.amount, customerUnitPrice: l.customerUnitPrice, lineTotal: l.lineTotal, gstRate: l.gstRate, gst: l.gst };
      }),
      subtotal: s.subtotal, shipping: s.shipping, gst: s.gst, total: s.total, vendorPayout: s.vendorPayout,
      status: state.status, timeline: [...state.timeline], tracking: state.tracking, eta: s.eta, placedAt,
      statusSince: state.timeline.at(-1)?.at ?? placedAt,
    });
    return state.status;
  }));
  await Order.updateOne({ _id: order._id }, { status: deriveOrderStatus(statuses) });
  return order;
}

/**
 * Seeding wipes the database. Stop if it holds anything staff or customers created:
 * products with uploaded photos, or orders placed through checkout. Pass --force to wipe anyway.
 */
async function assertNothingRealIsLost(): Promise<void> {
  if (process.argv.includes("--force")) return;
  const [uploads, orders] = await Promise.all([
    Product.countDocuments({ "sourcePhotos.0": { $exists: true } }),
    Order.countDocuments({ "payment.provider": { $ne: "mock" } }),
  ]);
  if (uploads + orders > 0) {
    throw new Error(`This database has ${uploads} product(s) with uploaded photos and ${orders} real order(s). Seeding would delete them. Re-run with "npm run seed -- --force" if that is what you want.`);
  }
}

async function main(): Promise<void> {
  assertLocal();
  await connectDb();
  await assertNothingRealIsLost();
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));

  const admin = await User.create({ name: "Store Owner", email: process.env.ADMIN_EMAIL ?? "admin@berloria.example", roles: ["admin"], country: "IN" });
  const customer = await User.create({
    name: "Asha Rao", email: "asha@example.com", phone: "+919800000001", roles: ["customer"],
    addresses: [address("Asha Rao", "+919800000001", "Bengaluru", "Karnataka", "560001")],
  });
  const c = { _id: customer._id, name: "Asha Rao", email: "asha@example.com", phone: "+919800000001" };

  const store = await seedStore(admin._id);
  const products = await seedProducts(store);

  await seedOrder(c, products, store, [{ slug: "indigo-tiered-maxi", sku: "ITM-M", qty: 1 }, { slug: "kalamkari-straight-kurta", sku: "KSK-M", qty: 2 }], 6, "delivered", "BF-100001");
  await seedOrder(c, products, store, [{ slug: "ajrakh-co-ord", sku: "AJC-L", qty: 1 }], 2, "shipped", "BF-100002");
  const late = await seedOrder(c, products, store, [{ slug: "chettinad-cotton-saree", sku: "CCS", qty: 1 }], 3, "placed", "BF-100003");

  await Ticket.create({
    ticketNumber: "T-0001", userId: customer._id, orderId: late._id, category: "delivery", subject: "Has my saree been dispatched?",
    contact: { name: c.name, email: c.email }, messages: [{ authorId: customer._id, authorRole: "customer", body: "No update for three days — is it on its way?" }],
  });

  await Counter.create({ _id: "order", seq: 100003 });

  const counts = await Promise.all([User, Vendor, Product, Order, Shipment].map((m) => m.countDocuments()));
  process.stdout.write(`Seeded users=${counts[0]} store=${counts[1]} products=${counts[2]} orders=${counts[3]} shipments=${counts[4]}\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Seed failed: ${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
