import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("passwords", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false);
  });

  it("never stores the password and salts every hash differently", async () => {
    const [a, b] = await Promise.all([hashPassword("same-password"), hashPassword("same-password")]);
    expect(a).not.toContain("same-password");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
  });

  it("treats missing or malformed hashes as no match", async () => {
    for (const stored of [undefined, null, "", "plain", "scrypt$$", "bcrypt$a$b", "scrypt$abc$short"]) {
      expect(await verifyPassword("anything", stored)).toBe(false);
    }
  });
});
