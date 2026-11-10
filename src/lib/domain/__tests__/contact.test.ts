import { describe, expect, it } from "vitest";
import { needsContact, whatsappLink } from "../contact";

describe("needsContact", () => {
  it("flags a new order that is paid by arrangement", () => {
    expect(needsContact({ status: "placed", payment: { method: "manual", status: "pending" } })).toBe(true);
  });
  it("stops once staff have confirmed, or when the order is cancelled", () => {
    expect(needsContact({ status: "accepted", payment: { method: "manual", status: "pending" } })).toBe(false);
    expect(needsContact({ status: "cancelled", payment: { method: "manual", status: "pending" } })).toBe(false);
  });
  it("skips orders that are already paid", () => {
    expect(needsContact({ status: "placed", payment: { method: "manual", status: "paid" } })).toBe(false);
  });
  it("leaves online orders to the payment flow", () => {
    expect(needsContact({ status: "placed", payment: { method: "online", status: "pending" } })).toBe(false);
  });
});

describe("whatsappLink", () => {
  it("uses digits only and encodes the message", () => {
    expect(whatsappLink("+919840012345", "Hello Priya, order BF-1")).toBe("https://wa.me/919840012345?text=Hello%20Priya%2C%20order%20BF-1");
  });
});
