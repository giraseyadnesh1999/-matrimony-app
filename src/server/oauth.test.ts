import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./request", () => ({ clientMeta: async () => ({ ipHash: "test-ip", userAgent: "vitest" }) }));

import { db } from "@/lib/db";
import { completeOAuth, type OAuthContext } from "./oauth";

const meta = { ipHash: "test-ip", userAgent: "vitest" };
const signup: OAuthContext = { intent: "signup", consent: true, marketing: false, next: "/discover" };
const login: OAuthContext = { intent: "login", consent: false, marketing: false, next: "/discover" };
const google = (sub: string, email: string | null, verified = true) => ({
  providerAccountId: sub,
  email,
  emailVerified: verified,
});

beforeEach(async () => {
  await db.consentRecord.deleteMany();
  await db.auditLog.deleteMany();
  await db.oAuthAccount.deleteMany();
  await db.user.deleteMany();
});

describe("completeOAuth", () => {
  it("signs a new person up only from the signup screen with consent, then recognises them", async () => {
    const denied = await completeOAuth("google", google("g1", "a@example.com"), login, meta);
    expect(denied).toEqual({ ok: false, error: "no_account" });
    expect(await db.user.count()).toBe(0);

    const created = await completeOAuth("google", google("g1", "a@example.com"), signup, meta);
    expect(created).toMatchObject({ ok: true, isNewUser: true, method: "google" });
    const consents = await db.consentRecord.findMany();
    expect(consents.map((c) => c.purpose).sort()).toEqual(["core_service", "marketing"]);
    expect(consents.find((c) => c.purpose === "core_service")?.source).toBe("social-signup");

    // Second time works from the login screen and never duplicates the account.
    const again = await completeOAuth("google", google("g1", null), login, meta);
    expect(again).toMatchObject({ ok: true, isNewUser: false });
    expect(await db.user.count()).toBe(1);
  });

  it("links Google (verified email) to an existing account with the same email", async () => {
    const first = await completeOAuth("google", google("g1", "a@example.com"), signup, meta);
    await db.oAuthAccount.deleteMany(); // simulate an account that originally came from email OTP
    const linked = await completeOAuth("google", google("g9", "a@example.com"), login, meta);
    expect(linked).toMatchObject({ ok: true, isNewUser: false });
    if (first.ok && linked.ok) expect(linked.userId).toBe(first.userId);
  });

  it("never links Facebook to an existing account by email", async () => {
    await completeOAuth("google", google("g1", "a@example.com"), signup, meta);
    const fb = await completeOAuth("facebook", google("f1", "a@example.com", false), signup, meta);
    expect(fb).toEqual({ ok: false, error: "account_exists" });
  });

  it("rejects providers that return no email", async () => {
    expect(await completeOAuth("facebook", google("f2", null, false), signup, meta)).toEqual({ ok: false, error: "no_email" });
  });

  it("defeats pre-hijacking: a verified owner replaces an account made with an unverified email", async () => {
    // Attacker signs up with Facebook using the victim's address (unverified).
    const attacker = await completeOAuth("facebook", google("f-attacker", "victim@example.com", false), signup, meta);
    expect(attacker).toMatchObject({ ok: true, isNewUser: true });
    if (!attacker.ok) return;
    const planted = await db.user.findUniqueOrThrow({ where: { id: attacker.userId } });
    expect(planted.emailVerifiedAt).toBeNull();

    // The real owner signs up with Google (verified).
    const owner = await completeOAuth("google", google("g-victim", "victim@example.com"), signup, meta);
    expect(owner).toMatchObject({ ok: true, isNewUser: true });
    if (!owner.ok) return;
    expect(owner.userId).not.toBe(attacker.userId);
    expect(await db.user.findUnique({ where: { id: attacker.userId } })).toBeNull();

    // The attacker's Facebook login no longer reaches the victim's account.
    const retry = await completeOAuth("facebook", google("f-attacker", "victim@example.com", false), login, meta);
    expect(retry).toEqual({ ok: false, error: "account_exists" });
  });
});
