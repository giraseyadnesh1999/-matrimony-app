/**
 * Consent registry (DPDP Act 2023, s.6): consent must be free, specific, informed, unconditional,
 * unambiguous, given by clear affirmative action, and limited to the stated purpose. So every
 * purpose is listed separately, optional ones are never pre-ticked or bundled, and each can be
 * withdrawn as easily as it was given (Settings → Privacy).
 *
 * Bump NOTICE_VERSION whenever /privacy changes materially; records store the version the user saw.
 */
export const NOTICE_VERSION = "2026-09-01";

export type ConsentPurpose = "core_service" | "horoscope" | "health_disability" | "contact_sharing" | "marketing";

export const CONSENT_PURPOSES: Record<
  ConsentPurpose,
  { required: boolean; title: string; description: string; withdrawEffect: string }
> = {
  core_service: {
    required: true,
    title: "Create my account and profile",
    description:
      "We process the details you enter to run your account, show your profile to other members, suggest matches and let you exchange interests.",
    withdrawEffect: "Withdrawing this closes your account and erases your data after a 7-day cooling-off period.",
  },
  horoscope: {
    required: false,
    title: "Use my horoscope details",
    description: "Manglik status, rashi, nakshatra, birth time and place, shown on your profile and used for matching.",
    withdrawEffect: "Horoscope details are removed from your profile immediately.",
  },
  health_disability: {
    required: false,
    title: "Show disability information",
    description: "Any disability details you choose to add, shown on your profile so matches have full context.",
    withdrawEffect: "Disability details are removed from your profile immediately.",
  },
  contact_sharing: {
    required: false,
    title: "Share my contact after a mutual match",
    description:
      "When an interest is accepted, your verified phone or email is shown to that member only. Never before, never to anyone else.",
    withdrawEffect: "Your contact is no longer shown to any member.",
  },
  marketing: {
    required: false,
    title: "Send me tips and offers",
    description: "Occasional product updates and offers by email or SMS. Not needed to use Saathi.",
    withdrawEffect: "We stop sending promotional messages. Account and safety messages continue.",
  },
};

export const OPTIONAL_PURPOSES = (Object.keys(CONSENT_PURPOSES) as ConsentPurpose[]).filter(
  (p) => !CONSENT_PURPOSES[p].required,
);

/** Decisions captured on the signup form, before an account exists. */
export type SignupConsent = { core_service: true; marketing: boolean; ageConfirmed: true };
