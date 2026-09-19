import "server-only";
import { generateOtp, hashOtp, safeEqualHex } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { NOTICE_VERSION } from "@/lib/consent";
import type { Identifier } from "@/lib/identifier";
import { audit } from "./audit";
import { sendOtp } from "./messaging";
import { humanWait, rateLimitAll } from "./rate-limit";
import { clientMeta } from "./request";
import type { AuthMethod } from "./session";
import { createUser, findUserByIdentifier, indexFor } from "./users";

/**
 * One-time-password login/signup.
 *
 * Abuse and privacy properties:
 *  - 6 digits from a CSPRNG, valid 5 minutes, at most 5 guesses, single use.
 *  - Only a keyed hash of the code is stored.
 *  - Per-identifier and per-IP limits, plus an app-wide daily SMS ceiling (SMS-pumping protection).
 *  - Logging in with an unknown identifier looks identical to a real login attempt, so the form
 *    cannot be used to discover who has an account.
 */
const OTP_TTL_MS = 5 * 60 * 1000;
export const RESEND_COOLDOWN_SEC = 30;
const MAX_ATTEMPTS = 5;

export type Intent = "LOGIN" | "SIGNUP";
type ConsentPayload = { marketing: boolean; ageConfirmed: true; noticeVersion: string };

export type StartResult = { ok: true; cooldownSec: number } | { ok: false; error: string };

export async function startOtp(input: {
  identifier: Identifier;
  intent: Intent;
  consent?: { marketing: boolean; ageConfirmed: boolean; accepted: boolean };
}): Promise<StartResult> {
  const { identifier, intent } = input;
  const meta = await clientMeta();
  const idHash = indexFor(identifier);

  if (intent === "SIGNUP" && !(input.consent?.accepted && input.consent.ageConfirmed)) {
    return { ok: false, error: "Please accept the privacy notice and confirm you are 18 or older." };
  }

  const day = new Date().toISOString().slice(0, 10);
  const smsCap = identifier.kind === "phone" ? env().SMS_DAILY_CAP : 0;
  const limited = await rateLimitAll([
    { key: `otp:cooldown:${idHash}`, limit: 1, windowSec: RESEND_COOLDOWN_SEC },
    { key: `otp:hour:${idHash}`, limit: 5, windowSec: 3600 },
    meta.ipHash ? { key: `otp:ip:${meta.ipHash}`, limit: 20, windowSec: 3600 } : null,
    smsCap > 0 ? { key: `otp:sms-day:${day}`, limit: smsCap, windowSec: 86_400 } : null,
  ]);
  if (!limited.ok) {
    await audit("otp.rate_limited", { ipHash: meta.ipHash });
    return { ok: false, error: `Too many attempts. Please try again in ${humanWait(limited.retryAfterSec)}.` };
  }

  const user = await findUserByIdentifier(identifier);
  // An email account whose address was never verified (created via a provider that does not vouch for
  // it) cannot be entered through LOGIN; only a fresh SIGNUP by the real owner can replace it.
  const loginable = !!user && user.status !== "SUSPENDED" && (identifier.kind === "phone" || !!user.emailVerifiedAt);
  const willSend = intent === "SIGNUP" ? user?.status !== "SUSPENDED" : loginable;
  if (!willSend) {
    // Identical response to the success path; nothing is sent or stored.
    return { ok: true, cooldownSec: RESEND_COOLDOWN_SEC };
  }

  const code = generateOtp();
  const now = new Date();
  await db.otpChallenge.updateMany({ where: { identifierHash: idHash, consumedAt: null }, data: { consumedAt: now } });
  const consentPayload: ConsentPayload | undefined =
    intent === "SIGNUP"
      ? { marketing: !!input.consent?.marketing, ageConfirmed: true, noticeVersion: NOTICE_VERSION }
      : undefined;
  const challenge = await db.otpChallenge.create({
    data: {
      identifierHash: idHash,
      channel: identifier.kind === "email" ? "EMAIL" : "SMS",
      codeHash: hashOtp(idHash, code),
      intent,
      consentPayload,
      maxAttempts: MAX_ATTEMPTS,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      ipHash: meta.ipHash,
    },
  });

  try {
    await sendOtp(identifier.kind === "email" ? "EMAIL" : "SMS", identifier.value, code);
  } catch (err) {
    await db.otpChallenge.delete({ where: { id: challenge.id } }).catch(() => {});
    console.error("otp delivery failed:", err instanceof Error ? err.message : "unknown");
    return { ok: false, error: "We couldn't send the code right now. Please try again in a moment." };
  }

  await audit("otp.sent", { userId: user?.id, ipHash: meta.ipHash, meta: { channel: identifier.kind, intent } });
  return { ok: true, cooldownSec: RESEND_COOLDOWN_SEC };
}

