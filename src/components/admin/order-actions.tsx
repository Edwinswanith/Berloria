"use client";

import { useActionState, useState } from "react";
import { updateOrderAction, type ActionState } from "@/app/admin/actions";

const initial: ActionState = {};
const STEP_LABEL: Record<string, string> = { accepted: "Confirm order", packed: "Mark as packed", shipped: "Mark as shipped", delivered: "Mark as delivered" };

interface OrderActionsProps {
  id: string;
  nextSteps: string[];
  blockedByPayment: boolean;
}

/** The one thing staff should do next, with cancel kept out of the way. */
export function OrderActions({ id, nextSteps, blockedByPayment }: OrderActionsProps) {
  const [state, action, pending] = useActionState(updateOrderAction, initial);
  const [cancelling, setCancelling] = useState(false);
  const forward = nextSteps.filter((s) => s !== "cancelled");
  const primary = forward.includes("shipped") && !forward.includes("packed") ? "shipped" : forward[0];
  const canCancel = nextSteps.includes("cancelled");

  if (nextSteps.length === 0) return null;

  return (
    <div className="card" data-testid="order-actions">
      <h2 className="font-serif text-2xl">Next step</h2>
      {blockedByPayment && <p className="mt-2 text-sm text-warn">The customer hasn&rsquo;t completed the online payment. You can wait, or cancel to release the stock.</p>}

      {primary && !cancelling && (
        <form action={action} className="mt-4 space-y-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="to" value={primary} />
          {primary === "shipped" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="carrier" className="field-label">Courier</label>
                <input id="carrier" name="carrier" placeholder="Delhivery, DTDC, India Post…" required className="field-input" />
              </div>
              <div>
                <label htmlFor="trackingNumber" className="field-label">Tracking number</label>
                <input id="trackingNumber" name="trackingNumber" required className="field-input" />
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className="btn-primary">{pending ? "Saving…" : STEP_LABEL[primary]}</button>
            {primary === "accepted" && forward.includes("packed") && null}
            {canCancel && <button type="button" className="text-sm text-muted underline underline-offset-4" onClick={() => setCancelling(true)}>Cancel order</button>}
          </div>
        </form>
      )}

      {(cancelling || !primary) && canCancel && (
        <form action={action} className="mt-4 space-y-4">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="to" value="cancelled" />
          <div>
            <label htmlFor="note" className="field-label">Reason for cancelling</label>
            <input id="note" name="note" placeholder="Customer asked to cancel" required maxLength={300} className="field-input" />
            <p className="mt-1.5 text-xs text-muted">The customer sees this reason. Stock goes back on sale straight away.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className="btn-primary">{pending ? "Cancelling…" : "Cancel this order"}</button>
            {primary && <button type="button" className="text-sm text-muted underline underline-offset-4" onClick={() => setCancelling(false)}>Keep order</button>}
          </div>
        </form>
      )}
      {state.error && <p role="alert" className="field-error mt-3">{state.error}</p>}
    </div>
  );
}
