import { describe, expect, it } from "vitest";
import { ageOn, dobRangeForAges, minMarriageAge, parseIsoDate } from "./age";

const utc = (s: string) => new Date(`${s}T00:00:00Z`);

describe("ageOn", () => {
  it("is exact around the birthday", () => {
    expect(ageOn(utc("2000-06-15"), utc("2026-06-14"))).toBe(25);
    expect(ageOn(utc("2000-06-15"), utc("2026-06-15"))).toBe(26);
    expect(ageOn(utc("2000-06-15"), utc("2026-06-16"))).toBe(26);
  });
  it("handles leap-day birthdays", () => {
    expect(ageOn(utc("2004-02-29"), utc("2026-02-28"))).toBe(21);
    expect(ageOn(utc("2004-02-29"), utc("2026-03-01"))).toBe(22);
  });
});

describe("minMarriageAge", () => {
  it("is 21 for men and 18 otherwise (never below 18)", () => {
    expect(minMarriageAge("MALE")).toBe(21);
    expect(minMarriageAge("FEMALE")).toBe(18);
    expect(minMarriageAge("OTHER")).toBe(18);
    expect(minMarriageAge(undefined)).toBe(18);
  });
});

describe("parseIsoDate", () => {
  it("accepts real dates and rejects impossible ones", () => {
    expect(parseIsoDate("1995-08-20")).toEqual(utc("1995-08-20"));
    expect(parseIsoDate("2023-02-29")).toBeNull();
    expect(parseIsoDate("1995-13-01")).toBeNull();
    expect(parseIsoDate("20-08-1995")).toBeNull();
  });
});

describe("dobRangeForAges", () => {
  it("returns a range whose members are exactly within the age band", () => {
    const today = utc("2026-09-19");
    const { gte, lte } = dobRangeForAges(25, 30, today);
    expect(ageOn(lte, today)).toBe(25);
    expect(ageOn(new Date(lte.getTime() + 86_400_000), today)).toBe(24);
    expect(ageOn(gte, today)).toBe(30);
    expect(ageOn(new Date(gte.getTime() - 86_400_000), today)).toBe(31);
  });
});
