export const SITE = {
  name: "Saathi",
  tagline: "Marriage, minus the noise.",
  description:
    "A calm, private matrimony service for India and the Indian diaspora. Your data stays yours: encrypted, consent-led, and erasable.",
} as const;

/** Grievance timelines: IT Rules 2021 r.3(2)(a) - acknowledge in 24 hours, resolve within 15 days. */
export const GRIEVANCE_ACK_HOURS = 24;
export const GRIEVANCE_RESOLVE_DAYS = 15;

/** Cooling-off period before an account and its data are permanently erased. */
export const DELETION_GRACE_DAYS = 7;

/** Unused accounts are warned and then erased after this long (data-minimisation / storage limitation). */
export const INACTIVITY_DAYS = 3 * 365;

/** Security/audit entries are kept for one year, then deleted. Stated in the Privacy Notice. */
export const AUDIT_RETENTION_DAYS = 365;

/** Grievance records are kept as proof of how a request was handled, then deleted. */
export const GRIEVANCE_RETENTION_DAYS = 3 * 365;
