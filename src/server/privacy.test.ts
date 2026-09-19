import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./messaging", () => ({ sendOtp: vi.fn(), sendNotice: vi.fn() }));
vi.mock("./request", () => ({ clientMeta: async () => ({ ipHash: null, userAgent: "vitest" }) }));

import { db } from "@/lib/db";
import { parseIdentifier } from "@/lib/identifier";
import { discover, parseFilters } from "./matches";
import { cancelDeletion, changeConsent, exportUserData, getNominee, requestDeletion, saveNominee } from "./privacy";
import { createUser, currentConsents, recordConsent } from "./users";

const make = async (email: string, gender: "FEMALE" | "MALE", over: Record<string, unknown> = {}) => {
  const id = parseIdentifier(email);
  if (!id.ok) throw new Error("bad");
  const user = await createUser(id.id, { marketing: false, source: "signup" }, null);
  const profile = await db.profile.create({
    data: {
      userId: user.id, profileFor: "SELF", firstName: "Test", gender,
      dateOfBirth: new Date("1995-01-01T00:00:00Z"), maritalStatus: "NEVER_MARRIED", completedAt: new Date(), ...over,
    },
  });
  return { user, profile };
};

beforeEach(async () => {
  for (const t of ["interest", "block", "report", "nominee", "partnerPreference", "profile", "session", "consentRecord", "auditLog", "oAuthAccount"] as const) {
    await (db[t] as unknown as { deleteMany: () => Promise<unknown> }).deleteMany();
  }
  await db.user.deleteMany();
});

describe("consent withdrawal", () => {
  it("removes horoscope data the moment consent is withdrawn", async () => {
    const a = await make("a@example.com", "FEMALE", { manglik: "NO", rashi: "TULA", birthTime: "06:00", birthPlace: "Pune" });
    await recordConsent(a.user.id, "horoscope", true, "onboarding", null);
    expect((await changeConsent(a.user.id, "horoscope", false, null)).ok).toBe(true);

    const p = await db.profile.findUniqueOrThrow({ where: { userId: a.user.id } });
    expect([p.manglik, p.rashi, p.birthTime, p.birthPlace]).toEqual([null, null, null, null]);
    expect((await currentConsents(a.user.id)).horoscope).toBe(false);
    // The withdrawal is itself recorded in the ledger.
    const ledger = await db.consentRecord.findMany({ where: { userId: a.user.id, purpose: "horoscope" }, orderBy: { createdAt: "asc" } });
    expect(ledger.map((l) => l.granted)).toEqual([true, false]);
  });

  it("clears disability details when that consent is withdrawn", async () => {
    const a = await make("a@example.com", "FEMALE", { physicalStatus: "DISABILITY", disabilityNote: "note" });
    await recordConsent(a.user.id, "health_disability", true, "onboarding", null);
    await changeConsent(a.user.id, "health_disability", false, null);
    const p = await db.profile.findUniqueOrThrow({ where: { userId: a.user.id } });
    expect([p.physicalStatus, p.disabilityNote]).toEqual(["NOT_SAID", null]);
  });

  it("does not allow the core consent to be toggled from settings", async () => {
    const a = await make("a@example.com", "FEMALE");
    expect((await changeConsent(a.user.id, "core_service", false, null)).ok).toBe(false);
    expect((await currentConsents(a.user.id)).core_service).toBe(true);
  });
});

describe("deletion request", () => {
  it("hides the member immediately, can be cancelled, and schedules erasure in 7 days", async () => {
    const a = await make("a@example.com", "FEMALE");
    const b = await make("b@example.com", "MALE");
    expect((await discover(a.profile, parseFilters({}))).items).toHaveLength(1);

    const when = await requestDeletion(b.user.id, null);
    const days = (when.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
    expect((await discover(a.profile, parseFilters({}))).items).toHaveLength(0);

    expect(await cancelDeletion(b.user.id, null)).toBe(true);
    expect((await discover(a.profile, parseFilters({}))).items).toHaveLength(1);
    expect(await cancelDeletion(b.user.id, null)).toBe(false); // nothing left to cancel
  });
});

describe("data export (right of access)", () => {
  it("contains the person's own data, decrypted, and none of anyone else's personal data", async () => {
    const a = await make("asha@example.com", "FEMALE", { firstName: "Asha" });
    const b = await make("bhavesh@example.com", "MALE", { firstName: "Bhavesh" });
    await db.interest.create({ data: { fromUserId: a.user.id, toUserId: b.user.id } });
    await saveNominee(a.user.id, { name: "Ravi Kumar", relation: "SPOUSE", contact: "+919876500000" });

    const data = await exportUserData(a.user.id);
    expect(data.account.email).toBe("asha@example.com");
    expect(data.profile?.firstName).toBe("Asha");
    expect(data.nominee).toEqual({ name: "Ravi Kumar", relation: "SPOUSE", contact: "+919876500000" });
    expect(data.interestsSent).toHaveLength(1);
    expect(data.interestsSent[0]!.toMemberId).toBe(b.user.id);

    const json = JSON.stringify(data);
    expect(json).not.toContain("bhavesh@example.com");
    expect(json).not.toContain("Bhavesh");
    expect(json).not.toMatch(/emailEnc|phoneEnc|emailHash|tokenHash/);
  });

  it("stores the nominee encrypted at rest", async () => {
    const a = await make("asha@example.com", "FEMALE");
    await saveNominee(a.user.id, { name: "Ravi Kumar", relation: "SPOUSE", contact: "+919876500000" });
    const raw = await db.nominee.findUniqueOrThrow({ where: { userId: a.user.id } });
    expect(JSON.stringify(raw)).not.toContain("Ravi");
    expect(JSON.stringify(raw)).not.toContain("9876500000");
    expect((await getNominee(a.user.id))?.name).toBe("Ravi Kumar");
  });
});
