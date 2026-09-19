import "server-only";
import { db } from "@/lib/db";
import { audit } from "./audit";
import { NO_CONSENT, blockedIds, consentsFor, toPublic, type PublicProfile } from "./matches";
import { rateLimit } from "./rate-limit";
import { contactOf, currentConsents } from "./users";

export type InterestResult = { ok: true; state: "SENT" | "ACCEPTED" } | { ok: false; error: string };

const UNAVAILABLE = "This member isn't available.";

/** A member may receive interests only while active, finished, visible and not blocked either way. */
async function receivable(senderId: string, targetId: string) {
  if ((await blockedIds(senderId)).includes(targetId)) return false;
  const target = await db.profile.findFirst({
    where: { userId: targetId, completedAt: { not: null }, isHidden: false, user: { status: "ACTIVE" } },
    select: { id: true },
  });
  return !!target;
}

export async function sendInterest(fromId: string, toId: string): Promise<InterestResult> {
  if (fromId === toId) return { ok: false, error: UNAVAILABLE };

  const limited = await rateLimit(`interest:send:${fromId}`, 25, 86_400);
  if (!limited.ok) return { ok: false, error: "You've reached today's limit for sending interests. Try again tomorrow." };

  if (!(await receivable(fromId, toId))) return { ok: false, error: UNAVAILABLE };

  const [mine, theirs] = await Promise.all([
    db.interest.findUnique({ where: { fromUserId_toUserId: { fromUserId: fromId, toUserId: toId } } }),
    db.interest.findUnique({ where: { fromUserId_toUserId: { fromUserId: toId, toUserId: fromId } } }),
  ]);

  // They already showed interest in me: sending one back completes the match.
  if (theirs?.status === "PENDING") {
    await db.interest.update({ where: { id: theirs.id }, data: { status: "ACCEPTED", respondedAt: new Date() } });
    await audit("interest.accepted", { userId: fromId, meta: { interestId: theirs.id, mutual: true } });
    return { ok: true, state: "ACCEPTED" };
  }
  if (theirs?.status === "ACCEPTED" || mine?.status === "ACCEPTED") return { ok: true, state: "ACCEPTED" };

  // Declines are never revealed: re-sending after a decline quietly does nothing.
  if (mine && (mine.status === "PENDING" || mine.status === "DECLINED")) return { ok: true, state: "SENT" };

  if (mine?.status === "WITHDRAWN") {
    await db.interest.update({ where: { id: mine.id }, data: { status: "PENDING", createdAt: new Date(), respondedAt: null } });
  } else {
    await db.interest.create({ data: { fromUserId: fromId, toUserId: toId } });
  }
  await audit("interest.sent", { userId: fromId });
  return { ok: true, state: "SENT" };
}

export async function withdrawInterest(fromId: string, toId: string) {
  const { count } = await db.interest.updateMany({
    where: { fromUserId: fromId, toUserId: toId, status: "PENDING" },
    data: { status: "WITHDRAWN", respondedAt: new Date() },
  });
  return count > 0;
}

export async function respondToInterest(userId: string, interestId: string, action: "ACCEPT" | "DECLINE") {
  const interest = await db.interest.findFirst({ where: { id: interestId, toUserId: userId, status: "PENDING" } });
  if (!interest) return { ok: false as const, error: "That interest is no longer available." };
  if (action === "ACCEPT" && !(await receivable(userId, interest.fromUserId))) {
    return { ok: false as const, error: UNAVAILABLE };
  }
  await db.interest.update({
    where: { id: interest.id },
    data: { status: action === "ACCEPT" ? "ACCEPTED" : "DECLINED", respondedAt: new Date() },
  });
  await audit(action === "ACCEPT" ? "interest.accepted" : "interest.declined", {
    userId,
    meta: { interestId: interest.id },
  });
  return { ok: true as const };
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) return;
  await db.$transaction([
    db.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    }),
    // Blocking severs any connection in both directions.
    db.interest.deleteMany({
      where: {
        OR: [
          { fromUserId: blockerId, toUserId: blockedId },
          { fromUserId: blockedId, toUserId: blockerId },
        ],
      },
    }),
  ]);
  await audit("user.blocked", { userId: blockerId });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  await db.block.deleteMany({ where: { blockerId, blockedId } });
}

