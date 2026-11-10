import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "../session-token";

const secret = "test-secret-that-is-at-least-32-characters-long";
const now = new Date("2026-11-10T10:00:00Z");

describe("session token", () => {
  it("round-trips a valid session", () => {
    const token = signSession({ sub: "u1", role: "admin" }, secret, { now, ttlSeconds: 3600 });
    expect(verifySession(token, secret, now)).toMatchObject({ sub: "u1", role: "admin" });
  });

  it("rejects an expired session", () => {
    const token = signSession({ sub: "u1", role: "admin" }, secret, { now, ttlSeconds: 60 });
    expect(verifySession(token, secret, new Date(now.getTime() + 61_000))).toBeNull();
  });

  it("rejects a tampered payload or signature", () => {
    const token = signSession({ sub: "u1", role: "admin" }, secret, { now, ttlSeconds: 3600 });
    const [payload, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "attacker", role: "admin", exp: 9999999999 })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, secret, now)).toBeNull();
    expect(verifySession(`${payload}.${sig.slice(0, -2)}xx`, secret, now)).toBeNull();
  });

  it("rejects a token signed with another secret and malformed input", () => {
    const token = signSession({ sub: "u1", role: "admin" }, "another-secret-that-is-also-32-chars-long!", { now, ttlSeconds: 3600 });
    expect(verifySession(token, secret, now)).toBeNull();
    for (const bad of ["", "abc", "a.b.c", undefined]) expect(verifySession(bad, secret, now)).toBeNull();
  });

  it("refuses to sign with a short secret", () => {
    expect(() => signSession({ sub: "u1", role: "admin" }, "short", { now, ttlSeconds: 60 })).toThrow(/32/);
  });
});
