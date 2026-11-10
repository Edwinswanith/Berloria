/** Removes orders and shopper accounts created by the browser tests and puts their stock back. Safe to run any time. */
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { Order, Product, Shipment, User } from "@/lib/db/models";

const TEST_EMAIL = /^e2e-[\w.-]*@berloria\.example$/;

async function main(): Promise<void> {
  await connectDb();
  const orders = await Order.find({ "contact.email": TEST_EMAIL }, { _id: 1 }).lean();
  const ids = orders.map((o) => o._id);
  const shipments = await Shipment.find({ orderId: { $in: ids } }).lean();
  // Cancelled orders already gave their stock back.
  const lines = shipments.filter((s) => s.status !== "cancelled").flatMap((s) => s.lines);
  await Promise.all(lines.map((l) => Product.updateOne({ _id: l.productId, "variants.sku": l.sku }, { $inc: { "variants.$.stock": l.quantity } })));
  await Shipment.deleteMany({ orderId: { $in: ids } });
  await Order.deleteMany({ _id: { $in: ids } });
  const users = await User.deleteMany({ email: TEST_EMAIL });
  process.stdout.write(`Removed ${users.deletedCount} test account(s). `);
  process.stdout.write(`Cleared ${ids.length} test order(s), returned ${lines.reduce((n, l) => n + l.quantity, 0)} piece(s) to stock.\n`);
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
