import "server-only";
import { Prisma, type User } from "@prisma/client";
import { blindIndex, decrypt, encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { NOTICE_VERSION, type ConsentPurpose } from "@/lib/consent";
import type { Identifier } from "@/lib/identifier";
import { audit } from "./audit";

export const indexFor = (id: Identifier) => blindIndex(id.kind === "email" ? "email" : "phone", id.value);

export function findUserByIdentifier(id: Identifier) {
  return db.user.findUnique({
    where: id.kind === "email" ? { emailHash: indexFor(id) } : { phoneHash: indexFor(id) },
  });
}

export type Contact = { email: string | null; phone: string | null };

/** Decrypts contact details. Call only where the data is genuinely needed (export, notices, contact reveal). */
export function contactOf(user: Pick<User, "emailEnc" | "phoneEnc">): Contact {
  return {
    email: user.emailEnc ? decrypt(user.emailEnc) : null,
    phone: user.phoneEnc ? decrypt(user.phoneEnc) : null,
  };
}

export type SignupConsentInput = { marketing: boolean; source: "signup" | "social-signup" };

/**
 * Creates the account and, in the same transaction, the consent records that justify it.
 * `verified` defaults to true because we normally call this after an OTP or a provider-verified email;
 * pass false for providers (Facebook) that do not vouch for the address.
 */
export async function createUser(
  id: Identifier,
  consent: SignupConsentInput,
  ipHash: string | null,
  opts: { verified?: boolean } = {},
): Promise<User> {
  const now = new Date();
  const verifiedAt = opts.verified === false ? null : now;
  const data: Prisma.UserCreateInput =
    id.kind === "email"
      ? { emailEnc: encrypt(id.value), emailHash: indexFor(id), emailVerifiedAt: verifiedAt, lastLoginAt: now }
      : { phoneEnc: encrypt(id.value), phoneHash: indexFor(id), phoneVerifiedAt: verifiedAt, lastLoginAt: now };

  try {
    const user = await db.user.create({
      data: {
        ...data,
        consents: {
          create: [
            { purpose: "core_service", granted: true, noticeVersion: NOTICE_VERSION, source: consent.source, ipHash },
            {
              purpose: "marketing",
              granted: consent.marketing,
              noticeVersion: NOTICE_VERSION,
              source: consent.source,
              ipHash,
            },
          ],
        },
      },
    });
    await audit("account.created", {
      userId: user.id,
      ipHash,
      meta: { method: consent.source, ageConfirmed: true, noticeVersion: NOTICE_VERSION },
    });
    return user;
  } catch (err) {
    // Two concurrent signups for the same identifier: the unique index picks a winner.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await findUserByIdentifier(id);
      if (existing) return existing;
    }
    throw err;
  }
}

/** Latest decision per purpose (append-only ledger => newest row wins). */
export async function currentConsents(userId: string): Promise<Record<ConsentPurpose, boolean>> {
  const rows = await db.consentRecord.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { purpose: true, granted: true },
  });
  const state = { core_service: false, horoscope: false, health_disability: false, contact_sharing: false, marketing: false };
  for (const r of rows) if (r.purpose in state) state[r.purpose as ConsentPurpose] = r.granted;
  return state;
}

export async function recordConsent(
  userId: string,
  purpose: ConsentPurpose,
  granted: boolean,
  source: "onboarding" | "settings" | "interests",
  ipHash: string | null,
) {
  await db.consentRecord.create({
    data: { userId, purpose, granted, noticeVersion: NOTICE_VERSION, source, ipHash },
  });
  await audit(granted ? "consent.granted" : "consent.withdrawn", { userId, ipHash, meta: { purpose, source } });
}
