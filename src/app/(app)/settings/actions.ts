"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { OPTIONAL_PURPOSES, type ConsentPurpose } from "@/lib/consent";
import { parseIdentifier } from "@/lib/identifier";
import { NOMINEE_RELATIONS, optionValues } from "@/lib/reference";
import {
  cancelDeletion,
  changeConsent,
  removeNominee,
  requestDeletion,
  saveNominee,
  setVisibility,
} from "@/server/privacy";
import { rateLimit } from "@/server/rate-limit";
import { clientMeta } from "@/server/request";
import { requireSession, revokeOtherSessions, revokeSession } from "@/server/session";

type Fail = { ok: false; error: string };
type Ok = { ok: true };

export async function setConsentAction(purpose: string, granted: boolean): Promise<Ok | Fail> {
  const session = await requireSession();
  if (!OPTIONAL_PURPOSES.includes(purpose as ConsentPurpose) || typeof granted !== "boolean") {
    return { ok: false, error: "That setting can't be changed." };
  }
  const meta = await clientMeta();
  const res = await changeConsent(session.user.id, purpose as ConsentPurpose, granted, meta.ipHash);
  revalidatePath("/settings/privacy");
  revalidatePath("/profile");
  return res.ok ? { ok: true } : res;
}

export async function setVisibilityAction(field: string, value: boolean): Promise<Ok | Fail> {
  const session = await requireSession();
  if ((field !== "isHidden" && field !== "hideLastName") || typeof value !== "boolean") {
    return { ok: false, error: "That setting can't be changed." };
  }
  await setVisibility(session.user.id, field, value);
  revalidatePath("/settings/privacy");
  revalidatePath("/discover");
  return { ok: true };
}

const nomineeSchema = z.object({
  name: z.string().trim().min(2, "Enter the nominee's name.").max(80),
  relation: z.enum(optionValues(NOMINEE_RELATIONS), { error: "Choose a relationship." }),
  contact: z.string().trim().min(1, "Enter a phone number or email.").max(254),
});

export async function saveNomineeAction(input: { name: string; relation: string; contact: string }): Promise<Ok | (Fail & { field?: string })> {
  const session = await requireSession();
  const parsed = nomineeSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    return { ok: false, error: issue.message, field: String(issue.path[0]) };
  }
  const contact = parseIdentifier(parsed.data.contact);
  if (!contact.ok) return { ok: false, error: contact.error, field: "contact" };
  await saveNominee(session.user.id, { ...parsed.data, contact: contact.id.value });
  revalidatePath("/settings/privacy");
  return { ok: true };
}

export async function removeNomineeAction(): Promise<Ok> {
  const session = await requireSession();
  await removeNominee(session.user.id);
  revalidatePath("/settings/privacy");
  return { ok: true };
}

export async function requestDeletionAction(): Promise<Ok | Fail> {
  const session = await requireSession();
  const limited = await rateLimit(`delete:${session.user.id}`, 5, 3600);
  if (!limited.ok) return { ok: false, error: "Please wait a while before trying again." };
  const meta = await clientMeta();
  await requestDeletion(session.user.id, meta.ipHash);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function cancelDeletionAction(): Promise<Ok | Fail> {
  const session = await requireSession();
  const meta = await clientMeta();
  const done = await cancelDeletion(session.user.id, meta.ipHash);
  revalidatePath("/", "layout");
  return done ? { ok: true } : { ok: false, error: "There is no deletion to cancel." };
}

export async function revokeSessionAction(sessionId: string): Promise<Ok | Fail> {
  const session = await requireSession();
  if (typeof sessionId !== "string" || sessionId === session.id) return { ok: false, error: "Use Log out for this device." };
  await revokeSession(session.user.id, sessionId);
  revalidatePath("/settings");
  return { ok: true };
}

export async function revokeOtherSessionsAction(): Promise<Ok & { count: number }> {
  const session = await requireSession();
  const count = await revokeOtherSessions(session.user.id, session.id);
  revalidatePath("/settings");
  return { ok: true, count };
}
