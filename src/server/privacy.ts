import "server-only";
import { decrypt, encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { OPTIONAL_PURPOSES, type ConsentPurpose } from "@/lib/consent";
import { audit } from "./audit";
import { scheduleDeletionDate } from "./retention";
import { contactOf, currentConsents, recordConsent } from "./users";

/** Change one optional consent. Withdrawing a consent also removes the data it justified, immediately. */
export async function changeConsent(userId: string, purpose: ConsentPurpose, granted: boolean, ipHash: string | null) {
  if (!OPTIONAL_PURPOSES.includes(purpose)) {
    return { ok: false as const, error: "That consent can't be changed here." };
  }
  const current = await currentConsents(userId);
  if (current[purpose] === granted) return { ok: true as const };

  await recordConsent(userId, purpose, granted, "settings", ipHash);

  if (!granted && purpose === "horoscope") {
    await db.profile.updateMany({
      where: { userId },
      data: { manglik: null, rashi: null, nakshatra: null, birthTime: null, birthPlace: null },
    });
  }
  if (!granted && purpose === "health_disability") {
    await db.profile.updateMany({ where: { userId }, data: { physicalStatus: "NOT_SAID", disabilityNote: null } });
  }
  return { ok: true as const };
}

export async function setVisibility(userId: string, field: "isHidden" | "hideLastName", value: boolean) {
  await db.profile.updateMany({ where: { userId }, data: { [field]: value } });
  await audit("profile.visibility_changed", { userId, meta: { field, value } });
}

export async function requestDeletion(userId: string, ipHash: string | null) {
  const now = new Date();
  const scheduled = scheduleDeletionDate(now);
  await db.user.update({
    where: { id: userId },
    data: { status: "PENDING_DELETION", deletionReason: "USER_REQUEST", deletionRequestedAt: now, deletionScheduledFor: scheduled },
  });
  await audit("account.deletion_requested", { userId, ipHash });
  return scheduled;
}

export async function cancelDeletion(userId: string, ipHash: string | null) {
  const { count } = await db.user.updateMany({
    where: { id: userId, status: "PENDING_DELETION" },
    data: { status: "ACTIVE", deletionReason: null, deletionRequestedAt: null, deletionScheduledFor: null },
  });
  if (count) await audit("account.deletion_cancelled", { userId, ipHash });
  return count > 0;
}

export async function saveNominee(userId: string, n: { name: string; relation: string; contact: string }) {
  const data = { nameEnc: encrypt(n.name), relation: n.relation, contactEnc: encrypt(n.contact) };
  await db.nominee.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  await audit("nominee.saved", { userId });
}

export async function removeNominee(userId: string) {
  await db.nominee.deleteMany({ where: { userId } });
  await audit("nominee.removed", { userId });
}

export async function getNominee(userId: string) {
  const n = await db.nominee.findUnique({ where: { userId } });
  return n ? { name: decrypt(n.nameEnc), relation: n.relation, contact: decrypt(n.contactEnc) } : null;
}

/**
 * Right of access (DPDP Act s.11): everything we hold about the person, in a machine-readable file.
 * Other members appear only as opaque ids, never as their personal data.
 */
export async function exportUserData(userId: string) {
  const [user, profile, pref, consents, sent, received, blocks, reports, sessions, oauth, logs, tickets, nominee] =
    await Promise.all([
      db.user.findUniqueOrThrow({ where: { id: userId } }),
      db.profile.findUnique({ where: { userId } }),
      db.partnerPreference.findUnique({ where: { userId } }),
      db.consentRecord.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      db.interest.findMany({ where: { fromUserId: userId } }),
      db.interest.findMany({ where: { toUserId: userId } }),
      db.block.findMany({ where: { blockerId: userId } }),
      db.report.findMany({ where: { reporterId: userId } }),
      db.session.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      db.oAuthAccount.findMany({ where: { userId } }),
      db.auditLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 500 }),
      db.grievanceTicket.findMany({ where: { userId } }),
      getNominee(userId),
    ]);

  const contact = contactOf(user);
  return {
    format: "saathi-data-export/1",
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: contact.email,
      phone: contact.phone,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    connectedLogins: oauth.map((o) => ({ provider: o.provider, since: o.createdAt })),
    profile,
    partnerPreferences: pref,
    consents: consents.map((c) => ({
      purpose: c.purpose,
      granted: c.granted,
      noticeVersion: c.noticeVersion,
      source: c.source,
      at: c.createdAt,
    })),
    interestsSent: sent.map((i) => ({ toMemberId: i.toUserId, status: i.status, at: i.createdAt })),
    interestsReceived: received.map((i) => ({ fromMemberId: i.fromUserId, status: i.status, at: i.createdAt })),
    blockedMembers: blocks.map((b) => ({ memberId: b.blockedId, at: b.createdAt })),
    reportsFiled: reports.map((r) => ({ reason: r.reason, details: r.details, status: r.status, at: r.createdAt })),
    nominee,
    signedInDevices: sessions.map((s) => ({
      method: s.method,
      device: s.userAgent,
      signedInAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
    })),
    grievances: tickets.map((t) => ({
      reference: t.reference,
      category: t.category,
      status: t.status,
      at: t.createdAt,
    })),
    activityLog: logs.map((l) => ({ action: l.action, at: l.createdAt })),
  };
}
