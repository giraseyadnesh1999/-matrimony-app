import "server-only";
import { blindIndex } from "@/lib/crypto";
import { db } from "@/lib/db";
import { AUDIT_RETENTION_DAYS, DELETION_GRACE_DAYS, GRIEVANCE_RETENTION_DAYS, INACTIVITY_DAYS } from "@/config/site";
import { audit } from "./audit";
import { sendNotice } from "./messaging";
import { purgeExpiredAuthData } from "./otp";
import { contactOf } from "./users";

/**
 * Data-retention and erasure (DPDP Act 2023, s.8(7) and s.12).
 *  - A user's erasure request is honoured after a short cooling-off period, then everything tied to the
 *    account is deleted (profile, preferences, sessions, consents, interests, blocks, nominee).
 *  - Personal data is not kept "just in case": accounts unused for INACTIVITY_DAYS are warned and then erased.
 *  - We keep only a data-free ErasureLog entry (a keyed hash of the old id) as proof the request was honoured.
 */
const DAY = 24 * 60 * 60 * 1000;

export function scheduleDeletionDate(from = new Date()) {
  return new Date(from.getTime() + DELETION_GRACE_DAYS * DAY);
}

export async function eraseUser(userId: string, reason: "USER_REQUEST" | "INACTIVITY", requestedAt: Date | null) {
  await db.$transaction([
    db.erasureLog.create({ data: { subjectHash: blindIndex("user", userId), reason, requestedAt } }),
    // Foreign keys cascade to every table holding this person's data.
    db.user.delete({ where: { id: userId } }),
  ]);
}

export async function runRetention(now = new Date()) {
  // 1. Erase accounts whose cooling-off period has ended.
  const due = await db.user.findMany({
    where: { status: "PENDING_DELETION", deletionScheduledFor: { lte: now } },
    select: { id: true, deletionReason: true, deletionRequestedAt: true },
  });
  for (const u of due) {
    await eraseUser(u.id, u.deletionReason === "INACTIVITY" ? "INACTIVITY" : "USER_REQUEST", u.deletionRequestedAt);
  }

  // 2. Warn and schedule erasure for long-inactive accounts. Logging in (or the banner button) cancels it.
  const cutoff = new Date(now.getTime() - INACTIVITY_DAYS * DAY);
  const stale = await db.user.findMany({
    where: {
      status: "ACTIVE",
      role: "USER",
      OR: [{ lastLoginAt: { lt: cutoff } }, { lastLoginAt: null, createdAt: { lt: cutoff } }],
    },
    take: 200,
  });
  let warned = 0;
  for (const u of stale) {
    const scheduled = scheduleDeletionDate(now);
    await db.user.update({
      where: { id: u.id },
      data: { status: "PENDING_DELETION", deletionReason: "INACTIVITY", deletionRequestedAt: now, deletionScheduledFor: scheduled },
    });
    await audit("retention.inactive_flagged", { userId: u.id });
    const contact = contactOf(u);
    try {
      if (contact.email) {
        await sendNotice(
          "EMAIL",
          contact.email,
          "Your Saathi account will be erased",
          `You haven't used Saathi for a long time, so we will permanently erase your account and data on ${scheduled.toDateString()}.\n\nTo keep your account, simply log in before then.`,
        );
      }
      warned++;
    } catch (err) {
      console.error("inactivity notice failed:", err instanceof Error ? err.message : "unknown");
    }
  }

  const auth = await purgeExpiredAuthData(now);
  const oldLogs = await db.auditLog.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - AUDIT_RETENTION_DAYS * DAY) } } });
  const oldTickets = await db.grievanceTicket.deleteMany({
    where: { status: { in: ["RESOLVED", "REJECTED"] }, createdAt: { lt: new Date(now.getTime() - GRIEVANCE_RETENTION_DAYS * DAY) } },
  });
  return { grievancesPurged: oldTickets.count, erased: due.length, inactiveFlagged: stale.length, inactiveNotified: warned, auditPurged: oldLogs.count, ...auth };
}
