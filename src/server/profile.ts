import "server-only";
import type { PartnerPreference, Prisma, Profile } from "@prisma/client";
import { ageOn, parseIsoDate } from "@/lib/age";
import type { ConsentPurpose } from "@/lib/consent";
import { db } from "@/lib/db";
import {
  STEP_IDS,
  validateStep,
  type FieldErrors,
  type StepId,
  type Values,
} from "@/lib/onboarding/steps";
import { audit } from "./audit";
import { currentConsents, recordConsent } from "./users";

/** Records a consent change only when the wanted state differs from the current one. */
async function syncConsent(userId: string, purpose: ConsentPurpose, wanted: boolean, ipHash: string | null) {
  const now = await currentConsents(userId);
  if (now[purpose] !== wanted) await recordConsent(userId, purpose, wanted, "onboarding", ipHash);
}

const json = (v: string[]): Prisma.InputJsonValue => v;
const asList = (v: Prisma.JsonValue | null | undefined): string[] => (Array.isArray(v) ? (v as string[]) : []);

/** Share of the "core" fields filled in, used to nudge people towards richer profiles. */
export function computeCompleteness(p: Partial<Profile>, pref: Partial<PartnerPreference> | null): number {
  const checks: Array<[unknown, number]> = [
    [p.firstName, 4], [p.dateOfBirth, 4], [p.maritalStatus, 4], [p.heightCm, 5],
    [p.religion, 5], [p.motherTongue, 5], [p.caste, 4], [p.city && p.state, 6], [p.education, 6],
    [p.occupation, 5], [p.occupationSector, 4], [p.incomeBand && p.incomeBand !== "NOT_DISCLOSED", 3],
    [p.diet, 4], [p.familyType, 3], [p.familyValues, 3], [p.fatherOccupation || p.motherOccupation, 3],
    [p.about && p.about.length >= 100, 14], [p.about && p.about.length >= 20, 6],
    [pref?.ageMin || pref?.ageMax, 4], [asList(pref?.religions).length > 0 || pref?.casteNoBar, 3],
    [pref?.about, 3], [p.manglik || p.rashi, 2], [p.knownLanguages && asList(p.knownLanguages).length, 2],
  ];
  const total = checks.reduce((s, [, w]) => s + w, 0);
  const got = checks.reduce((s, [v, w]) => s + (v ? w : 0), 0);
  return Math.min(100, Math.round((got / total) * 100));
}

export type SaveResult =
  | { ok: true; complete: boolean; nextStep: number }
  | { ok: false; errors: FieldErrors };

