import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { razorpayKeys, verifyPaymentSignature } from "../razorpay";

const secret = "test_secret_value";
const sign = (orderId: string, paymentId: string) => createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");

describe("razorpay", () => {
  it("accepts a genuine signature", () => {
    expect(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1") }, secret)).toBe(true);
  });

  it("rejects a signature for another payment, a tampered one, or junk", () => {
    expect(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_2", signature: sign("order_1", "pay_1") }, secret)).toBe(false);
    expect(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature: sign("order_1", "pay_1").replace(/.$/, "0") }, "other")).toBe(false);
    expect(verifyPaymentSignature({ orderId: "order_1", paymentId: "pay_1", signature: "" }, secret)).toBe(false);
  });

  it("is only switched on when both keys are present", () => {
    expect(razorpayKeys({})).toBeNull();
    expect(razorpayKeys({ RAZORPAY_KEY_ID: "rzp_test_x" })).toBeNull();
    expect(razorpayKeys({ RAZORPAY_KEY_ID: "rzp_test_x", RAZORPAY_KEY_SECRET: "s" })).toEqual({ keyId: "rzp_test_x", keySecret: "s" });
  });
});
