"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { maskIdentifier, parseIdentifier } from "@/lib/identifier";
import { startOtp, verifyOtp } from "@/server/otp";
import { clientMeta, safeNext } from "@/server/request";
import { createSession, destroyCurrentSession } from "@/server/session";
import { audit } from "@/server/audit";
import { getSession } from "@/server/session";

const requestSchema = z.object({
  identifier: z.string().max(320),
  mode: z.enum(["login", "signup"]),
  consent: z.boolean(),
  age: z.boolean(),
  marketing: z.boolean(),
});

export type RequestOtpResult =
  | { ok: true; identifier: string; masked: string; kind: "email" | "phone"; cooldownSec: number }
  | { ok: false; error: string; field?: "identifier" | "consent" | "age" };

export async function requestOtpAction(input: z.input<typeof requestSchema>): Promise<RequestOtpResult> {
  const parsedInput = requestSchema.safeParse(input);
  if (!parsedInput.success) return { ok: false, error: "Something went wrong. Please refresh and try again." };
  const { mode, consent, age, marketing } = parsedInput.data;

  const id = parseIdentifier(parsedInput.data.identifier);
  if (!id.ok) return { ok: false, error: id.error, field: "identifier" };

  if (mode === "signup") {
    if (!consent) return { ok: false, error: "Please accept the Terms and Privacy Notice to continue.", field: "consent" };
    if (!age) return { ok: false, error: "You must be 18 or older to join.", field: "age" };
  }

  const result = await startOtp({
    identifier: id.id,
    intent: mode === "signup" ? "SIGNUP" : "LOGIN",
    consent: mode === "signup" ? { accepted: consent, ageConfirmed: age, marketing } : undefined,
  });
  if (!result.ok) return { ok: false, error: result.error };

  return {
    ok: true,
    identifier: id.id.value,
    masked: maskIdentifier(id.id),
    kind: id.id.kind,
    cooldownSec: result.cooldownSec,
  };
}

const verifySchema = z.object({
  identifier: z.string().max(320),
  code: z.string().max(12),
  next: z.string().max(300).optional(),
});

export type VerifyOtpResult = { ok: false; error: string };

/** On success this redirects (never returns), so the caller's transition stays pending until the next page renders. */
export async function verifyOtpAction(input: z.input<typeof verifySchema>): Promise<VerifyOtpResult> {
  const parsedInput = verifySchema.safeParse(input);
  if (!parsedInput.success) return { ok: false, error: "Something went wrong. Please refresh and try again." };

  const id = parseIdentifier(parsedInput.data.identifier);
  if (!id.ok) return { ok: false, error: id.error };

  const result = await verifyOtp({ identifier: id.id, code: parsedInput.data.code.trim() });
  if (!result.ok) return { ok: false, error: result.error };

  await createSession(result.userId, result.method, await clientMeta());
  redirect(result.isNewUser ? "/onboarding" : safeNext(parsedInput.data.next));
}

export async function logoutAction() {
  const session = await getSession();
  if (session) await audit("session.logout", { userId: session.user.id });
  await destroyCurrentSession();
  redirect("/");
}
