import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession, type CurrentSession } from "./session";

/** Signed in and not scheduled for deletion. */
export async function requireActive(): Promise<CurrentSession> {
  const session = await requireSession();
  if (session.user.status !== "ACTIVE") redirect("/settings/privacy");
  return session;
}

/** Signed in, active, and has finished the profile wizard. Returns the viewer's own profile. */
export async function requireOnboarded() {
  const session = await requireActive();
  const profile = await db.profile.findUnique({ where: { userId: session.user.id } });
  if (!profile?.completedAt) redirect("/onboarding");
  return { session, profile };
}
