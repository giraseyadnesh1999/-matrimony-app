import "server-only";
import type { Prisma, Profile } from "@prisma/client";
import { dobRangeForAges, ageOn, ABSOLUTE_MIN_AGE, MAX_AGE } from "@/lib/age";
import { db } from "@/lib/db";
import { publicName } from "@/lib/display";
import {
  DIET,
  EDUCATION,
  MARITAL_STATUS,
  MOTHER_TONGUES,
  RELIGIONS,
  STATES,
} from "@/lib/reference";
import { currentConsents } from "./users";

export const PAGE_SIZE = 12;

export type InterestState = "NONE" | "SENT" | "RECEIVED" | "ACCEPTED";

/** Everything a member card or profile page may show. Note what is absent: DOB, phone, email, surname (unless opted in). */
export type PublicProfile = {
  userId: string;
  name: string;
  age: number;
  heightCm: number | null;
  maritalStatus: string;
  hasChildren: string | null;
  religion: string | null;
  sect: string | null;
  caste: string | null;
  subCaste: string | null;
  gotra: string | null;
  motherTongue: string | null;
  knownLanguages: string[];
  country: string;
  state: string | null;
  city: string | null;
  residencyStatus: string;
  education: string | null;
  educationField: string | null;
  institution: string | null;
  occupationSector: string | null;
  occupation: string | null;
  incomeBand: string | null;
  diet: string | null;
  smoking: string | null;
  drinking: string | null;
  familyType: string | null;
  familyValues: string | null;
  fatherOccupation: string | null;
  motherOccupation: string | null;
  brothers: number | null;
  sisters: number | null;
  about: string | null;
  physicalStatus: string | null;
  disabilityNote: string | null;
  horoscope: { manglik: string | null; rashi: string | null; nakshatra: string | null; birthTime: string | null; birthPlace: string | null } | null;
  completeness: number;
};

const asList = (v: Prisma.JsonValue | null | undefined): string[] => (Array.isArray(v) ? (v as string[]) : []);

/**
 * Projection from DB row to what members see. Sensitive optional data (horoscope, disability) is
 * included only when its consent is currently granted, even if stale values linger in the row.
 */
export function toPublic(
  p: Profile,
  consents: { horoscope: boolean; health_disability: boolean },
): PublicProfile {
  const hasHoroscope = consents.horoscope && (p.manglik || p.rashi || p.nakshatra || p.birthTime || p.birthPlace);
  const showsDisability = consents.health_disability && p.physicalStatus === "DISABILITY";
  return {
    userId: p.userId,
    name: publicName(p),
    age: ageOn(p.dateOfBirth),
    heightCm: p.heightCm,
    maritalStatus: p.maritalStatus,
    hasChildren: p.hasChildren,
    religion: p.religion,
    sect: p.sect,
    caste: p.caste,
    subCaste: p.subCaste,
    gotra: p.gotra,
    motherTongue: p.motherTongue,
    knownLanguages: asList(p.knownLanguages),
    country: p.country,
    state: p.state,
    city: p.city,
    residencyStatus: p.residencyStatus,
    education: p.education,
    educationField: p.educationField,
    institution: p.institution,
    occupationSector: p.occupationSector,
    occupation: p.occupation,
    incomeBand: p.incomeBand,
    diet: p.diet,
    smoking: p.smoking,
    drinking: p.drinking,
    familyType: p.familyType,
    familyValues: p.familyValues,
    fatherOccupation: p.fatherOccupation,
    motherOccupation: p.motherOccupation,
    brothers: p.brothers,
    sisters: p.sisters,
    about: p.about,
    physicalStatus: showsDisability ? "DISABILITY" : null,
    disabilityNote: showsDisability ? p.disabilityNote : null,
    horoscope: hasHoroscope
      ? { manglik: p.manglik, rashi: p.rashi, nakshatra: p.nakshatra, birthTime: p.birthTime, birthPlace: p.birthPlace }
      : null,
    completeness: p.completeness,
  };
}

/** Users the viewer must never see, and who must never see the viewer. */
export async function blockedIds(viewerId: string): Promise<string[]> {
  const rows = await db.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  });
  return rows.map((r) => (r.blockerId === viewerId ? r.blockedId : r.blockerId));
}

/** Which genders the viewer is shown. "Other" members are visible to everyone and see everyone. */
export function seekingGenders(gender: string): string[] {
  if (gender === "FEMALE") return ["MALE", "OTHER"];
  if (gender === "MALE") return ["FEMALE", "OTHER"];
  return ["FEMALE", "MALE", "OTHER"];
}

export type DiscoverFilters = {
  ageMin?: number;
  ageMax?: number;
  religion?: string;
  motherTongue?: string;
  state?: string;
  maritalStatus?: string;
  diet?: string;
  education?: string;
  page: number;
};

const oneOf = (opts: readonly { value: string }[], v: string | undefined) =>
  v && opts.some((o) => o.value === v) ? v : undefined;
const age = (v: string | undefined) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= ABSOLUTE_MIN_AGE && n <= MAX_AGE ? n : undefined;
};

