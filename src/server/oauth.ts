import "server-only";
import { Facebook, Google, decodeIdToken, type OAuth2Tokens } from "arctic";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { Identifier } from "@/lib/identifier";
import { audit } from "./audit";
import type { ClientMeta } from "./request";
import type { AuthMethod } from "./session";
import { createUser, findUserByIdentifier } from "./users";

/**
 * Social login (OAuth 2.0 / OIDC) with data minimisation:
 *  - Only the email scope is requested. We never ask for profile photo, contacts, friends or birthday.
 *  - Provider access/refresh tokens are discarded immediately after reading the email; nothing is stored
 *    except the opaque provider account id needed to recognise the same person next time.
 *  - Google is trusted for `email_verified`. Facebook gives no such guarantee, so a Facebook email never
 *    links to an existing account (prevents account takeover through an unverified address).
 */
export type OAuthProvider = "google" | "facebook";
export const isOAuthProvider = (v: string): v is OAuthProvider => v === "google" || v === "facebook";

export const redirectUri = (p: OAuthProvider) => `${env().APP_URL}/api/auth/${p}/callback`;

export function googleClient() {
  const e = env();
  if (!e.GOOGLE_CLIENT_ID || !e.GOOGLE_CLIENT_SECRET) return null;
  return new Google(e.GOOGLE_CLIENT_ID, e.GOOGLE_CLIENT_SECRET, redirectUri("google"));
}

export function facebookClient() {
  const e = env();
  if (!e.FACEBOOK_CLIENT_ID || !e.FACEBOOK_CLIENT_SECRET) return null;
  return new Facebook(e.FACEBOOK_CLIENT_ID, e.FACEBOOK_CLIENT_SECRET, redirectUri("facebook"));
}

export type ProviderProfile = { providerAccountId: string; email: string | null; emailVerified: boolean };

export async function readProfile(provider: OAuthProvider, tokens: OAuth2Tokens): Promise<ProviderProfile> {
  if (provider === "google") {
    const claims = decodeIdToken(tokens.idToken()) as { sub?: string; email?: string; email_verified?: boolean };
    if (!claims.sub) throw new Error("Google response had no subject");
    return {
      providerAccountId: claims.sub,
      email: claims.email?.toLowerCase() ?? null,
      emailVerified: claims.email_verified === true,
    };
  }
  const res = await fetch(
    `https://graph.facebook.com/v19.0/me?fields=id,email&access_token=${encodeURIComponent(tokens.accessToken())}`,
    { signal: AbortSignal.timeout(8000), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Facebook profile request failed (${res.status})`);
  const json = (await res.json()) as { id?: string; email?: string };
  if (!json.id) throw new Error("Facebook response had no id");
  return { providerAccountId: json.id, email: json.email?.toLowerCase() ?? null, emailVerified: false };
}

export type OAuthContext = { intent: "login" | "signup"; consent: boolean; marketing: boolean; next: string };

export type OAuthOutcome =
  | { ok: true; userId: string; method: AuthMethod; isNewUser: boolean }
  | { ok: false; error: "no_email" | "email_unverified" | "no_account" | "account_exists" | "suspended" };

export async function completeOAuth(
  provider: OAuthProvider,
  profile: ProviderProfile,
  ctx: OAuthContext,
  meta: ClientMeta,
): Promise<OAuthOutcome> {
  const method: AuthMethod = provider;
  const accountKey = { provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId } };

  // 1. Returning social user.
  const linked = await db.oAuthAccount.findUnique({ where: accountKey, include: { user: true } });
  if (linked) {
    if (linked.user.status === "SUSPENDED") return { ok: false, error: "suspended" };
    return { ok: true, userId: linked.userId, method, isNewUser: false };
  }

  if (!profile.email) return { ok: false, error: "no_email" };
  const identifier: Identifier = { kind: "email", value: profile.email };

  // 2. Existing account with this email.
  let existing = await findUserByIdentifier(identifier);
  if (existing && !existing.emailVerifiedAt && profile.emailVerified) {
    // Pre-hijack defence: that account was created with an address nobody had proven. The provider now
    // vouches for the real owner, so discard the earlier claimant (and any logins they linked).
    await db.user.delete({ where: { id: existing.id } });
    await audit("account.unverified_replaced", { ipHash: meta.ipHash, meta: { provider } });
    existing = null;
  }
  if (existing) {
    if (existing.status === "SUSPENDED") return { ok: false, error: "suspended" };
    if (!profile.emailVerified) return { ok: false, error: "account_exists" };
    await db.oAuthAccount.create({ data: { userId: existing.id, provider, providerAccountId: profile.providerAccountId } });
    if (!existing.emailVerifiedAt) {
      await db.user.update({ where: { id: existing.id }, data: { emailVerifiedAt: new Date() } });
    }
    await audit("oauth.linked", { userId: existing.id, ipHash: meta.ipHash, meta: { provider } });
    return { ok: true, userId: existing.id, method, isNewUser: false };
  }

  // 3. Brand-new person: only allowed from the signup screen, where consent was given first.
  if (ctx.intent !== "signup" || !ctx.consent) return { ok: false, error: "no_account" };
  if (provider === "google" && !profile.emailVerified) return { ok: false, error: "email_unverified" };

  const user = await createUser(identifier, { marketing: ctx.marketing, source: "social-signup" }, meta.ipHash, {
    verified: profile.emailVerified,
  });
  await db.oAuthAccount.create({ data: { userId: user.id, provider, providerAccountId: profile.providerAccountId } });
  return { ok: true, userId: user.id, method, isNewUser: true };
}

