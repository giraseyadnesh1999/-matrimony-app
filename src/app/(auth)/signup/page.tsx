import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { enabledOAuthProviders, env } from "@/lib/env";
import { safeNext } from "@/server/request";
import { getSession } from "@/server/session";
import { AUTH_ERRORS, first } from "../_messages";
import { AuthForm } from "../_components/auth-form";

export const metadata: Metadata = { title: "Create your profile" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = safeNext(first(sp.next), "");

  if (await getSession()) redirect("/discover");

  const e = env();
  return (
    <AuthForm
      mode="signup"
      providers={enabledOAuthProviders()}
      next={next || undefined}
      initialError={AUTH_ERRORS[first(sp.error) ?? ""]}
      devMode={e.SMS_PROVIDER === "console" || e.EMAIL_PROVIDER === "console"}
    />
  );
}
