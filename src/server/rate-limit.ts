import "server-only";
import { db } from "@/lib/db";

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Fixed-window counter stored in the database, so limits hold across serverless instances.
 * Keys are hashed identifiers, never raw phone numbers or emails.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<LimitResult> {
  const now = new Date();
  return db.$transaction(async (tx) => {
    const row = await tx.rateLimitBucket.findUnique({ where: { key } });
    if (!row || row.resetAt <= now) {
      const resetAt = new Date(now.getTime() + windowSec * 1000);
      await tx.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { ok: true } as const;
    }
    if (row.count >= limit) {
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000)) } as const;
    }
    await tx.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
    return { ok: true } as const;
  });
}

/** Check several limits in order; returns the first one that trips. */
export async function rateLimitAll(
  checks: Array<{ key: string; limit: number; windowSec: number } | null>,
): Promise<LimitResult> {
  for (const c of checks) {
    if (!c) continue;
    const r = await rateLimit(c.key, c.limit, c.windowSec);
    if (!r.ok) return r;
  }
  return { ok: true };
}

export function humanWait(sec: number): string {
  if (sec < 60) return `${sec} seconds`;
  const m = Math.ceil(sec / 60);
  return m === 1 ? "a minute" : `${m} minutes`;
}
