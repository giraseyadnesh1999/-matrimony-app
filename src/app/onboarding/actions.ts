"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { STEP_IDS, type FieldErrors, type StepId, type Values } from "@/lib/onboarding/steps";
import { saveStep } from "@/server/profile";
import { rateLimit } from "@/server/rate-limit";
import { clientMeta } from "@/server/request";
import { requireSession } from "@/server/session";

const valuesSchema = z.record(z.string().max(60), z.union([z.string().max(2000), z.boolean(), z.array(z.string().max(60)).max(60)]));

export type SaveStepResult =
  | { ok: true; complete: boolean; nextStep: number }
  | { ok: false; errors: FieldErrors };

export async function saveStepAction(stepId: string, values: unknown): Promise<SaveStepResult> {
  const session = await requireSession();
  if (session.user.status !== "ACTIVE") return { ok: false, errors: { _: "Your account is scheduled for deletion." } };

  const id = STEP_IDS.find((s) => s === stepId) as StepId | undefined;
  const parsed = valuesSchema.safeParse(values);
  if (!id || !parsed.success) return { ok: false, errors: { _: "Something went wrong. Please refresh and try again." } };

  const limited = await rateLimit(`profile:save:${session.user.id}`, 60, 600);
  if (!limited.ok) return { ok: false, errors: { _: "You're saving too quickly. Please wait a moment." } };

  const meta = await clientMeta();
  const result = await saveStep(session.user.id, id, parsed.data as Values, meta.ipHash);
  if (result.ok && result.complete) {
    revalidatePath("/discover");
    revalidatePath("/profile");
  }
  return result;
}