/** Validates raw URL params against the reference lists. Unknown values are ignored, never trusted. */
export function parseFilters(sp: Record<string, string | string[] | undefined>): DiscoverFilters {
  const g = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  const page = Math.max(1, Math.min(500, Number.parseInt(g("page") ?? "1", 10) || 1));
  return {
    ageMin: age(g("ageMin")),
    ageMax: age(g("ageMax")),
    religion: oneOf(RELIGIONS, g("religion")),
    motherTongue: oneOf(MOTHER_TONGUES, g("motherTongue")),
    state: oneOf(STATES, g("state")),
    maritalStatus: oneOf(MARITAL_STATUS, g("maritalStatus")),
    diet: oneOf(DIET, g("diet")),
    education: oneOf(EDUCATION, g("education")),
    page,
  };
}

export type DiscoverCard = PublicProfile & { interest: InterestState };

const NO_CONSENT = { horoscope: false, health_disability: false };

/** Current horoscope / disability consent for many members at once (newest ledger row wins). */
export async function consentsFor(userIds: string[]) {
  const rows = await db.consentRecord.findMany({
    where: { userId: { in: userIds }, purpose: { in: ["horoscope", "health_disability"] } },
    orderBy: { createdAt: "asc" },
  });
  const map = new Map<string, { horoscope: boolean; health_disability: boolean }>();
  for (const c of rows) {
    const cur = map.get(c.userId) ?? { ...NO_CONSENT };
    cur[c.purpose as "horoscope" | "health_disability"] = c.granted;
    map.set(c.userId, cur);
  }
  return map;
}

export { NO_CONSENT };

export async function discover(viewer: Profile, filters: DiscoverFilters) {
  const excluded = await blockedIds(viewer.userId);
  const where: Prisma.ProfileWhereInput = {
    userId: { not: viewer.userId, notIn: excluded },
    completedAt: { not: null },
    isHidden: false,
    user: { status: "ACTIVE" },
    gender: { in: seekingGenders(viewer.gender) },
    ...(filters.ageMin || filters.ageMax
      ? { dateOfBirth: dobRangeForAges(filters.ageMin ?? ABSOLUTE_MIN_AGE, filters.ageMax ?? MAX_AGE) }
      : {}),
    ...(filters.religion && { religion: filters.religion }),
    ...(filters.motherTongue && { motherTongue: filters.motherTongue }),
    ...(filters.state && { state: filters.state }),
    ...(filters.maritalStatus && { maritalStatus: filters.maritalStatus }),
    ...(filters.diet && { diet: filters.diet }),
    ...(filters.education && { education: filters.education }),
  };

  const [total, rows] = await Promise.all([
    db.profile.count({ where }),
    db.profile.findMany({
      where,
      orderBy: [{ completedAt: "desc" }, { id: "asc" }],
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const ids = rows.map((r) => r.userId);
  const [interests, consentMap] = await Promise.all([
    db.interest.findMany({
      where: {
        OR: [
          { fromUserId: viewer.userId, toUserId: { in: ids } },
          { toUserId: viewer.userId, fromUserId: { in: ids } },
        ],
      },
    }),
    consentsFor(ids),
  ]);

  const items: DiscoverCard[] = rows.map((r) => ({
    ...toPublic(r, consentMap.get(r.userId) ?? NO_CONSENT),
    interest: interestStateFor(viewer.userId, r.userId, interests),
  }));

  return { items, total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export function interestStateFor(
  viewerId: string,
  otherId: string,
  interests: Array<{ fromUserId: string; toUserId: string; status: string }>,
): InterestState {
  const sent = interests.find((i) => i.fromUserId === viewerId && i.toUserId === otherId);
  const received = interests.find((i) => i.fromUserId === otherId && i.toUserId === viewerId);
  if (sent?.status === "ACCEPTED" || received?.status === "ACCEPTED") return "ACCEPTED";
  if (received?.status === "PENDING") return "RECEIVED";
  // A declined interest still reads as "sent" to the sender: declines are never revealed.
  if (sent && sent.status !== "WITHDRAWN") return "SENT";
  return "NONE";
}

/** Single profile as seen by `viewerId`, or null if the viewer may not see it (hidden, blocked, inactive, incomplete). */
export async function getVisibleProfile(viewer: Profile, targetUserId: string) {
  if (targetUserId === viewer.userId) return null; // own profile has its own page
  const excluded = await blockedIds(viewer.userId);
  if (excluded.includes(targetUserId)) return null;

  const target = await db.profile.findFirst({
    where: {
      userId: targetUserId,
      completedAt: { not: null },
      isHidden: false,
      user: { status: "ACTIVE" },
    },
  });
  if (!target) return null;

  const [consents, interests, pref] = await Promise.all([
    currentConsents(targetUserId),
    db.interest.findMany({
      where: {
        OR: [
          { fromUserId: viewer.userId, toUserId: targetUserId },
          { fromUserId: targetUserId, toUserId: viewer.userId },
        ],
      },
    }),
    db.partnerPreference.findUnique({ where: { userId: targetUserId } }),
  ]);

  return {
    profile: toPublic(target, consents),
    interest: interestStateFor(viewer.userId, targetUserId, interests),
    preference: pref
      ? {
          ageMin: pref.ageMin,
          ageMax: pref.ageMax,
          religions: asList(pref.religions),
          maritalStatuses: asList(pref.maritalStatuses),
          diets: asList(pref.diets),
          manglik: pref.manglik,
          casteNoBar: pref.casteNoBar,
          about: pref.about,
        }
      : null,
  };
}

