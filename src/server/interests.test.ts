import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./request", () => ({ clientMeta: async () => ({ ipHash: "test-ip", userAgent: "vitest" }) }));

import { db } from "@/lib/db";
import { blockUser, listConnections, respondToInterest, sendInterest, withdrawInterest } from "./interests";
import { discover, getVisibleProfile, parseFilters } from "./matches";
import { createUser, recordConsent } from "./users";
import { parseIdentifier } from "@/lib/identifier";

async function member(email: string, gender: "FEMALE" | "MALE", over: Record<string, unknown> = {}) {
  const id = parseIdentifier(email);
  if (!id.ok) throw new Error("bad email");
  const user = await createUser(id.id, { marketing: false, source: "signup" }, null);
  const profile = await db.profile.create({
    data: {
      userId: user.id,
      profileFor: "SELF",
      firstName: email.split("@")[0]!,
      lastName: "Sharma",
      gender,
      dateOfBirth: new Date("1996-04-10T00:00:00Z"),
      maritalStatus: "NEVER_MARRIED",
      religion: "HINDU",
      motherTongue: "MARATHI",
      state: "MH",
      city: "Pune",
      diet: "VEG",
      manglik: "YES",
      rashi: "MESHA",
      completedAt: new Date(),
      onboardingStep: 6,
      ...over,
    },
  });
  return { user, profile };
}

beforeEach(async () => {
  for (const t of ["interest", "block", "report", "partnerPreference", "profile", "consentRecord", "auditLog", "rateLimitBucket"] as const) {
    await (db[t] as unknown as { deleteMany: () => Promise<unknown> }).deleteMany();
  }
  await db.user.deleteMany();
});

describe("interests", () => {
  it("sends, then completes a match when the other side reciprocates", async () => {
    const a = await member("asha@example.com", "FEMALE");
    const b = await member("bhavesh@example.com", "MALE");

    expect(await sendInterest(a.user.id, b.user.id)).toEqual({ ok: true, state: "SENT" });
    expect(await sendInterest(a.user.id, b.user.id)).toEqual({ ok: true, state: "SENT" }); // idempotent
    expect(await db.interest.count()).toBe(1);

    expect(await sendInterest(b.user.id, a.user.id)).toEqual({ ok: true, state: "ACCEPTED" });
    const row = await db.interest.findFirstOrThrow();
    expect(row.status).toBe("ACCEPTED");
  });

  it("never reveals a decline: the sender still sees 'sent' and re-sending does nothing", async () => {
    const a = await member("asha@example.com", "FEMALE");
    const b = await member("bhavesh@example.com", "MALE");
    await sendInterest(a.user.id, b.user.id);
    const i = await db.interest.findFirstOrThrow();
    expect((await respondToInterest(b.user.id, i.id, "DECLINE")).ok).toBe(true);

    expect(await sendInterest(a.user.id, b.user.id)).toEqual({ ok: true, state: "SENT" });
    expect((await db.interest.findFirstOrThrow()).status).toBe("DECLINED");
    const view = await getVisibleProfile(a.profile, b.user.id);
    expect(view?.interest).toBe("SENT");
  });

  it("only the recipient can respond, and only once", async () => {
    const a = await member("asha@example.com", "FEMALE");
    const b = await member("bhavesh@example.com", "MALE");
    const c = await member("chetan@example.com", "MALE");
    await sendInterest(a.user.id, b.user.id);
    const i = await db.interest.findFirstOrThrow();
    expect((await respondToInterest(c.user.id, i.id, "ACCEPT")).ok).toBe(false); // wrong person
    expect((await respondToInterest(a.user.id, i.id, "ACCEPT")).ok).toBe(false); // the sender
    expect((await respondToInterest(b.user.id, i.id, "ACCEPT")).ok).toBe(true);
    expect((await respondToInterest(b.user.id, i.id, "DECLINE")).ok).toBe(false); // already answered
  });

  it("supports withdrawing and re-sending", async () => {
    const a = await member("asha@example.com", "FEMALE");
    const b = await member("bhavesh@example.com", "MALE");
    await sendInterest(a.user.id, b.user.id);
    expect(await withdrawInterest(a.user.id, b.user.id)).toBe(true);
    expect((await db.interest.findFirstOrThrow()).status).toBe("WITHDRAWN");
    expect(await sendInterest(a.user.id, b.user.id)).toEqual({ ok: true, state: "SENT" });
    expect((await db.interest.findFirstOrThrow()).status).toBe("PENDING");
  });

  it("refuses hidden, incomplete, suspended and self targets", async () => {
    const a = await member("asha@example.com", "FEMALE");
    const hidden = await member("hidden@example.com", "MALE", { isHidden: true });
    const incomplete = await member("half@example.com", "MALE", { completedAt: null });
    const banned = await member("banned@example.com", "MALE");
    await db.user.update({ where: { id: banned.user.id }, data: { status: "SUSPENDED" } });

    for (const t of [hidden, incomplete, banned, a]) {
      expect((await sendInterest(a.user.id, t.user.id)).ok).toBe(false);
    }
    expect(await db.interest.count()).toBe(0);
  });

  it("caps interests at 25 per day", async () => {
    const a = await member("asha@example.com", "FEMALE");
    const targets = await Promise.all(Array.from({ length: 26 }, (_, i) => member(`m${i}@example.com`, "MALE")));
    const results = [];
    for (const t of targets) results.push(await sendInterest(a.user.id, t.user.id));
    expect(results.filter((r) => r.ok)).toHaveLength(25);
    expect(results[25]!.ok).toBe(false);
  });
});

