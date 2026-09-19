import { parsePhoneNumberFromString } from "libphonenumber-js/min";

/**
 * Login identifier handling shared by the browser (instant feedback) and the server (authoritative).
 * Accepts an email address, an Indian mobile number in any common format, or an international
 * number that starts with "+" / "00" (for NRIs).
 */
export type Identifier = { kind: "email" | "phone"; value: string };
export type ParseResult = { ok: true; id: Identifier } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const looksLikeEmail = (raw: string) => raw.includes("@");

export function parseIdentifier(raw: string): ParseResult {
  const input = raw.normalize("NFKC").trim();
  if (!input) return { ok: false, error: "Enter your mobile number or email." };

  if (looksLikeEmail(input)) {
    const email = input.toLowerCase();
    const [local = ""] = email.split("@");
    if (email.length > 254 || local.length > 64 || !EMAIL_RE.test(email)) {
      return { ok: false, error: "Enter a valid email address." };
    }
    return { ok: true, id: { kind: "email", value: email } };
  }

  // Phone. Strip formatting, treat 00 as +.
  let cleaned = input.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("00")) cleaned = `+${cleaned.slice(2)}`;
  if (!/^\+?\d{6,15}$/.test(cleaned)) {
    return { ok: false, error: "Enter a valid mobile number." };
  }

  const parsed = parsePhoneNumberFromString(cleaned, "IN");
  if (!parsed || !parsed.isValid()) {
    return { ok: false, error: "Enter a valid mobile number." };
  }

  // Indian mobiles are 10 digits starting 6-9. Reject landlines and obvious junk (9999999999).
  if (parsed.country === "IN") {
    const national = parsed.nationalNumber;
    if (!/^[6-9]\d{9}$/.test(national) || /^(\d)\1{9}$/.test(national)) {
      return { ok: false, error: "Enter a valid 10-digit Indian mobile number." };
    }
  }

  return { ok: true, id: { kind: "phone", value: parsed.number } };
}

/** "priya.sharma@gmail.com" -> "pr•••@gmail.com", "+919876543210" -> "+91 98••• ••210" */
export function maskIdentifier(id: Identifier): string {
  if (id.kind === "email") {
    const [local = "", domain = ""] = id.value.split("@");
    return `${local.slice(0, 2)}${"•".repeat(Math.max(3, local.length - 2))}@${domain}`;
  }
  const parsed = parsePhoneNumberFromString(id.value);
  if (!parsed) return "••••••";
  const n = parsed.nationalNumber;
  return `+${parsed.countryCallingCode} ${n.slice(0, 2)}••• ••${n.slice(-3)}`;
}
