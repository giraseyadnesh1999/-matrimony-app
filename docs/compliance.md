# Compliance map (India)

This maps Indian obligations to the code that implements them and to what you still have to do. It is an engineering
document, not legal advice. Have counsel confirm the current position, especially because the DPDP Rules are being
brought into force in phases and dates or thresholds may have changed since this was written.

Legend: **Built** = implemented and tested. **Partly** = implemented, needs configuration or a business decision.
**You** = cannot be done in code.

## Digital Personal Data Protection Act, 2023

| Obligation | How this app meets it | Where | Status |
| --- | --- | --- | --- |
| Notice before or at consent (s.5): what data, why, how to exercise rights, how to complain | Plain-language Privacy Notice with a per-purpose data table, retention table and rights. Linked from signup. Notice version is stored with every consent. | `src/app/(legal)/privacy`, `src/lib/consent.ts` | Partly: lawyer review; notice in 22 scheduled languages on request (s.5 / Rules) |
| Free, specific, informed, unconditional, unambiguous consent by clear affirmative action (s.6) | Unticked checkboxes. Core consent at signup; optional purposes (horoscope, disability, contact sharing, marketing) are separate and off by default. Nothing is bundled with the Terms. | `auth-form.tsx`, `src/lib/consent.ts` | Built |
| Consent is provable | Append-only ledger: purpose, granted or withdrawn, notice version, source, hashed IP, time. | `ConsentRecord`, `src/server/users.ts` | Built |
| Withdraw as easily as given (s.6(4)) | One switch in Settings. Withdrawing horoscope or disability consent deletes that data immediately; contact sharing stops instantly. | `src/server/privacy.ts` | Built |
| Purpose limitation and data minimisation (s.6, s.8) | No Aadhaar/PAN, no exact location, no contacts, no photos. Social login requests email only and discards provider tokens. Sensitive fields optional. Free text blocks phone/email/links so contact data cannot leak through bios. | `src/lib/onboarding/steps.ts`, `src/server/oauth.ts` | Built |
| Accuracy and completeness (s.8(3)) | Users edit any section at any time; validation on client and server. | onboarding wizard | Built |
| Reasonable security safeguards (s.8(5)) | AES-256-GCM for contact data, keyed hashes for OTPs, tokens and IPs, rate limits, nonce-based CSP, HSTS, secure cookies, per-request authorization, audit trail. | `src/lib/crypto.ts`, `src/proxy.ts`, `next.config.ts` | Partly: key management, DB encryption at rest, backups, access control are infrastructure |
| Personal data breach notice to the Board and affected people (s.8(6)) | No code path: it is a process. | none | You: write an incident runbook, name an owner, rehearse it |
| Erase when purpose is served or consent withdrawn (s.8(7)) | Account deletion with 7-day cooling-off then cascade erase; long-inactive accounts are warned and erased; expired OTPs, sessions, logs and old grievances are purged. Only a data-free erasure proof is kept. | `src/server/retention.ts`, `/api/cron/retention` | Partly: schedule the cron; phone-only inactive users need an SMS notice template |
| Children: no processing of under-18s, no verifiable-consent gap (s.9) | 18 is an absolute floor; men must be 21 and women 18 to be listed. Checked on client and server. Profiles created for someone else require an adult-consent confirmation, which is audit-logged. | `src/lib/age.ts`, `basics` step | Built |
| Right to access (s.11) | Download everything as JSON. Other members appear only as opaque ids. | `/api/me/export`, `src/server/privacy.ts` | Built |
| Right to correction and erasure (s.12) | Edit profile; delete account. | onboarding, settings | Built |
| Grievance redressal (s.13) and named contact (s.8(9)) | Grievance page with officer details, ticketed form, 24 h acknowledgement and 15-day resolution targets stored per ticket. | `src/app/(legal)/grievance`, `src/server/grievance.ts` | Partly: no admin screen to work tickets; set the real officer in `LEGAL_*` / `GRIEVANCE_*` |
| Right to nominate (s.14) | Nominee stored encrypted, editable in Settings. | settings | Built |
| Cross-border transfer (s.16) | Design assumes hosting in India; the notice says so. | infra | You: host in an Indian region and confirm processors' locations |
| Significant Data Fiduciary duties (DPO in India, DPIA, audit) if notified | None built. | none | You: decide whether you may be classed as one |
| Consent Manager registration | Not applicable unless you choose to use one. | none | You |
| Verifiable identity for erasure or access | Session-authenticated requests only. | none | You: define how email or phone-only grievance requests are verified |

## IT Act, 2000 and IT (Intermediary Guidelines) Rules, 2021

| Obligation | Status |
| --- | --- |
| Publish rules, privacy policy and terms; tell users not to host prohibited content | Terms page covers this. Lawyer review. |
| Grievance Officer named on the site, acknowledge within 24 hours, resolve within 15 days | Page and ticket deadlines built. Someone must actually respond. |
| Report and block tools | Built (report with reason, block). No moderation console yet. |
| Traceability, takedown on lawful orders | You: process and contact address. |
| CERT-In directions (incident reporting within 6 hours, system logs kept 180 days in India) | You: infrastructure logging and an incident contact. Application audit logs are kept 12 months. |

## Other Indian rules that affect a matrimony app

| Rule | How it shows up |
| --- | --- |
| Prohibition of Child Marriage Act, 2006 (21 for men, 18 for women) | Enforced at profile creation. Values live in `src/lib/age.ts` so an amendment is a one-line change. |
| TRAI DLT regulation for SMS | Required for the MSG91 sender ID and OTP template. Without it Indian SMS will not deliver. |
| Aadhaar Act / UIDAI restrictions on private use | Aadhaar is never requested or stored. Do not add it for verification without legal advice. |
| Rights of Persons with Disabilities Act, 2016 | Disability information is optional, consent-gated, and phrased inclusively. |
| Religion, caste and community data | Religion is required for matching; community is optional free text with "no bar" preference. Treat as sensitive: it is only shown to signed-in members and never exposed in cards' payloads. |
| Cookies | Only strictly necessary cookies are set, so no banner is needed. Adding analytics or ads would change this. |

## Decisions the code makes that you may want to change

- **Genders**: Woman, Man, Other. "Other" members see and are seen by everyone. Adjust `seekingGenders` in `src/server/matches.ts`.
- **Retention periods**: 7-day deletion grace, 3-year inactivity, 12-month audit logs, 3-year grievance records. All in `src/config/site.ts`.
- **Contact sharing** requires both people to opt in. This is stricter than most competitors by design.
- **Reports** about a member are deleted if that member is erased (cascade). If you need to keep evidence of abuse, move reports to a separate retained table under a lawful basis.