describe("blocking", () => {
  it("removes each side from the other's discovery and profile view, and deletes interests", async () => {
    const a = await member("asha@example.com", "FEMALE");
    const b = await member("bhavesh@example.com", "MALE");
    await sendInterest(a.user.id, b.user.id);
    expect((await discover(a.profile, parseFilters({}))).items.map((p) => p.userId)).toContain(b.user.id);

    await blockUser(b.user.id, a.user.id);

    expect((await discover(a.profile, parseFilters({}))).items).toHaveLength(0);
    expect((await discover(b.profile, parseFilters({}))).items).toHaveLength(0);
    expect(await getVisibleProfile(a.profile, b.user.id)).toBeNull();
    expect(await getVisibleProfile(b.profile, a.user.id)).toBeNull();
    expect(await db.interest.count()).toBe(0);
    expect((await sendInterest(a.user.id, b.user.id)).ok).toBe(false);
  });
});

describe("discovery privacy", () => {
  it("shows the opposite gender only, excluding hidden/incomplete/self", async () => {
    const a = await member("asha@example.com", "FEMALE");
    const m1 = await member("m1@example.com", "MALE");
    await member("m2@example.com", "MALE", { isHidden: true });
    await member("m3@example.com", "MALE", { completedAt: null });
    await member("f1@example.com", "FEMALE");
    const { items } = await discover(a.profile, parseFilters({}));
    expect(items.map((i) => i.userId)).toEqual([m1.user.id]);
  });

  it("never exposes DOB, contact details or the full surname in a card", async () => {
    const a = await member("asha@example.com", "FEMALE");
    await member("bhavesh@example.com", "MALE");
    const { items } = await discover(a.profile, parseFilters({}));
    const json = JSON.stringify(items);
    expect(json).not.toContain("1996-04-10");
    expect(json).not.toContain("dateOfBirth");
    expect(json).not.toContain("Sharma");
    expect(json).not.toMatch(/bhavesh@example\.com|emailEnc|phoneEnc/);
    expect(items[0]!.name).toBe("bhavesh S.");
  });

  it("hides horoscope data unless consent is currently granted", async () => {
    const a = await member("asha@example.com", "FEMALE");
    const b = await member("bhavesh@example.com", "MALE");
    expect((await getVisibleProfile(a.profile, b.user.id))?.profile.horoscope).toBeNull();
    await recordConsent(b.user.id, "horoscope", true, "settings", null);
    expect((await getVisibleProfile(a.profile, b.user.id))?.profile.horoscope?.rashi).toBe("MESHA");
    await recordConsent(b.user.id, "horoscope", false, "settings", null);
    expect((await getVisibleProfile(a.profile, b.user.id))?.profile.horoscope).toBeNull();
  });

  it("filters by age band and ignores junk filter values", async () => {
    const a = await member("asha@example.com", "FEMALE");
    await member("young@example.com", "MALE", { dateOfBirth: new Date("2003-01-01T00:00:00Z") });
    const older = await member("older@example.com", "MALE", { dateOfBirth: new Date("1990-01-01T00:00:00Z") });
    const filtered = await discover(a.profile, parseFilters({ ageMin: "30", ageMax: "40" }));
    expect(filtered.items.map((i) => i.userId)).toEqual([older.user.id]);
    const junk = parseFilters({ ageMin: "5", religion: "'; DROP TABLE users;--", state: "ZZ", page: "-3" });
    expect(junk).toEqual({
      ageMin: undefined, ageMax: undefined, religion: undefined, motherTongue: undefined,
      state: undefined, maritalStatus: undefined, diet: undefined, education: undefined, page: 1,
    });
  });
});

describe("contact reveal", () => {
  it("needs an accepted interest and consent from BOTH people", async () => {
    const a = await member("asha@example.com", "FEMALE");
    const b = await member("bhavesh@example.com", "MALE");
    await sendInterest(a.user.id, b.user.id);
    await sendInterest(b.user.id, a.user.id); // mutual

    expect((await listConnections(a.user.id)).cards[0]!.contact).toBeNull();

    await recordConsent(a.user.id, "contact_sharing", true, "settings", null);
    expect((await listConnections(a.user.id)).cards[0]!.contact).toBeNull(); // b has not consented

    await recordConsent(b.user.id, "contact_sharing", true, "settings", null);
    const seen = (await listConnections(a.user.id)).cards[0]!.contact;
    expect(seen?.email).toBe("bhavesh@example.com");
    expect(await db.auditLog.count({ where: { action: "contact.revealed", userId: a.user.id } })).toBeGreaterThan(0);

    // Withdrawing consent shuts it off immediately.
    await recordConsent(b.user.id, "contact_sharing", false, "settings", null);
    expect((await listConnections(a.user.id)).cards[0]!.contact).toBeNull();
  });
});
