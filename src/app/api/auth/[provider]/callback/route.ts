import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  OAUTH_CONTEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from "@/lib/cookie-names";
import {
  completeOAuth,
  facebookClient,
  googleClient,
  isOAuthProvider,
  readProfile,
  type OAuthContext,
} from "@/server/oauth";
import { clientMeta, safeNext } from "@/server/request";
import { createSession } from "@/server/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return new NextResponse("Not found", { status: 404 });

  const store = await cookies();
  const state = store.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = store.get(OAUTH_VERIFIER_COOKIE)?.value;
  let ctx: OAuthContext | null = null;
  try {
    ctx = JSON.parse(store.get(OAUTH_CONTEXT_COOKIE)?.value ?? "null");
  } catch {
    ctx = null;
  }
  // One-shot cookies: always clear, whatever happens next.
  for (const name of [OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE, OAUTH_CONTEXT_COOKIE]) store.delete(name);

  const page = ctx?.intent === "signup" ? "signup" : "login";
  const fail = (error: string, to: "login" | "signup" = page) =>
    NextResponse.redirect(new URL(`/${to}?error=${error}`, request.url));

  const q = request.nextUrl.searchParams;
  if (q.get("error")) return fail("oauth_cancelled"); // user pressed "Cancel" at the provider
  const code = q.get("code");
  if (!code || !state || !ctx || q.get("state") !== state) return fail("oauth_state");

  try {
    let tokens;
    if (provider === "google") {
      const client = googleClient();
      if (!client || !verifier) return fail("oauth_failed");
      tokens = await client.validateAuthorizationCode(code, verifier);
    } else {
      const client = facebookClient();
      if (!client) return fail("oauth_failed");
      tokens = await client.validateAuthorizationCode(code);
    }

    const profile = await readProfile(provider, tokens);
    const meta = await clientMeta();
    const outcome = await completeOAuth(provider, profile, ctx, meta);
    if (!outcome.ok) return fail(outcome.error, outcome.error === "no_account" ? "signup" : page);

    await createSession(outcome.userId, outcome.method, meta);
    const dest = outcome.isNewUser ? "/onboarding" : safeNext(ctx.next);
    return NextResponse.redirect(new URL(dest, request.url));
  } catch (err) {
    // Never echo provider error bodies; they can contain codes/tokens.
    console.error("oauth callback failed:", provider, err instanceof Error ? err.name : "unknown");
    return fail("oauth_failed");
  }
}
