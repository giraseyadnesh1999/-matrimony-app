/**
 * Public legal contact details shown on /privacy, /terms and /grievance.
 * Read straight from the environment (no secrets, no validation side effects) so these static pages
 * can be built without production credentials. Set the LEGAL_* / GRIEVANCE_* / DPO_* variables at build time.
 */
export const legal = {
  entityName: process.env.LEGAL_ENTITY_NAME ?? "Your Company Pvt. Ltd.",
  entityAddress: process.env.LEGAL_ENTITY_ADDRESS ?? "Registered office address, City, State, PIN",
  grievanceName: process.env.GRIEVANCE_OFFICER_NAME ?? "Name of Grievance Officer",
  grievanceEmail: process.env.GRIEVANCE_OFFICER_EMAIL ?? "grievance@example.com",
  dpoEmail: process.env.DPO_EMAIL ?? "privacy@example.com",
};