export type VerifyResult =
  | { ok: true; userId: string; isNewUser: boolean; method: AuthMethod }
  | { ok: false; error: string };

const INVALID: VerifyResult = { ok: false, error: "That code is incorrect or has expired." };

export async function verifyOtp(input: { identifier: Identifier; code: string }): Promise<VerifyResult> {
  const { identifier } = input;
  const meta = await clientMeta();
  const idHash = indexFor(identifier);

  const limited = await rateLimitAll([
    { key: `otpv:id:${idHash}`, limit: 10, windowSec: 900 },
    meta.ipHash ? { key: `otpv:ip:${meta.ipHash}`, limit: 40, windowSec: 900 } : null,
  ]);
  if (!limited.ok) {
    return { ok: false, error: `Too many attempts. Please try again in ${humanWait(limited.retryAfterSec)}.` };
  }
  if (!/^\d{6}$/.test(input.code)) return { ok: false, error: "Enter the 6-digit code." };

  const now = new Date();
  const challenge = await db.otpChallenge.findFirst({
    where: { identifierHash: idHash, consumedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return INVALID;

  // Count the guess first (atomically) so parallel requests cannot exceed the attempt budget.
  const counted = await db.otpChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null, attempts: { lt: challenge.maxAttempts } },
    data: { attempts: { increment: 1 } },
  });
  if (counted.count === 0) {
    return { ok: false, error: "Too many incorrect codes. Please request a new one." };
  }

  if (!safeEqualHex(challenge.codeHash, hashOtp(idHash, input.code))) {
    await audit("otp.failed", { ipHash: meta.ipHash });
    return INVALID;
  }

  // Single use: only the request that flips consumedAt wins.
  const consumed = await db.otpChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null },
    data: { consumedAt: now },
  });
  if (consumed.count !== 1) return INVALID;

  let user = await findUserByIdentifier(identifier);
  let isNewUser = false;
  if (user && identifier.kind === "email" && !user.emailVerifiedAt) {
    // Pre-hijack defence: this account was created with an unverified email. The real owner has now
    // proven control, so discard everything the earlier claimant entered and start clean.
    if (challenge.intent !== "SIGNUP") return INVALID;
    await db.user.delete({ where: { id: user.id } });
    await audit("account.unverified_replaced", { ipHash: meta.ipHash });
    user = null;
  }
  if (!user) {
    const payload = challenge.consentPayload as ConsentPayload | null;
    if (challenge.intent !== "SIGNUP" || !payload?.ageConfirmed) return INVALID;
    user = await createUser(identifier, { marketing: payload.marketing, source: "signup" }, meta.ipHash);
    isNewUser = true;
  }
  if (user.status === "SUSPENDED") return { ok: false, error: "This account is unavailable. Contact support." };

  // Proving control of the identifier marks it verified.
  const verifiedField = identifier.kind === "email" ? "emailVerifiedAt" : "phoneVerifiedAt";
  if (!user[verifiedField]) await db.user.update({ where: { id: user.id }, data: { [verifiedField]: now } });

  return {
    ok: true,
    userId: user.id,
    isNewUser,
    method: identifier.kind === "email" ? "otp-email" : "otp-sms",
  };
}

/** Housekeeping for the cron job: expired challenges, stale rate-limit buckets, expired sessions. */
export async function purgeExpiredAuthData(now = new Date()) {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [challenges, buckets, sessions] = await Promise.all([
    db.otpChallenge.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
    db.rateLimitBucket.deleteMany({ where: { resetAt: { lt: now } } }),
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);
  return { challenges: challenges.count, buckets: buckets.count, sessions: sessions.count };
}

