import { z } from "zod";
import { ABSOLUTE_MIN_AGE, MAX_AGE, ageOn, minMarriageAge, parseIsoDate } from "@/lib/age";
import type { ConsentPurpose } from "@/lib/consent";
import {
  COUNTRIES,
  DIET,
  EDUCATION,
  EDUCATION_FIELD,
  FAMILY_TYPE,
  FAMILY_VALUES,
  GENDERS,
  HABIT,
  HAS_CHILDREN,
  HEIGHTS,
  INCOME_BAND,
  MANGLIK,
  MANGLIK_PREFERENCE,
  MARITAL_STATUS,
  MOTHER_TONGUES,
  NAKSHATRA,
  OCCUPATION_SECTOR,
  PHYSICAL_STATUS,
  PROFILE_FOR,
  RASHI,
  RELIGIONS,
  RESIDENCY_STATUS,
  SECTS,
  STATES,
  optionValues,
  type Option,
} from "@/lib/reference";

/**
 * Single source of truth for the onboarding / edit-profile wizard.
 * The browser uses it for instant feedback; the server re-validates with the same schemas
 * (never trust the client), so the rules cannot drift apart.
 */
export type Values = Record<string, string | string[] | boolean>;

type Base = { name: string; label: string; hint?: string; optional?: boolean; showIf?: (v: Values) => boolean };
export type FieldDef =
  | (Base & { kind: "text"; maxLength: number; placeholder?: string; autoComplete?: string })
  | (Base & { kind: "select"; options: readonly Option[] | ((v: Values) => readonly Option[]); placeholder?: string })
  | (Base & { kind: "date" })
  | (Base & { kind: "time" })
  | (Base & { kind: "textarea"; maxLength: number; placeholder?: string })
  | (Base & { kind: "chips"; options: readonly Option[]; max?: number })
  | (Base & { kind: "toggle"; description?: string; consent?: ConsentPurpose });

export const STEP_IDS = ["basics", "community", "location", "career", "family", "about"] as const;
export type StepId = (typeof STEP_IDS)[number];

export type StepDef = { id: StepId; title: string; subtitle: string; fields: FieldDef[] };

const numberRange = (from: number, to: number): Option[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: String(from + i), label: String(from + i) }));

const AGE_OPTIONS = numberRange(ABSOLUTE_MIN_AGE, MAX_AGE);
const SIBLING_OPTIONS = numberRange(0, 10);
const str = (v: Values, k: string) => (typeof v[k] === "string" ? (v[k] as string) : "");

