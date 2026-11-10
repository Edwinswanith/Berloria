/** Orders where the team still has to ring the customer to confirm and agree payment. */
export interface ContactCheck {
  status: string;
  payment: { method: "online" | "manual"; status: string };
}

/** A fresh, unpaid order that isn't paid online waits for a call from the team. Confirming it clears the alert. */
export const needsContact = (order: ContactCheck): boolean =>
  order.status === "placed" && order.payment.method === "manual" && order.payment.status !== "paid";

/** wa.me wants the number with country code and digits only. */
export const whatsappLink = (phone: string, text: string): string => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
