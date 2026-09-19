/**
 * Age rules.
 *
 * - Legal minimum age to marry in India (Prohibition of Child Marriage Act, 2006): 21 for men, 18 for women.
 *   Kept as configuration so it follows future amendments.
 * - DPDP Act 2023 treats anyone under 18 as a child and requires verifiable parental consent for
 *   processing their data, which a matrimony service must never do. 18 is therefore an absolute floor.
 */
export const ABSOLUTE_MIN_AGE = 18;
export const MAX_AGE = 80;

export function minMarriageAge(gender: string | undefined): number {
  return gender === "MALE" ? 21 : ABSOLUTE_MIN_AGE;
}

export function ageOn(dob: Date, today: Date = new Date()): number {
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    today.getUTCMonth() < dob.getUTCMonth() ||
    (today.getUTCMonth() === dob.getUTCMonth() && today.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/** Parses a yyyy-mm-dd string as a UTC date; returns null when it is not a real calendar date. */
export function parseIsoDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  return date;
}

/** Date-of-birth range (inclusive) for members aged between minAge and maxAge today. */
export function dobRangeForAges(minAge: number, maxAge: number, today: Date = new Date()) {
  const latest = new Date(Date.UTC(today.getUTCFullYear() - minAge, today.getUTCMonth(), today.getUTCDate()));
  // Someone aged maxAge has a birthday no earlier than (today - (maxAge + 1) years + 1 day).
  const earliest = new Date(Date.UTC(today.getUTCFullYear() - maxAge - 1, today.getUTCMonth(), today.getUTCDate() + 1));
  return { gte: earliest, lte: latest };
}
