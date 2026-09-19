import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: Array<{ channel: string; to: string; code: string }> = [];
vi.mock("./messaging", () => ({
  sendOtp: vi.fn(async (channel: string, to: string, code: string) => {
    sent.push({ channel, to, code });
  }),
  sendNotice: vi.fn(),
}));
vi.mock("./request", () => ({
  clientMeta: async () => ({ ipHash: "test-ip", userAgent: "vitest" }),
}));

import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { parseIdentifier } from "@/lib/identifier";
import { startOtp, verifyOtp } from "./otp";

const id = (raw: string) => {
  const r = parseIdentifier(raw);
  if (!r.ok) throw new Error(r.error);
  return r.id;
};
const consent = { accepted: true, ageConfirmed: true, marketing: false };
const lastCode = () => sent[sent.length - 1]!.code;

beforeEach(async () => {
  sent.length = 0;
  await db.consentRecord.deleteMany();
  await db.auditLog.deleteMany();
  await db.session.deleteMany();
  await db.otpChallenge.deleteMany();
  await db.rateLimitBucket.deleteMany();
  await db.user.deleteMany();
});

describe("phone signup", () => {
  it("creates a verified user, records consent, and stores contact encrypted", async () => {
    const phone = id("98765 43210");
    expect(await startOtp({ identifier: phone, intent: "SIGNUP", consent })).toEqual({ ok: true, cooldownSec: 30 });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ channel: "SMS", to: "+919876543210" });

    const res = await verifyOtp({ identifier: phone, code: lastCode() });
    expect(res).toMatchObject({ ok: true, isNewUser: true, method: "otp-sms" });

    const user = await db.user.findFirstOrThrow({ include: { consents: true } });
    expect(user.phoneVerifiedAt).not.toBeNull();
    expect(decrypt(user.phoneEnc!)).toBe("+919876543210");
    expect(user.consents.map((c) => `${c.purpose}:${c.granted}`).sort()).toEqual(["core_service:true", "marketing:false"]);

    // No plaintext contact anywhere in the auth tables.
    const dump = JSON.stringify({
      users: await db.user.findMany(),
      challenges: await db.otpChallenge.findMany(),
      audit: await db.auditLog.findMany(),
    });
    expect(dump).not.toContain("9876543210");
  });

  it("refuses to start a signup without consent or age confirmation", async () => {
    const phone = id("9876543210");
    const r1 = await startOtp({ identifier: phone, intent: "SIGNUP", consent: { ...consent, accepted: false } });
    const r2 = await startOtp({ identifier: phone, intent: "SIGNUP", consent: { ...consent, ageConfirmed: false } });
    const r3 = await startOtp({ identifier: phone, intent: "SIGNUP" });
    expect([r1.ok, r2.ok, r3.ok]).toEqual([false, false, false]);
    expect(sent).toHaveLength(0);
  });
});

describe("code handling", () => {
  it("is single-use", async () => {
    const email = id("Asha@Example.com");
    await startOtp({ identifier: email, intent: "SIGNUP", consent });
    const code = lastCode();
    expect((await verifyOtp({ identifier: email, code })).ok).toBe(true);
    expect((await verifyOtp({ identifier: email, code })).ok).toBe(false);
  });

  it("locks the challenge after 5 wrong guesses, even for the right code", async () => {
    const email = id("locked@example.com");
    await startOtp({ identifier: email, intent: "SIGNUP", consent });
    const right = lastCode();
    const wrong = right === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect((await verifyOtp({ identifier: email, code: wrong })).ok).toBe(false);
    const res = await verifyOtp({ identifier: email, code: right });
    expect(res.ok).toBe(false);
  });

  it("rejects expired codes", async () => {
    const email = id("late@example.com");
    await startOtp({ identifier: email, intent: "SIGNUP", consent });
    await db.otpChallenge.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await verifyOtp({ identifier: email, code: lastCode() })).ok).toBe(false);
  });

  it("only the newest code works after a resend", async () => {
    const email = id("resend@example.com");
    await startOtp({ identifier: email, intent: "SIGNUP", consent });
    const first = lastCode();
    await db.rateLimitBucket.deleteMany(); // skip the 30s cooldown
    await startOtp({ identifier: email, intent: "SIGNUP", consent });
    const second = lastCode();
    if (first !== second) expect((await verifyOtp({ identifier: email, code: first })).ok).toBe(false);
    expect((await verifyOtp({ identifier: email, code: second })).ok).toBe(true);
  });

  it("enforces the resend cooldown", async () => {
    const phone = id("9876543210");
    expect((await startOtp({ identifier: phone, intent: "SIGNUP", consent })).ok).toBe(true);
    const again = await startOtp({ identifier: phone, intent: "SIGNUP", consent });
    expect(again.ok).toBe(false);
    expect(sent).toHaveLength(1);
  });
});

describe("login", () => {
  it("logs an existing user in without creating a duplicate", async () => {
    const phone = id("9876543210");
    await startOtp({ identifier: phone, intent: "SIGNUP", consent });
    await verifyOtp({ identifier: phone, code: lastCode() });
    await db.rateLimitBucket.deleteMany();

    expect((await startOtp({ identifier: phone, intent: "LOGIN" })).ok).toBe(true);
    const res = await verifyOtp({ identifier: phone, code: lastCode() });
    expect(res).toMatchObject({ ok: true, isNewUser: false });
    expect(await db.user.count()).toBe(1);
  });

  it("does not reveal whether an account exists, and sends nothing for unknown identifiers", async () => {
    const stranger = id("6000000001");
    const res = await startOtp({ identifier: stranger, intent: "LOGIN" });
    expect(res).toEqual({ ok: true, cooldownSec: 30 });
    expect(sent).toHaveLength(0);
    expect((await verifyOtp({ identifier: stranger, code: "123456" })).ok).toBe(false);
    expect(await db.user.count()).toBe(0);
  });

  it("never signs in a suspended user", async () => {
    const email = id("banned@example.com");
    await startOtp({ identifier: email, intent: "SIGNUP", consent });
    await verifyOtp({ identifier: email, code: lastCode() });
    await db.user.updateMany({ data: { status: "SUSPENDED" } });
    await db.rateLimitBucket.deleteMany();
    sent.length = 0;
    await startOtp({ identifier: email, intent: "LOGIN" });
    expect(sent).toHaveLength(0);
  });
});

describe("unverified-email accounts (pre-hijack defence)", () => {
  it("cannot be logged into by OTP, but a signup by the real owner replaces it", async () => {
    const { createUser } = await import("./users");
    const email = id("victim@example.com");
    const planted = await createUser(email, { marketing: false, source: "social-signup" }, "ip", { verified: false });

    // LOGIN sends nothing.
    await startOtp({ identifier: email, intent: "LOGIN" });
    expect(sent).toHaveLength(0);

    await db.rateLimitBucket.deleteMany(); // the LOGIN attempt above used up the cooldown
    // SIGNUP sends a code; verifying it wipes the planted account and creates a fresh one.
    await startOtp({ identifier: email, intent: "SIGNUP", consent });
    const res = await verifyOtp({ identifier: email, code: lastCode() });
    expect(res).toMatchObject({ ok: true, isNewUser: true });
    if (res.ok) expect(res.userId).not.toBe(planted.id);
    expect(await db.user.findUnique({ where: { id: planted.id } })).toBeNull();
    expect(await db.user.count()).toBe(1);
  });
});
