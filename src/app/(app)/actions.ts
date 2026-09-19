"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { REPORT_REASONS, optionValues } from "@/lib/reference";
import {
  blockUser,
  reportUser,
  respondToInterest,
  sendInterest,
  unblockUser,
  withdrawInterest,
} from "@/server/interests";
import { requireOnboarded } from "@/server/guards";

const id = z.string().min(8).max(40);
type Fail = { ok: false; error: string };
const BAD: Fail = { ok: false, error: "Something went wrong. Please refresh and try again." };

export async function sendInterestAction(toUserId: string): Promise<{ ok: true; state: "SENT" | "ACCEPTED" } | Fail> {
  const { session } = await requireOnboarded();
  const to = id.safeParse(toUserId);
  if (!to.success) return BAD;
  const res = await sendInterest(session.user.id, to.data);
  if (res.ok) revalidatePath("/interests");
  return res;
}

export async function withdrawInterestAction(toUserId: string): Promise<{ ok: true } | Fail> {
  const { session } = await requireOnboarded();
  const to = id.safeParse(toUserId);
  if (!to.success) return BAD;
  await withdrawInterest(session.user.id, to.data);
  revalidatePath("/interests");
  return { ok: true };
}

export async function respondInterestAction(interestId: string, action: "ACCEPT" | "DECLINE"): Promise<{ ok: true } | Fail> {
  const { session } = await requireOnboarded();
  const iid = id.safeParse(interestId);
  if (!iid.success || (action !== "ACCEPT" && action !== "DECLINE")) return BAD;
  const res = await respondToInterest(session.user.id, iid.data, action);
  if (res.ok) revalidatePath("/interests");
  return res;
}

export async function blockAction(userId: string): Promise<{ ok: true } | Fail> {
  const { session } = await requireOnboarded();
  const target = id.safeParse(userId);
  if (!target.success) return BAD;
  await blockUser(session.user.id, target.data);
  revalidatePath("/discover");
  revalidatePath("/interests");
  return { ok: true };
}

export async function unblockAction(userId: string): Promise<{ ok: true } | Fail> {
  const { session } = await requireOnboarded();
  const target = id.safeParse(userId);
  if (!target.success) return BAD;
  await unblockUser(session.user.id, target.data);
  revalidatePath("/settings/privacy");
  return { ok: true };
}

const reportSchema = z.object({
  userId: id,
  reason: z.enum(optionValues(REPORT_REASONS)),
  details: z.string().trim().max(1000).optional(),
});

export async function reportAction(input: { userId: string; reason: string; details?: string }): Promise<{ ok: true } | Fail> {
  const { session } = await requireOnboarded();
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please choose a reason." };
  const res = await reportUser(session.user.id, parsed.data.userId, parsed.data.reason, parsed.data.details);
  return res.ok ? { ok: true } : res;
}
