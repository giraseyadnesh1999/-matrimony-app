import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";
import { env } from "@/lib/env";

/**
 * Field-level encryption for contact details (AES-256-GCM).
 * Format: v1.<iv>.<tag>.<ciphertext> (base64url). The version prefix lets us rotate keys later.
 */
const VERSION = "v1";

function key(): Buffer {
  return Buffer.from(env().DATA_ENCRYPTION_KEY, "base64");
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ct.toString("base64url")].join(".");
}

export function decrypt(payload: string): string {
  const [version, iv, tag, ct] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !ct) throw new Error("Unsupported ciphertext format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
}

/** Keyed hash used as a searchable, non-reversible index (e.g. to find a user by phone). */
export function blindIndex(context: "email" | "phone" | "oauth" | "user" | "ip" | "otp", value: string): string {
  return createHmac("sha256", env().HASH_PEPPER).update(`${context}:${value}`).digest("hex");
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Opaque, unguessable token (256 bits). */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** Uniform 6-digit numeric code from a CSPRNG. */
export const generateOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export function hashOtp(identifierHash: string, code: string): string {
  return blindIndex("otp", `${identifierHash}:${code}`);
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb);
}

/** Human-friendly reference such as GR-7K2M9QXA (no ambiguous characters). */
export function referenceCode(prefix: string): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[randomInt(alphabet.length)];
  return `${prefix}-${out}`;
}
