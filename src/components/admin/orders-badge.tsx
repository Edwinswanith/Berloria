import { connection } from "next/server";
import { countOrdersToContact } from "@/lib/admin/orders";
import { logError } from "@/lib/log";

/** The number of new orders waiting for a call, next to the Orders tab. */
export async function OrdersBadge() {
  await connection(); // per request: never part of a prerendered shell
  let count = 0;
  try {
    count = await countOrdersToContact();
  } catch (error: unknown) {
    logError("admin.ordersBadge", error); // the tab still works without its count
  }
  if (count === 0) return null;
  return (
    <span className="ml-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-medium text-paper tabular-nums" data-testid="orders-badge">
      {count}<span className="sr-only"> new to call</span>
    </span>
  );
}
