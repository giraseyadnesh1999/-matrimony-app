import { describe, expect, it } from "vitest";
import { blindIndex, decrypt, encrypt, generateOtp, hashOtp, safeEqualHex, sha256 } from "./crypto";

describe("field encryption", () => {
  it("round-trips unicode", () => {
    const plain = "+919876543210 · प्रिया";
    expect(decrypt(encrypt(plain))).toBe(plain);
  });

  it("uses a fresh IV each time and never leaks plaintext", () => {
    const a = encrypt("secret@example.com");
    const b = encrypt("secret@example.com");
    expect(a).not.toBe(b);
    expect(a).not.toContain("secret");
  });

  it("detects tampering (GCM auth tag)", () => {
    const [v, iv, tag, ct] = encrypt("hello").split(".");
    const flipped = Buffer.from(ct!, "base64url");
    flipped[0] = flipped[0]! ^ 1;
    expect(() => decrypt([v, iv, tag, flipped.toString("base64url")].join("."))).toThrow();
  });
});

describe("blind index", () => {
  it("is deterministic, context-separated and not the plain hash", () => {
    expect(blindIndex("phone", "+919876543210")).toBe(blindIndex("phone", "+919876543210"));
    expect(blindIndex("phone", "x")).not.toBe(blindIndex("email", "x"));
    expect(blindIndex("phone", "x")).not.toBe(sha256("phone:x"));
  });
});

describe("otp", () => {
  it("generates 6 digits, keeping leading zeros", () => {
    for (let i = 0; i < 500; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it("hash comparison is exact and bound to the identifier", () => {
    const id = blindIndex("phone", "+919876543210");
    const h = hashOtp(id, "123456");
    expect(safeEqualHex(h, hashOtp(id, "123456"))).toBe(true);
    expect(safeEqualHex(h, hashOtp(id, "123457"))).toBe(false);
    expect(safeEqualHex(h, hashOtp(blindIndex("phone", "+919876543211"), "123456"))).toBe(false);
    expect(safeEqualHex(h, "")).toBe(false);
  });
});
