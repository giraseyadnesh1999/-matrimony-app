import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { generateCodeVerifier, generateState } from "arctic";
import {
  OAUTH_CONTEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from "@/lib/cookie-names";
import { isProd } from "@/lib/env";
import { facebookClient, googleClient, isOAuthProvider, type OAuthContext } from "@/server/oauth";
import { rateLimit } from "@/server/rate-limit";
import { clientMeta, safeNext } from "@/server/request";

/** Starts the OAuth dance. The signup screen passes the user's consent choices in the query string. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) return new NextResponse("Not found", { status: 404 });

  const q = request.nextUrl.searchParams;
  const back = (error: string, page: "login" | "signup" = "login") =>
    NextResponse.redirect(new URL(`/${page}?error=${error}`, request.url));

  const intent = q.get("intent") === "signup" ? "signup" : "login";
  const consent = q.get("consent") === "1" && q.get("age") === "1";
  if (intent === "signup" && !consent) return back("consent_required", "signup");

  const meta = await clientMeta();
  if (meta.ipHash) {
    const limited = await rateLimit(`oauth:start:${meta.ipHash}`, 30, 600);
    if (!limited.ok) return back("rate_limited", intent);
  }

  const state = generateState();
  const store = await cookies();
  const cookieOpts = { httpOnly: true, secure: isProd(), sameSite: "lax", path: "/", maxAge: 600 } as const;

  let url: URL;
  if (provider === "google") {
    const client = googleClient();
    if (!client) return back("provider_disabled", intent);
    const verifier = generateCodeVerifier();
    url = client.createAuthorizationURL(state, verifier, ["openid", "email"]);
    url.searchParams.set("prompt", "select_account");
    store.set(OAUTH_VERIFIER_COOKIE, verifier, cookieOpts);
  } else {
    const client = facebookClient();
    if (!client) return back("provider_disabled", intent);
    url = client.createAuthorizationURL(state, ["email"]);
  }

  const ctx: OAuthContext = {
    intent,
    consent,
    marketing: q.get("marketing") === "1",
    next: safeNext(q.get("next")),
  };
  store.set(OAUTH_STATE_COOKIE, state, cookieOpts);
  store.set(OAUTH_CONTEXT_COOKIE, JSON.stringify(ctx), cookieOpts);
  return NextResponse.redirect(url);
}