export async function saveStep(
  userId: string,
  stepId: StepId,
  raw: Values,
  ipHash: string | null,
): Promise<SaveResult> {
  const index = STEP_IDS.indexOf(stepId);
  const existing = await db.profile.findUnique({ where: { userId } });

  if (stepId !== "basics" && !existing) {
    return { ok: false, errors: { _: "Please complete the first step before continuing." } };
  }
  const reached = Math.max(existing?.onboardingStep ?? 0, index + 1);

  switch (stepId) {
    case "basics": {
      const r = validateStep("basics", raw);
      if (!r.ok) return r;
      const d = r.data;
      const data = {
        profileFor: d.profileFor,
        firstName: d.firstName,
        lastName: d.lastName ?? null,
        gender: d.gender,
        dateOfBirth: parseIsoDate(d.dateOfBirth)!,
        maritalStatus: d.maritalStatus,
        hasChildren: d.maritalStatus === "NEVER_MARRIED" ? null : (d.hasChildren ?? null),
        heightCm: d.heightCm ?? null,
        physicalStatus: d.physicalStatus ?? "NOT_SAID",
        disabilityNote: d.physicalStatus === "DISABILITY" ? (d.disabilityNote ?? null) : null,
      };
      await db.profile.upsert({
        where: { userId },
        create: { userId, ...data, onboardingStep: reached },
        update: { ...data, onboardingStep: reached },
      });
      await syncConsent(userId, "health_disability", d.physicalStatus === "DISABILITY", ipHash);
      if (!existing) {
        await audit("profile.created", {
          userId,
          ipHash,
          meta: { profileFor: d.profileFor, adultConfirmed: d.profileFor === "SELF" ? null : d.onBehalfConfirm },
        });
      }
      break;
    }
    case "community": {
      const r = validateStep("community", raw);
      if (!r.ok) return r;
      const d = r.data;
      await db.profile.update({
        where: { userId },
        data: {
          religion: d.religion,
          sect: d.sect ?? null,
          caste: d.caste ?? null,
          subCaste: d.subCaste ?? null,
          gotra: d.gotra ?? null,
          motherTongue: d.motherTongue,
          knownLanguages: json(d.knownLanguages),
          manglik: d.horoscope ? (d.manglik ?? null) : null,
          rashi: d.horoscope ? (d.rashi ?? null) : null,
          nakshatra: d.horoscope ? (d.nakshatra ?? null) : null,
          birthTime: d.horoscope ? (d.birthTime ?? null) : null,
          birthPlace: d.horoscope ? (d.birthPlace ?? null) : null,
          onboardingStep: reached,
        },
      });
      await syncConsent(userId, "horoscope", d.horoscope, ipHash);
      break;
    }
    case "location": {
      const r = validateStep("location", raw);
      if (!r.ok) return r;
      const d = r.data;
      await db.profile.update({
        where: { userId },
        data: {
          country: d.country,
          residencyStatus: d.residencyStatus,
          state: d.country === "IN" ? (d.state ?? null) : null,
          city: d.city,
          onboardingStep: reached,
        },
      });
      break;
    }
    case "career": {
      const r = validateStep("career", raw);
      if (!r.ok) return r;
      const d = r.data;
      await db.profile.update({
        where: { userId },
        data: {
          education: d.education,
          educationField: d.educationField ?? null,
          institution: d.institution ?? null,
          occupationSector: d.occupationSector,
          occupation: d.occupation ?? null,
          incomeBand: d.incomeBand ?? null,
          onboardingStep: reached,
        },
      });
      break;
    }
    case "family": {
      const r = validateStep("family", raw);
      if (!r.ok) return r;
      const d = r.data;
      await db.profile.update({
        where: { userId },
        data: {
          diet: d.diet,
          smoking: d.smoking ?? null,
          drinking: d.drinking ?? null,
          familyType: d.familyType ?? null,
          familyValues: d.familyValues ?? null,
          fatherOccupation: d.fatherOccupation ?? null,
          motherOccupation: d.motherOccupation ?? null,
          brothers: d.brothers ?? null,
          sisters: d.sisters ?? null,
          onboardingStep: reached,
        },
      });
      break;
    }
    case "about": {
      const r = validateStep("about", raw);
      if (!r.ok) return r;
      const d = r.data;
      // The last step only completes the profile if every earlier step was saved.
      const allPrevious = (existing?.onboardingStep ?? 0) >= STEP_IDS.length - 1;
      if (!allPrevious) {
        return { ok: false, errors: { _: "Some earlier steps are unfinished. Please go back and complete them." } };
      }
      const prefData = {
        ageMin: d.ageMin ?? null,
        ageMax: d.ageMax ?? null,
        religions: json(d.prefReligions),
        maritalStatuses: json(d.prefMarital),
        diets: json(d.prefDiets),
        manglik: d.prefManglik,
        casteNoBar: d.casteNoBar,
        about: d.partnerAbout ?? null,
      };
      const pref = await db.partnerPreference.upsert({
        where: { userId },
        create: { userId, ...prefData },
        update: prefData,
      });
      const updated = await db.profile.update({
        where: { userId },
        data: { about: d.about, onboardingStep: reached },
      });
      await db.profile.update({
        where: { userId },
        data: {
          completeness: computeCompleteness(updated, pref),
          completedAt: existing?.completedAt ?? new Date(),
        },
      });
      await audit("profile.completed", { userId, ipHash });
      return { ok: true, complete: true, nextStep: STEP_IDS.length };
    }
  }

  const fresh = await db.profile.findUniqueOrThrow({ where: { userId } });
  const pref = await db.partnerPreference.findUnique({ where: { userId } });
  await db.profile.update({ where: { userId }, data: { completeness: computeCompleteness(fresh, pref) } });
  return { ok: true, complete: false, nextStep: Math.min(index + 1, STEP_IDS.length - 1) };
}