export const STEPS: StepDef[] = [
  {
    id: "basics",
    title: "About you",
    subtitle: "The basics, for the person who is to be married.",
    fields: [
      { kind: "select", name: "profileFor", label: "This profile is for", options: PROFILE_FOR, placeholder: "Choose" },
      {
        kind: "toggle",
        name: "onBehalfConfirm",
        label: "The person is an adult and has agreed to this profile being created.",
        description: "We need this when a profile is created for someone else.",
        showIf: (v) => !!v.profileFor && v.profileFor !== "SELF",
      },
      { kind: "text", name: "firstName", label: "First name", maxLength: 40, autoComplete: "given-name" },
      {
        kind: "text",
        name: "lastName",
        label: "Surname",
        maxLength: 40,
        optional: true,
        autoComplete: "family-name",
        hint: "Other members see only the first letter unless you change this in Settings.",
      },
      { kind: "select", name: "gender", label: "Gender", options: GENDERS, placeholder: "Choose" },
      {
        kind: "date",
        name: "dateOfBirth",
        label: "Date of birth",
        hint: "Only the age is shown to others. Under Indian law men must be 21 and women 18 to marry.",
      },
      { kind: "select", name: "maritalStatus", label: "Marital status", options: MARITAL_STATUS, placeholder: "Choose" },
      {
        kind: "select",
        name: "hasChildren",
        label: "Any children?",
        options: HAS_CHILDREN,
        placeholder: "Choose",
        showIf: (v) => !!v.maritalStatus && v.maritalStatus !== "NEVER_MARRIED",
      },
      { kind: "select", name: "heightCm", label: "Height", options: HEIGHTS, placeholder: "Choose", optional: true },
      {
        kind: "select",
        name: "physicalStatus",
        label: "Physical status",
        options: PHYSICAL_STATUS,
        placeholder: "Prefer not to say",
        optional: true,
      },
      {
        kind: "toggle",
        name: "disabilityConsent",
        label: "I am happy for this to appear on my profile.",
        description: "Disability details are sensitive. You can withdraw this any time in Settings.",
        consent: "health_disability",
        showIf: (v) => v.physicalStatus === "DISABILITY",
      },
      {
        kind: "textarea",
        name: "disabilityNote",
        label: "Anything you'd like to add",
        maxLength: 200,
        optional: true,
        showIf: (v) => v.physicalStatus === "DISABILITY" && v.disabilityConsent === true,
      },
    ],
  },
  {
    id: "community",
    title: "Religion & community",
    subtitle: "Shared background often matters. Everything here except religion and language is optional.",
    fields: [
      { kind: "select", name: "religion", label: "Religion", options: RELIGIONS, placeholder: "Choose" },
      {
        kind: "select",
        name: "sect",
        label: "Denomination / sect",
        options: (v) => SECTS[str(v, "religion")] ?? [],
        placeholder: "Choose",
        optional: true,
        showIf: (v) => !!SECTS[str(v, "religion")],
      },
      {
        kind: "text",
        name: "caste",
        label: "Community / caste",
        maxLength: 60,
        optional: true,
        hint: "Free text, so any community fits. Only shown to logged-in members.",
        showIf: (v) => !!v.religion && v.religion !== "NO_RELIGION",
      },
      {
        kind: "text",
        name: "subCaste",
        label: "Sub-community",
        maxLength: 60,
        optional: true,
        showIf: (v) => !!v.religion && v.religion !== "NO_RELIGION",
      },
      {
        kind: "text",
        name: "gotra",
        label: "Gotra / gothram",
        maxLength: 40,
        optional: true,
        showIf: (v) => v.religion === "HINDU" || v.religion === "JAIN" || v.religion === "SIKH",
      },
      { kind: "select", name: "motherTongue", label: "Mother tongue", options: MOTHER_TONGUES, placeholder: "Choose" },
      {
        kind: "chips",
        name: "knownLanguages",
        label: "Other languages you speak",
        options: MOTHER_TONGUES.slice(0, 23),
        max: 6,
        optional: true,
      },
      {
        kind: "toggle",
        name: "horoscope",
        label: "Add my horoscope details",
        description: "Optional. Manglik status, rashi, nakshatra, birth time and place. You can withdraw this any time.",
        consent: "horoscope",
      },
      { kind: "select", name: "manglik", label: "Manglik", options: MANGLIK, placeholder: "Choose", optional: true, showIf: (v) => v.horoscope === true },
      { kind: "select", name: "rashi", label: "Rashi (moon sign)", options: RASHI, placeholder: "Choose", optional: true, showIf: (v) => v.horoscope === true },
      { kind: "select", name: "nakshatra", label: "Nakshatra", options: NAKSHATRA, placeholder: "Choose", optional: true, showIf: (v) => v.horoscope === true },
      { kind: "time", name: "birthTime", label: "Time of birth", optional: true, showIf: (v) => v.horoscope === true },
      { kind: "text", name: "birthPlace", label: "Place of birth", maxLength: 80, optional: true, showIf: (v) => v.horoscope === true },
    ],
  },
  {
    id: "location",
    title: "Where you live",
    subtitle: "Members search by location. Only your city and state are shown, never an address.",
    fields: [
      { kind: "select", name: "country", label: "Country of residence", options: COUNTRIES },
      { kind: "select", name: "residencyStatus", label: "Residency status", options: RESIDENCY_STATUS },
      {
        kind: "select",
        name: "state",
        label: "State / Union Territory",
        options: STATES,
        placeholder: "Choose",
        showIf: (v) => v.country === "IN",
      },
      { kind: "text", name: "city", label: "City", maxLength: 60, autoComplete: "address-level2" },
    ],
  },
  {
    id: "career",
    title: "Education & work",
    subtitle: "A line or two is plenty.",
    fields: [
      { kind: "select", name: "education", label: "Highest education", options: EDUCATION, placeholder: "Choose" },
      { kind: "select", name: "educationField", label: "Field of study", options: EDUCATION_FIELD, placeholder: "Choose", optional: true },
      { kind: "text", name: "institution", label: "College / university", maxLength: 80, optional: true },
      { kind: "select", name: "occupationSector", label: "Work sector", options: OCCUPATION_SECTOR, placeholder: "Choose" },
      { kind: "text", name: "occupation", label: "Job title", maxLength: 80, optional: true },
      {
        kind: "select",
        name: "incomeBand",
        label: "Annual income",
        options: INCOME_BAND,
        placeholder: "Prefer not to say",
        optional: true,
        hint: "Shown only if you choose a range.",
      },
    ],
  },
  {
    id: "family",
    title: "Family & lifestyle",
    subtitle: "Helps members understand your day-to-day.",
    fields: [
      { kind: "select", name: "diet", label: "Diet", options: DIET, placeholder: "Choose" },
      { kind: "select", name: "smoking", label: "Smoking", options: HABIT, placeholder: "Prefer not to say", optional: true },
      { kind: "select", name: "drinking", label: "Drinking", options: HABIT, placeholder: "Prefer not to say", optional: true },
      { kind: "select", name: "familyType", label: "Family type", options: FAMILY_TYPE, placeholder: "Choose", optional: true },
      { kind: "select", name: "familyValues", label: "Family values", options: FAMILY_VALUES, placeholder: "Choose", optional: true },
      { kind: "text", name: "fatherOccupation", label: "Father's occupation", maxLength: 60, optional: true },
      { kind: "text", name: "motherOccupation", label: "Mother's occupation", maxLength: 60, optional: true },
      { kind: "select", name: "brothers", label: "Brothers", options: SIBLING_OPTIONS, placeholder: "Choose", optional: true },
      { kind: "select", name: "sisters", label: "Sisters", options: SIBLING_OPTIONS, placeholder: "Choose", optional: true },
    ],
  },
  {
    id: "about",
    title: "About you & your match",
    subtitle: "A few honest sentences work better than a long list.",
    fields: [
      {
        kind: "textarea",
        name: "about",
        label: "About me",
        maxLength: 1000,
        placeholder: "What you do, what your days look like, what matters to you.",
        hint: "Please don't include phone numbers, emails or social handles. Contact details stay private.",
      },
      { kind: "select", name: "ageMin", label: "Partner age from", options: AGE_OPTIONS, placeholder: "Any", optional: true },
      { kind: "select", name: "ageMax", label: "Partner age to", options: AGE_OPTIONS, placeholder: "Any", optional: true },
      { kind: "chips", name: "prefReligions", label: "Open to religions", options: RELIGIONS, optional: true, hint: "Leave empty for no preference." },
      { kind: "chips", name: "prefMarital", label: "Open to marital status", options: MARITAL_STATUS, optional: true },
      { kind: "chips", name: "prefDiets", label: "Diet", options: DIET, optional: true },
      { kind: "select", name: "prefManglik", label: "Manglik preference", options: MANGLIK_PREFERENCE },
      { kind: "toggle", name: "casteNoBar", label: "Caste / community no bar" },
      { kind: "textarea", name: "partnerAbout", label: "What you're looking for", maxLength: 500, optional: true },
    ],
  },
];

