import "server-only";
import { headers } from "next/headers";
import { blindIndex } from "@/lib/crypto";
import { env } from "@/lib/env";

export type ClientMeta = {
  /** null when we cannot trust proxy headers; callers must then skip IP-based limits. */
  ipHash: string | null;
  userAgent: string | null;
};

/**
 * Client fingerprint for rate limiting and audit trails. The raw IP is never stored: only a keyed
 * hash, which is enough to correlate abuse without keeping a personal identifier.
 */
export async function clientMeta(): Promise<ClientMeta> {
  const h = await headers();
  const ua = h.get("user-agent")?.slice(0, 160) ?? null;

  if (!env().TRUST_PROXY) return { ipHash: null, userAgent: ua };

  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return { ipHash: ip ? blindIndex("ip", ip) : null, userAgent: ua };
}

/** Same-site relative paths only, so `?next=` can never become an open redirect. */
export function safeNext(value: unknown, fallback = "/discover"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/api/") || value.startsWith("/login") || value.startsWith("/signup")) return fallback;
  return value.slice(0, 300);
}