export async function reportUser(reporterId: string, targetId: string, reason: string, details: string | undefined) {
  if (reporterId === targetId) return { ok: false as const, error: "You can't report yourself." };
  const limited = await rateLimit(`report:${reporterId}`, 10, 86_400);
  if (!limited.ok) return { ok: false as const, error: "You've sent several reports today. Our team will review them." };
  await db.report.create({ data: { reporterId, targetId, reason, details: details?.slice(0, 1000) } });
  await audit("user.reported", { userId: reporterId, meta: { reason } });
  return { ok: true as const };
}

export type ConnectionCard = {
  interestId: string;
  userId: string;
  respondedAt: Date | null;
  contact: { phone: string | null; email: string | null } | null;
};

/**
 * Mutual matches. Contact details are revealed only when the interest is accepted AND both people have
 * separately consented to contact sharing. Every reveal is written to the audit log.
 */
export async function listConnections(viewerId: string): Promise<{ cards: ConnectionCard[]; viewerConsents: boolean }> {
  const accepted = await db.interest.findMany({
    where: { status: "ACCEPTED", OR: [{ fromUserId: viewerId }, { toUserId: viewerId }] },
    orderBy: { respondedAt: "desc" },
    take: 100,
  });
  const excluded = new Set(await blockedIds(viewerId));
  const mine = await currentConsents(viewerId);
  const cards: ConnectionCard[] = [];

  for (const i of accepted) {
    const otherId = i.fromUserId === viewerId ? i.toUserId : i.fromUserId;
    if (excluded.has(otherId)) continue;
    let contact: ConnectionCard["contact"] = null;
    if (mine.contact_sharing) {
      const theirs = await currentConsents(otherId);
      if (theirs.contact_sharing) {
        const other = await db.user.findFirst({ where: { id: otherId, status: "ACTIVE" } });
        if (other) {
          contact = contactOf(other);
          await audit("contact.revealed", { userId: viewerId, meta: { interestId: i.id } });
        }
      }
    }
    cards.push({ interestId: i.id, userId: otherId, respondedAt: i.respondedAt, contact });
  }
  return { cards, viewerConsents: mine.contact_sharing };
}

export type InterestRow = { interestId: string; createdAt: Date; profile: PublicProfile };

/**
 * Pending interests received, or sent. A declined interest still appears as "awaiting reply" on the
 * sender side: declines are never revealed. Members who are blocked, hidden or inactive are omitted.
 */
export async function listInterests(viewerId: string, kind: "received" | "sent"): Promise<InterestRow[]> {
  const rows = await db.interest.findMany({
    where:
      kind === "received"
        ? { toUserId: viewerId, status: "PENDING" }
        : { fromUserId: viewerId, status: { in: ["PENDING", "DECLINED"] } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  const otherId = (r: { fromUserId: string; toUserId: string }) => (kind === "received" ? r.fromUserId : r.toUserId);
  const excluded = new Set(await blockedIds(viewerId));
  const ids = rows.map(otherId).filter((id) => !excluded.has(id));

  const [profiles, consents] = await Promise.all([
    db.profile.findMany({
      where: { userId: { in: ids }, completedAt: { not: null }, isHidden: false, user: { status: "ACTIVE" } },
    }),
    consentsFor(ids),
  ]);
  const byUser = new Map(profiles.map((p) => [p.userId, p]));

  return rows.flatMap((r) => {
    const p = byUser.get(otherId(r));
    return p ? [{ interestId: r.id, createdAt: r.createdAt, profile: toPublic(p, consents.get(p.userId) ?? NO_CONSENT) }] : [];
  });
}

export async function connectionProfiles(userIds: string[]) {
  const [profiles, consents] = await Promise.all([
    db.profile.findMany({ where: { userId: { in: userIds }, completedAt: { not: null }, user: { status: "ACTIVE" } } }),
    consentsFor(userIds),
  ]);
  return new Map(profiles.map((p) => [p.userId, toPublic(p, consents.get(p.userId) ?? NO_CONSENT)]));
}

export async function interestCounts(viewerId: string) {
  const [received, sent, connections] = await Promise.all([
    db.interest.count({ where: { toUserId: viewerId, status: "PENDING" } }),
    db.interest.count({ where: { fromUserId: viewerId, status: { in: ["PENDING", "DECLINED"] } } }),
    db.interest.count({ where: { status: "ACCEPTED", OR: [{ fromUserId: viewerId }, { toUserId: viewerId }] } }),
  ]);
  return { received, sent, connections };
}
