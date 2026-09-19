"use server";

import { z } from "zod";
import { parseIdentifier } from "@/lib/identifier";
import { GRIEVANCE_CATEGORIES, optionValues } from "@/lib/reference";
import { fileGrievance } from "@/server/grievance";
import { clientMeta } from "@/server/request";
import { getSession } from "@/server/session";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  contact: z.string().trim().min(1, "Enter your email or mobile number.").max(254),
  category: z.enum(optionValues(GRIEVANCE_CATEGORIES), { error: "Choose a topic." }),
  message: z.string().trim().min(20, "Please describe the issue in a few sentences.").max(3000),
});

export type GrievanceResult =
  | { ok: true; reference: string; acknowledgeBy: string; resolveBy: string }
  | { ok: false; error: string; field?: string };

export async function submitGrievanceAction(input: { name: string; contact: string; category: string; message: string }): Promise<GrievanceResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    return { ok: false, error: issue.message, field: String(issue.path[0]) };
  }
  const contact = parseIdentifier(parsed.data.contact);
  if (!contact.ok) return { ok: false, error: contact.error, field: "contact" };

  const [session, meta] = await Promise.all([getSession(), clientMeta()]);
  const res = await fileGrievance({
    userId: session?.user.id ?? null,
    name: parsed.data.name,
    contact: contact.id,
    category: parsed.data.category,
    message: parsed.data.message,
    ipHash: meta.ipHash,
  });
  if (!res.ok) return res;
  return { ok: true, reference: res.reference, acknowledgeBy: res.acknowledgeBy.toISOString(), resolveBy: res.resolveBy.toISOString() };
}