/* ---------------------------------------------------------------------------------------------- */

const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

/** DB rows -> the string-based form values the wizard edits. */
export async function loadWizardState(userId: string) {
  const [profile, pref, consents] = await Promise.all([
    db.profile.findUnique({ where: { userId } }),
    db.partnerPreference.findUnique({ where: { userId } }),
    currentConsents(userId),
  ]);

  const age = profile ? ageOn(profile.dateOfBirth) : 28;
  const values: Values = {
    // basics
    profileFor: s(profile?.profileFor),
    onBehalfConfirm: !!profile && profile.profileFor !== "SELF",
    firstName: s(profile?.firstName),
    lastName: s(profile?.lastName),
    gender: s(profile?.gender),
    dateOfBirth: profile ? profile.dateOfBirth.toISOString().slice(0, 10) : "",
    maritalStatus: s(profile?.maritalStatus),
    hasChildren: s(profile?.hasChildren),
    heightCm: s(profile?.heightCm),
    physicalStatus: profile?.physicalStatus === "NOT_SAID" ? "" : s(profile?.physicalStatus),
    disabilityConsent: consents.health_disability,
    disabilityNote: s(profile?.disabilityNote),
    // community
    religion: s(profile?.religion),
    sect: s(profile?.sect),
    caste: s(profile?.caste),
    subCaste: s(profile?.subCaste),
    gotra: s(profile?.gotra),
    motherTongue: s(profile?.motherTongue),
    knownLanguages: asList(profile?.knownLanguages),
    horoscope: consents.horoscope,
    manglik: s(profile?.manglik),
    rashi: s(profile?.rashi),
    nakshatra: s(profile?.nakshatra),
    birthTime: s(profile?.birthTime),
    birthPlace: s(profile?.birthPlace),
    // location
    country: profile?.country ?? "IN",
    residencyStatus: profile?.residencyStatus ?? "RESIDENT",
    state: s(profile?.state),
    city: s(profile?.city),
    // career
    education: s(profile?.education),
    educationField: s(profile?.educationField),
    institution: s(profile?.institution),
    occupationSector: s(profile?.occupationSector),
    occupation: s(profile?.occupation),
    incomeBand: s(profile?.incomeBand),
    // family
    diet: s(profile?.diet),
    smoking: s(profile?.smoking),
    drinking: s(profile?.drinking),
    familyType: s(profile?.familyType),
    familyValues: s(profile?.familyValues),
    fatherOccupation: s(profile?.fatherOccupation),
    motherOccupation: s(profile?.motherOccupation),
    brothers: s(profile?.brothers),
    sisters: s(profile?.sisters),
    // about + preferences
    about: s(profile?.about),
    ageMin: s(pref?.ageMin ?? (profile ? Math.max(18, age - 5) : "")),
    ageMax: s(pref?.ageMax ?? (profile ? age + 5 : "")),
    prefReligions: asList(pref?.religions),
    prefMarital: asList(pref?.maritalStatuses),
    prefDiets: asList(pref?.diets),
    prefManglik: pref?.manglik ?? "ANY",
    casteNoBar: pref?.casteNoBar ?? true,
    partnerAbout: s(pref?.about),
  };

  return {
    values,
    savedSteps: profile?.onboardingStep ?? 0,
    complete: !!profile?.completedAt,
  };
}
