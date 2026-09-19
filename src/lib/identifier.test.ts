import { describe, expect, it } from "vitest";
import { maskIdentifier, parseIdentifier } from "./identifier";

const phone = (raw: string) => {
  const r = parseIdentifier(raw);
  return r.ok ? r.id : r;
};

describe("parseIdentifier: Indian mobile formats", () => {
  it.each([
    "9876543210",
    "98765 43210",
    "98765-43210",
    "09876543210",
    "+91 98765 43210",
    "+91-9876543210",
    "919876543210",
    "0091 9876543210",
    "(+91) 98765 43210",
  ])("normalises %s to E.164", (raw) => {
    expect(phone(raw)).toEqual({ kind: "phone", value: "+919876543210" });
  });

  it.each(["5876543210", "1234567890", "9999999999", "98765", "98765432101234", "abcdefghij", "0000000000"])(
    "rejects %s",
    (raw) => {
      expect(parseIdentifier(raw).ok).toBe(false);
    },
  );

  it("accepts international numbers for NRIs", () => {
    expect(phone("+1 415 555 2671")).toEqual({ kind: "phone", value: "+14155552671" });
    expect(phone("+44 7911 123456")).toEqual({ kind: "phone", value: "+447911123456" });
    expect(phone("+971 50 123 4567")).toEqual({ kind: "phone", value: "+971501234567" });
  });
});

describe("parseIdentifier: email", () => {
  it("lower-cases and trims", () => {
    expect(parseIdentifier("  Priya.Sharma@Gmail.COM ")).toEqual({
      ok: true,
      id: { kind: "email", value: "priya.sharma@gmail.com" },
    });
  });

  it.each(["priya@", "@gmail.com", "priya@gmail", "priya sharma@gmail.com", "a@b.c"])("rejects %s", (raw) => {
    expect(parseIdentifier(raw).ok).toBe(false);
  });

  it("rejects empty input", () => {
    expect(parseIdentifier("   ").ok).toBe(false);
  });
});

describe("maskIdentifier", () => {
  it("masks email and phone without revealing the full value", () => {
    expect(maskIdentifier({ kind: "email", value: "priya.sharma@gmail.com" })).toMatch(/^pr•+@gmail\.com$/);
    const masked = maskIdentifier({ kind: "phone", value: "+919876543210" });
    expect(masked).toBe("+91 98••• ••210");
    expect(masked).not.toContain("7654");
  });
});
