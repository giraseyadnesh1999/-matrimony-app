import { describe, expect, it } from "vitest";
import { validateStep, type Values } from "./steps";

const yearsAgo = (n: number) => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - n);
  d.setUTCDate(d.getUTCDate() - 2); // comfortably past the birthday
  return d.toISOString().slice(0, 10);
};

const basics = (over: Values = {}): Values => ({
  profileFor: "SELF",
  firstName: "Aarav",
  gender: "MALE",
  dateOfBirth: yearsAgo(28),
  maritalStatus: "NEVER_MARRIED",
  ...over,
});

const errors = (r: ReturnType<typeof validateStep>) => (r.ok ? {} : r.errors);

describe("basics", () => {
  it("accepts a normal profile and fills optional fields with undefined", () => {
    const r = validateStep("basics", basics());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toMatchObject({ firstName: "Aarav", lastName: undefined, heightCm: undefined });
  });

  it("enforces 21 for men and 18 for women", () => {
    expect(errors(validateStep("basics", basics({ gender: "MALE", dateOfBirth: yearsAgo(20) })))).toHaveProperty("dateOfBirth");
    expect(validateStep("basics", basics({ gender: "MALE", dateOfBirth: yearsAgo(21) })).ok).toBe(true);
    expect(validateStep("basics", basics({ gender: "FEMALE", dateOfBirth: yearsAgo(18) })).ok).toBe(true);
  });

  it("never allows under-18s, for any gender (DPDP child threshold)", () => {
    for (const gender of ["FEMALE", "MALE", "OTHER"]) {
      const e = errors(validateStep("basics", basics({ gender, dateOfBirth: yearsAgo(17) })));
      expect(e.dateOfBirth).toMatch(/18/);
    }
  });

  it("rejects impossible or absurd dates", () => {
    expect(errors(validateStep("basics", basics({ dateOfBirth: "2023-02-30" })))).toHaveProperty("dateOfBirth");
    expect(errors(validateStep("basics", basics({ dateOfBirth: yearsAgo(120) })))).toHaveProperty("dateOfBirth");
  });

  it("requires the adult-consent confirmation for profiles made on someone's behalf", () => {
    expect(errors(validateStep("basics", basics({ profileFor: "DAUGHTER", gender: "FEMALE" })))).toHaveProperty("onBehalfConfirm");
    expect(validateStep("basics", basics({ profileFor: "DAUGHTER", gender: "FEMALE", onBehalfConfirm: true })).ok).toBe(true);
  });

  it("asks about children only for previously married people", () => {
    expect(errors(validateStep("basics", basics({ maritalStatus: "DIVORCED" })))).toHaveProperty("hasChildren");
    expect(validateStep("basics", basics({ maritalStatus: "DIVORCED", hasChildren: "NO" })).ok).toBe(true);
  });

  it("stores disability only with explicit consent", () => {
    expect(errors(validateStep("basics", basics({ physicalStatus: "DISABILITY" })))).toHaveProperty("disabilityConsent");
    const ok = validateStep("basics", basics({ physicalStatus: "DISABILITY", disabilityConsent: true, disabilityNote: "Uses a wheelchair" }));
    expect(ok.ok).toBe(true);
  });

  it("drops the disability note when the consent box is hidden or cleared", () => {
    const r = validateStep("basics", basics({ physicalStatus: "NORMAL", disabilityConsent: true, disabilityNote: "stale" }));
    expect(r.ok && r.data.disabilityNote).toBeFalsy();
  });

  it("accepts names in Indian scripts and rejects digits/symbols", () => {
    expect(validateStep("basics", basics({ firstName: "प्रिया" })).ok).toBe(true);
    expect(validateStep("basics", basics({ firstName: "Anne-Marie D'Souza" })).ok).toBe(true);
    expect(errors(validateStep("basics", basics({ firstName: "R2D2" })))).toHaveProperty("firstName");
    expect(errors(validateStep("basics", basics({ firstName: "<script>" })))).toHaveProperty("firstName");
  });
});

describe("community", () => {
  const base: Values = { religion: "HINDU", motherTongue: "MARATHI" };

  it("requires religion and mother tongue only", () => {
    expect(validateStep("community", base).ok).toBe(true);
    expect(Object.keys(errors(validateStep("community", {})))).toEqual(["religion", "motherTongue"]);
  });

  it("validates sect against the chosen religion", () => {
    expect(validateStep("community", { ...base, sect: "VAISHNAV" }).ok).toBe(true);
    expect(errors(validateStep("community", { ...base, sect: "SUNNI" }))).toHaveProperty("sect");
  });

  it("clears horoscope data when the toggle is off", () => {
    const r = validateStep("community", { ...base, horoscope: false, rashi: "MESHA", birthPlace: "Pune" });
    expect(r.ok && r.data.rashi).toBeUndefined();
    expect(r.ok && r.data.birthPlace).toBeUndefined();
    const on = validateStep("community", { ...base, horoscope: true, rashi: "MESHA", birthTime: "06:45", birthPlace: "Pune" });
    expect(on.ok && on.data.rashi).toBe("MESHA");
  });

  it("caps known languages at 6", () => {
    const many = ["HINDI", "TAMIL", "TELUGU", "BENGALI", "URDU", "ENGLISH", "MARATHI"];
    expect(errors(validateStep("community", { ...base, knownLanguages: many }))).toHaveProperty("knownLanguages");
  });
});

describe("location", () => {
  it("needs a state for India and forbids 'resident' abroad", () => {
    expect(errors(validateStep("location", { country: "IN", residencyStatus: "RESIDENT", city: "Pune" }))).toHaveProperty("state");
    expect(validateStep("location", { country: "IN", residencyStatus: "RESIDENT", state: "MH", city: "Pune" }).ok).toBe(true);
    expect(errors(validateStep("location", { country: "US", residencyStatus: "RESIDENT", city: "Austin" }))).toHaveProperty("residencyStatus");
    expect(validateStep("location", { country: "US", residencyStatus: "NRI", city: "Austin" }).ok).toBe(true);
  });
});

describe("about", () => {
  const base: Values = { about: "I work in healthcare and love long walks and cooking for friends.", prefManglik: "ANY" };

  it("blocks contact details in free text", () => {
    for (const bad of [
      "Call me on 9876543210 any time please",
      "Reach me at asha@example.com for more about me",
      "Find me on https://instagram.com/asha for more",
      "My handle is @asha_k on that app, message me",
    ]) {
      expect(errors(validateStep("about", { ...base, about: bad })), bad).toHaveProperty("about");
    }
    expect(validateStep("about", base).ok).toBe(true);
  });

  it("checks the partner age range", () => {
    expect(errors(validateStep("about", { ...base, ageMin: "30", ageMax: "25" }))).toHaveProperty("ageMax");
    const ok = validateStep("about", { ...base, ageMin: "25", ageMax: "30" });
    expect(ok.ok && [ok.data.ageMin, ok.data.ageMax]).toEqual([25, 30]);
    expect(errors(validateStep("about", { ...base, ageMin: "16" }))).toHaveProperty("ageMin");
  });
});
