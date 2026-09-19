import { ageOn } from "@/lib/age";
import {
  COUNTRIES,
  EDUCATION,
  INCOME_BAND,
  MARITAL_STATUS,
  MOTHER_TONGUES,
  OCCUPATION_SECTOR,
  RELIGIONS,
  STATES,
  labelOf,
} from "@/lib/reference";

/** What other members may see of a name: first name plus the surname initial unless the owner opted in. */
export function publicName(p: { firstName: string; lastName: string | null; hideLastName: boolean }): string {
  if (!p.lastName) return p.firstName;
  return p.hideLastName ? `${p.firstName} ${p.lastName.charAt(0).toUpperCase()}.` : `${p.firstName} ${p.lastName}`;
}

export function placeLabel(p: { city: string | null; state: string | null; country: string }): string {
  const parts = [p.city];
  if (p.country === "IN") parts.push(labelOf(STATES, p.state));
  else parts.push(labelOf(COUNTRIES, p.country));
  return parts.filter(Boolean).join(", ");
}

export function heightLabel(cm: number | null): string {
  if (!cm) return "";
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
}

export const ageLabel = (dob: Date) => `${ageOn(dob)} yrs`;

export const labels = {
  religion: (v: string | null) => labelOf(RELIGIONS, v),
  motherTongue: (v: string | null) => labelOf(MOTHER_TONGUES, v),
  education: (v: string | null) => labelOf(EDUCATION, v),
  marital: (v: string | null) => labelOf(MARITAL_STATUS, v),
  sector: (v: string | null) => labelOf(OCCUPATION_SECTOR, v),
  income: (v: string | null) => (v && v !== "NOT_DISCLOSED" ? labelOf(INCOME_BAND, v) : ""),
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

/** "Chrome on Windows" from a User-Agent string, for the "your devices" list. Deliberately coarse. */
export function describeDevice(ua: string | null): { label: string; mobile: boolean } {
  if (!ua) return { label: "Unknown device", mobile: false };
  const browser = /edg\//i.test(ua) ? "Edge" : /opr\//i.test(ua) ? "Opera" : /chrome|crios/i.test(ua) ? "Chrome" : /firefox|fxios/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Browser";
  const os = /android/i.test(ua) ? "Android" : /iphone|ipad|ios/i.test(ua) ? "iOS" : /windows/i.test(ua) ? "Windows" : /mac os/i.test(ua) ? "macOS" : /linux/i.test(ua) ? "Linux" : "";
  return { label: os ? `${browser} on ${os}` : browser, mobile: /android|iphone|ipad|mobile/i.test(ua) };
}

export function timeAgo(date: Date, now = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (s < 90) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} hr ago`;
  return `${Math.round(h / 24)} days ago`;
}

export const METHOD_LABEL: Record<string, string> = {
  "otp-sms": "Mobile code",
  "otp-email": "Email code",
  google: "Google",
  facebook: "Facebook",
};
