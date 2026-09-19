import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Append-only security/compliance trail. `meta` must never contain raw personal data
 * (no names, phone numbers, emails); use ids, purposes and counts.
 * Audit failures are logged but never break the user's request.
 */
export async function audit(
  action: string,
  opts: { userId?: string | null; meta?: Prisma.InputJsonObject; ipHash?: string | null } = {},
) {
  try {
    await db.auditLog.create({
      data: { action, userId: opts.userId ?? null, meta: opts.meta, ipHash: opts.ipHash ?? null },
    });
  } catch (err) {
    console.error("audit log write failed", action, err instanceof Error ? err.message : "unknown");
  }
}
