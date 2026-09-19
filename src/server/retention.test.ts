import { beforeEach, describe, expect, it, vi } from "vitest";

const notices: Array<{ to: string; subject: string }> = [];
vi.mock("./messaging", () => ({
  sendOtp: vi.fn(),
  sendNotice: vi.fn(async (_c: string, to: string, subject: string) => {
    notices.push({ to, subject });
  }),
}));
vi.mock("./request", () => ({ clientMeta: async () => ({ ipHash: null, userAgent: "vitest" }) }));

import { blindIndex } from "@/lib/crypto";
import { db } from "@/lib/db";
import { parseIdentifier } from "@/lib/identifier";
import { INACTIVITY_DAYS } from "@/config/site";
import { runRetention, scheduleDeletionDate } from "./retention";
import { createUser } from "./users";

const DAY = 86_400_000;
const make = async (email: string) => {
  const id = parseIdentifier(email);
  if (!id.ok) throw new Error("bad");
  const user = await createUser(id.id, { marketing: true, source: "signup" }, null);
  await db.profile.create({
    data: {
      userId: user.id, profileFor: "SELF", firstName: "Test", gender: "MALE",
      dateOfBirth: new Date("1995-01-01T00:00:00Z"), maritalStatus: "NEVER_MARRIED", completedAt: new Date(),
    },
  });
  await db.session.create({ data: { userId: user.id, tokenHash: `t-${user.id}`, method: "otp-email", expiresAt: new Date(Date.now() + DAY) } });
  return user;
};

beforeEach(async () => {
  notices.length = 0;
  for (const t of ["interest", "block", "report", "partnerPreference", "profile", "session", "consentRecord", "auditLog", "erasureLog"] as const) {
    await (db[t] as unknown as { deleteMany: () => Promise<unknown> }).deleteMany();
  }
  await db.user.deleteMany();
});

describe("retention", () => {
  it("erases accounts whose cooling-off period is over, and everything attached to them", async () => {
    const gone = await make("gone@example.com");
    const waiting = await make("waiting@example.com");
    const now = new Date();
    await db.user.update({ where: { id: gone.id }, data: { status: "PENDING_DELETION", deletionReason: "USER_REQUEST", deletionRequestedAt: new Date(now.getTime() - 8 * DAY), deletionScheduledFor: new Date(now.getTime() - DAY) } });
    await db.user.update({ where: { id: waiting.id }, data: { status: "PENDING_DELETION", deletionReason: "USER_REQUEST", deletionRequestedAt: now, deletionScheduledFor: scheduleDeletionDate(now) } });

    const result = await runRetention(now);
    expect(result.erased).toBe(1);

    expect(await db.user.findUnique({ where: { id: gone.id } })).toBeNull();
    expect(await db.profile.count({ where: { userId: gone.id } })).toBe(0);
    expect(await db.session.count({ where: { userId: gone.id } })).toBe(0);
    expect(await db.consentRecord.count({ where: { userId: gone.id } })).toBe(0);
    expect(await db.user.findUnique({ where: { id: waiting.id } })).not.toBeNull();

    // Only a data-free proof of erasure remains.
    const log = await db.erasureLog.findFirstOrThrow();
    expect(log.subjectHash).toBe(blindIndex("user", gone.id));
    expect(JSON.stringify(log)).not.toContain(gone.id);
    expect(JSON.stringify(log)).not.toContain("gone@example.com");
  });

  it("warns and schedules erasure for long-inactive accounts, leaving active ones alone", async () => {
    const stale = await make("stale@example.com");
    const active = await make("active@example.com");
    const now = new Date();
    await db.user.update({ where: { id: stale.id }, data: { lastLoginAt: new Date(now.getTime() - (INACTIVITY_DAYS + 5) * DAY) } });

    const result = await runRetention(now);
    expect(result.inactiveFlagged).toBe(1);
    expect(notices).toEqual([{ to: "stale@example.com", subject: "Your Saathi account will be erased" }]);

    const after = await db.user.findUniqueOrThrow({ where: { id: stale.id } });
    expect(after.status).toBe("PENDING_DELETION");
    expect(after.deletionReason).toBe("INACTIVITY");
    expect(after.deletionScheduledFor!.getTime()).toBeGreaterThan(now.getTime());
    expect((await db.user.findUniqueOrThrow({ where: { id: active.id } })).status).toBe("ACTIVE");
  });
});
