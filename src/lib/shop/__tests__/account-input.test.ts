import { describe, expect, it } from "vitest";
import { parseSignIn, parseSignUp, safeNextPath } from "../account-input";

describe("account input", () => {
  it("accepts a valid sign-up and tidies the email", () => {
    expect(parseSignUp({ name: " Asha Rao ", email: " Asha@Example.COM ", password: "longenough" }))
      .toEqual({ success: true, data: { name: "Asha Rao", email: "asha@example.com", password: "longenough" } });
  });

  it("explains what is wrong", () => {
    const result = parseSignUp({ name: "", email: "nope", password: "short" });
    expect(result).toEqual({ success: false, errors: { name: "Enter your name", email: "Enter a valid email address", password: "Use at least 8 characters" } });
    expect(parseSignIn({ email: "a@b.co", password: "" }).success).toBe(false);
  });

  it("only allows same-site destinations after sign-in", () => {
    expect(safeNextPath("/products/marigold-wrap-dress")).toBe("/products/marigold-wrap-dress");
    expect(safeNextPath("/shop?category=sarees&size=M")).toBe("/shop?category=sarees&size=M");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/login", "/admin/orders", "/api/checkout", undefined, 5]) {
      expect(safeNextPath(bad)).toBe("/shop");
    }
  });
});
