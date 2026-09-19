import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomToken, sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { isProd } from "@/lib/env";
import { SESSION_COOKIE as COOKIE } from "@/lib/cookie-names";
import { audit } from "./audit";
import type { ClientMeta } from "./request";

/**
 * Server-side sessions with an opaque random token.
 *  - Cookie: HttpOnly, SameSite=Lax, Secure (+ __Host- prefix) in production.
 *  - DB stores only SHA-256(token), so a database leak cannot be replayed as a login.
 *  - Absolute lifetime 30 days, idle timeout 14 days. Revocable per device or all at once.
 */
const ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000;
const IDLE_MS = 14 * 24 * 60 * 60 * 1000;
const TOUCH_EVERY_MS = 60 * 60 * 1000;

export type AuthMethod = "otp-sms" | "otp-email" | "google" | "facebook";

export async function createSession(userId: string, method: AuthMethod, meta: ClientMeta) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + ABSOLUTE_MS);
  await db.session.create({
    data: { userId, tokenHash: sha256(token), method, ipHash: meta.ipHash, userAgent: meta.userAgent, expiresAt },
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  await audit("session.created", { userId, ipHash: meta.ipHash, meta: { method } });
}

export type SessionUser = {
  id: string;
  status: string;
  role: string;
  deletionScheduledFor: Date | null;
};
export type CurrentSession = { id: string; user: SessionUser };

/** Resolves the current session once per request. Never throws for a missing/invalid cookie. */
export const getSession = cache(async (): Promise<CurrentSession | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const now = new Date();
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: {
      id: true,
      expiresAt: true,
      lastSeenAt: true,
      user: { select: { id: true, status: true, role: true, deletionScheduledFor: true } },
    },
  });
  if (!session) return null;
  if (session.expiresAt <= now || now.getTime() - session.lastSeenAt.getTime() > IDLE_MS) return null;
  if (session.user.status === "SUSPENDED") return null;

  if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_EVERY_MS) {
    // Fire and forget: a failed touch must not fail the page.
    db.session.update({ where: { id: session.id }, data: { lastSeenAt: now } }).catch(() => {});
  }
  return { id: session.id, user: session.user };
});

/** For Server Components / actions that need a signed-in user. */
export async function requireSession(): Promise<CurrentSession> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  store.delete(COOKIE);
}

export async function revokeOtherSessions(userId: string, keepSessionId: string) {
  const { count } = await db.session.deleteMany({ where: { userId, NOT: { id: keepSessionId } } });
  await audit("session.revoked_others", { userId, meta: { count } });
  return count;
}

export async function revokeSession(userId: string, sessionId: string) {
  await db.session.deleteMany({ where: { id: sessionId, userId } });
}