/* ---------------------------------------------------------------------------------------------- */
/* Validation                                                                                      */
/* ---------------------------------------------------------------------------------------------- */

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;
const empty = z.literal("");

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep this under ${max} characters.` })
    .transform((v) => (v === "" ? undefined : v));

const nameRequired = z
  .string()
  .trim()
  .min(1, { error: "Required." })
  .max(40, { error: "Keep this under 40 characters." })
  .regex(NAME_RE, { error: "Use letters only." });

const nameOptional = z
  .string()
  .trim()
  .max(40, { error: "Keep this under 40 characters." })
  .refine((v) => v === "" || NAME_RE.test(v), { error: "Use letters only." })
  .transform((v) => (v === "" ? undefined : v));

const pick = <T extends readonly Option[]>(opts: T, message = "Choose one.") =>
  z.enum(optionValues(opts), { error: message });
const pickOpt = <T extends readonly Option[]>(opts: T) =>
  z.union([empty, z.enum(optionValues(opts))]).transform((v) => (v === "" ? undefined : v));
const intOpt = (from: number, to: number) =>
  z
    .union([empty, z.string().regex(/^\d{1,3}$/)])
    .transform((v) => (v === "" ? undefined : Number(v)))
    .refine((v) => v === undefined || (v >= from && v <= to), { error: "Choose a value from the list." });

const heightValues = HEIGHTS.map((h) => h.value);
const bool = z.boolean().default(false);

const basics = z
  .object({
    profileFor: pick(PROFILE_FOR, "Choose who this profile is for."),
    onBehalfConfirm: bool,
    firstName: nameRequired,
    lastName: nameOptional,
    gender: pick(GENDERS),
    dateOfBirth: z.string().min(1, { error: "Enter the date of birth." }),
    maritalStatus: pick(MARITAL_STATUS),
    hasChildren: pickOpt(HAS_CHILDREN),
    heightCm: z
      .union([empty, z.string()])
      .transform((v) => (v === "" ? undefined : Number(v)))
      .refine((v) => v === undefined || heightValues.includes(String(v)), { error: "Choose a height from the list." }),
    physicalStatus: pickOpt(PHYSICAL_STATUS),
    disabilityConsent: bool,
    disabilityNote: text(200),
  })
  .superRefine((v, ctx) => {
    const dob = parseIsoDate(v.dateOfBirth);
    if (!dob) {
      ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Enter a valid date." });
    } else {
      const age = ageOn(dob);
      const min = minMarriageAge(v.gender);
      if (age > MAX_AGE || age < 0) {
        ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Enter a valid date." });
      } else if (age < ABSOLUTE_MIN_AGE) {
        ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "You must be 18 or older to use Saathi." });
      } else if (age < min) {
        ctx.addIssue({
          code: "custom",
          path: ["dateOfBirth"],
          message: `The legal minimum age to marry is ${min} for this profile. You can join once you turn ${min}.`,
        });
      }
    }
    if (v.profileFor !== "SELF" && !v.onBehalfConfirm) {
      ctx.addIssue({ code: "custom", path: ["onBehalfConfirm"], message: "Please confirm to continue." });
    }
    if (v.maritalStatus !== "NEVER_MARRIED" && !v.hasChildren) {
      ctx.addIssue({ code: "custom", path: ["hasChildren"], message: "Choose one." });
    }
    if (v.physicalStatus === "DISABILITY" && !v.disabilityConsent) {
      ctx.addIssue({
        code: "custom",
        path: ["disabilityConsent"],
        message: "Tick to confirm, or choose “Prefer not to say”.",
      });
    }
  });

const community = z
  .object({
    religion: pick(RELIGIONS),
    sect: pickOpt([...Object.values(SECTS).flat(), { value: "OTHER", label: "Other" }] as Option[]),
    caste: text(60),
    subCaste: text(60),
    gotra: text(40),
    motherTongue: pick(MOTHER_TONGUES),
    knownLanguages: z.array(z.enum(optionValues(MOTHER_TONGUES))).max(6, { error: "Choose up to 6." }).default([]),
    horoscope: bool,
    manglik: pickOpt(MANGLIK),
    rashi: pickOpt(RASHI),
    nakshatra: pickOpt(NAKSHATRA),
    birthTime: z
      .union([empty, z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Enter a valid time." })])
      .transform((v) => (v === "" ? undefined : v)),
    birthPlace: text(80),
  })
  .superRefine((v, ctx) => {
    if (v.sect && !(SECTS[v.religion] ?? []).some((s) => s.value === v.sect)) {
      ctx.addIssue({ code: "custom", path: ["sect"], message: "Choose a valid option." });
    }
  });

const location = z
  .object({
    country: pick(COUNTRIES),
    residencyStatus: pick(RESIDENCY_STATUS),
    state: pickOpt(STATES),
    city: z.string().trim().min(1, { error: "Required." }).max(60, { error: "Keep this under 60 characters." }),
  })
  .superRefine((v, ctx) => {
    if (v.country === "IN" && !v.state) {
      ctx.addIssue({ code: "custom", path: ["state"], message: "Choose your state." });
    }
    if (v.country !== "IN" && v.residencyStatus === "RESIDENT") {
      ctx.addIssue({
        code: "custom",
        path: ["residencyStatus"],
        message: "Living abroad? Choose NRI, OCI / PIO or Other.",
      });
    }
  });

const career = z.object({
  education: pick(EDUCATION),
  educationField: pickOpt(EDUCATION_FIELD),
  institution: text(80),
  occupationSector: pick(OCCUPATION_SECTOR),
  occupation: text(80),
  incomeBand: pickOpt(INCOME_BAND),
});

const family = z.object({
  diet: pick(DIET),
  smoking: pickOpt(HABIT),
  drinking: pickOpt(HABIT),
  familyType: pickOpt(FAMILY_TYPE),
  familyValues: pickOpt(FAMILY_VALUES),
  fatherOccupation: text(60),
  motherOccupation: text(60),
  brothers: intOpt(0, 10),
  sisters: intOpt(0, 10),
});

// Members must not paste contact details into free text: it defeats consent-based contact sharing.
const CONTACT_LIKE = /(\+?\d[\d\s-]{8,}\d)|([\w.+-]+@[\w-]+\.[\w.]+)|(https?:\/\/)|(@[\w.]{3,})/i;

const about = z
  .object({
    about: z
      .string()
      .trim()
      .min(20, { error: "Write at least a couple of sentences (20+ characters)." })
      .max(1000, { error: "Keep this under 1000 characters." })
      .refine((v) => !CONTACT_LIKE.test(v), { error: "Please remove phone numbers, emails, links and handles." }),
    ageMin: intOpt(ABSOLUTE_MIN_AGE, MAX_AGE),
    ageMax: intOpt(ABSOLUTE_MIN_AGE, MAX_AGE),
    prefReligions: z.array(z.enum(optionValues(RELIGIONS))).default([]),
    prefMarital: z.array(z.enum(optionValues(MARITAL_STATUS))).default([]),
    prefDiets: z.array(z.enum(optionValues(DIET))).default([]),
    prefManglik: pick(MANGLIK_PREFERENCE),
    casteNoBar: bool,
    partnerAbout: text(500),
  })
  .superRefine((v, ctx) => {
    if (v.ageMin !== undefined && v.ageMax !== undefined && v.ageMin > v.ageMax) {
      ctx.addIssue({ code: "custom", path: ["ageMax"], message: "Must be at least the minimum age." });
    }
    if (v.partnerAbout && CONTACT_LIKE.test(v.partnerAbout)) {
      ctx.addIssue({ code: "custom", path: ["partnerAbout"], message: "Please remove phone numbers, emails, links and handles." });
    }
  });

export const STEP_SCHEMAS = { basics, community, location, career, family, about } as const;

export type ParsedStep<S extends StepId> = z.output<(typeof STEP_SCHEMAS)[S]>;

export type FieldErrors = Record<string, string>;

export const stepById = (id: StepId) => STEPS.find((s) => s.id === id)!;

/**
 * Normalises raw form values for validation: fields that are hidden (or missing) get an empty default,
 * which also means un-ticking a toggle clears everything that depended on it.
 */
export function withDefaults(step: StepDef, values: Values): Values {
  const out: Values = {};
  for (const f of step.fields) {
    const visible = !f.showIf || f.showIf(values);
    const raw = values[f.name];
    if (f.kind === "chips") out[f.name] = visible && Array.isArray(raw) ? raw : [];
    else if (f.kind === "toggle") out[f.name] = visible && raw === true;
    else out[f.name] = visible && typeof raw === "string" ? raw : "";
  }
  return out;
}

/** Validates one step. Returns either typed data or a map of field name -> first error message. */
export function validateStep<S extends StepId>(
  id: S,
  values: Values,
): { ok: true; data: ParsedStep<S> } | { ok: false; errors: FieldErrors } {
  const schema = STEP_SCHEMAS[id] as unknown as z.ZodType<ParsedStep<S>>;
  const result = schema.safeParse(withDefaults(stepById(id), values));
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

export function visibleFields(step: StepDef, values: Values): FieldDef[] {
  return step.fields.filter((f) => !f.showIf || f.showIf(values));
}
