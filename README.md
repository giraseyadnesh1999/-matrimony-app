# Saathi — a private, minimal matrimony app for India

Next.js 16 (App Router) for both the UI and the backend, TypeScript, Tailwind CSS 4, Prisma. Sign up and log in with an
Indian mobile number, an email, Google or Facebook. Built around the Digital Personal Data Protection Act, 2023 (DPDP):
data is encrypted, consent is explicit and withdrawable, and every person can download, correct and erase their data.

> The brand name "Saathi" and the legal text are placeholders. See [docs/compliance.md](docs/compliance.md) for what
> still needs a lawyer or a business decision before launch.

## Quick start

```bash
npm install
npx prisma migrate dev     # creates prisma/dev.db (SQLite)
npm run seed               # optional: 40 demo members across Indian states, religions and languages
npm run dev                # http://localhost:3000
```

`.env` is already generated for local use (random encryption key and pepper). To recreate it, copy `.env.example` and fill
the secrets as described inside.

**Logging in during development.** No SMS or email is sent. The one-time code is printed in the terminal that runs
`npm run dev`, on a line like `[dev EMAIL] to=you@example.com  482913`. Sign in as any seeded member with
`demo1@demo.saathi.test` … `demo40@demo.saathi.test`.

If you run `npx prisma migrate dev` while a dev server is already running, restart the server so it loads the new
Prisma client.

## What is built

| Area | What you get |
| --- | --- |
| Sign up / log in | One field for mobile or email (auto-detected, `+91` default, international numbers accepted for NRIs). 6-digit OTP with auto-submit, paste and autofill support. Google and Facebook buttons appear once their keys are set. |
| Profile | 6-step wizard with instant validation, animated conditional fields, autosave per step, resume where you left off, edit any section later. |
| India-specific data | 36 states and UTs, 43 mother tongues (all 22 scheduled languages plus widely spoken others), 12 religions with sects, free-text caste / sub-caste / gotra, manglik / rashi / nakshatra, marital statuses including awaiting divorce and annulled, NRI / OCI / PIO, INR income bands, profile-for (parent, sibling, friend), disability-inclusive options. |
| Discovery | Filters by age, religion, language, state, marital status, diet, education. Defaults come from partner preferences. Results dim while reloading instead of flashing. |
| Interests | Send, withdraw, accept, decline. Mutual interest auto-connects. Declines are never revealed. Block and report. |
| Contact sharing | Phone or email is shown only after a mutual match **and** both people opted in. Every reveal is audit-logged. |
| Privacy centre | Per-purpose consents (off by default), pause profile, surname initial only, download my data (JSON), nominee, delete account with 7-day cooling-off, signed-in devices. |
| Legal | Privacy Notice, Terms, Grievance Officer page with a ticket form (24-hour acknowledgement, 15-day resolution). |
| Backend jobs | `/api/cron/retention` erases due accounts, warns inactive ones, clears expired OTPs and sessions. |

## How it is put together

```
src/
  app/
    (auth)/          login, signup, OTP form (server actions)
    (app)/           signed-in area: discover, interests, profile, settings
    (legal)/         privacy, terms, grievance
    onboarding/      profile wizard
    api/auth/[provider]/…   Google / Facebook OAuth start + callback (route handlers)
    api/me/export           data download (route handler)
    api/cron/retention      scheduled housekeeping (route handler, bearer secret)
  proxy.ts           per-request CSP nonce + optimistic login redirect (Next 16 "proxy", formerly middleware)
  server/            all business logic and database access (server-only)
  lib/               shared code: crypto, validation, India reference data, age rules
  components/ui/     small design system (button, field, switch, dialog, skeleton, …)
prisma/schema.prisma data model
e2e/smoke.mjs       browser test against a real dev server
scripts/seed.ts     demo data
```

Rules the code follows: pages and actions each check the session themselves (a layout alone is not a security
boundary); anything the browser sends is validated again on the server with the same zod schemas the browser used;
files under `src/server` import `server-only` so they can never be bundled for the client.

## Authentication design

- **OTP**: 6 digits from a CSPRNG, valid 5 minutes, 5 attempts, single use, only an HMAC of the code is stored.
- **Abuse limits**: 30 s resend cooldown, 5 codes per hour per number or email, 20 per hour per IP (needs `TRUST_PROXY=1`
  behind a proxy), and an app-wide daily SMS ceiling to stop SMS-pumping fraud.
- **No account enumeration**: logging in with an unknown address shows the same screens as a real one.
- **Sessions**: random 256-bit token in an `HttpOnly`, `SameSite=Lax`, `Secure` (production) cookie. The database stores
  only its SHA-256, 30-day absolute and 14-day idle lifetime, revocable per device.
- **Social login**: only the email scope is requested; provider tokens are discarded immediately. Google's verified email
  may link to an existing account; Facebook's never does. An account created with an unverified email cannot be logged
  into by OTP and is replaced when the real owner signs up, which blocks pre-account takeover.
- **Data at rest**: phone and email are AES-256-GCM encrypted and looked up through HMAC blind indexes. Losing
  `DATA_ENCRYPTION_KEY` makes those fields unrecoverable, so back it up in a secrets manager.

## Smooth interactions

Route-level skeletons match the real layout (no layout shift), links are prefetched, buttons show a spinner and lock
while an action runs, the interest button and consent switches update instantly and roll back on failure, filter changes
keep the old results on screen until the new ones arrive, steps and conditional fields animate, native selects and date
pickers are used for the best mobile experience, focus moves to each new step, and `prefers-reduced-motion` turns
animation off everywhere.

## Tests

```bash
npm run typecheck && npm run lint
npm test          # 88 unit and database tests (OTP, OAuth, validation, privacy, retention, interests)
npm run e2e       # 22 browser steps; see the header of e2e/smoke.mjs for the two-line setup
```

The browser test starts nothing itself. It expects a dev server on another port with its own database, so it never
touches your data.

## Before you go live

1. **Database**: switch `provider` in `prisma/schema.prisma` to `postgresql`, point `DATABASE_URL` at a managed
   PostgreSQL in an Indian region (AWS Mumbai / Hyderabad, Azure Central India, GCP Mumbai), then run
   `npx prisma migrate dev` once to create the PostgreSQL migration history and `npm run db:deploy` on each release.
2. **SMS**: register on TRAI DLT (entity, sender ID, OTP template), then set `SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY`,
   `MSG91_OTP_TEMPLATE_ID`. The MSG91 call follows their v5 OTP API but has not been run against a live account.
3. **Email**: set `EMAIL_PROVIDER=smtp` (for example AWS SES in `ap-south-1`) and a verified sender.
4. **Social login**: create OAuth clients and register `{APP_URL}/api/auth/google/callback` and
   `{APP_URL}/api/auth/facebook/callback`. Use the same host in `APP_URL` as users visit, or the state cookie will not match.
5. **Secrets and env**: generate fresh `DATA_ENCRYPTION_KEY`, `HASH_PEPPER`, `CRON_SECRET`. Set `LEGAL_*`, `GRIEVANCE_*`
   and `DPO_EMAIL` **at build time** (the legal pages are static). `TRUST_PROXY=1` behind Vercel, Nginx or an ALB.
   Production refuses to start with console OTP delivery or a non-HTTPS `APP_URL`.
6. **Scheduler**: call `GET /api/cron/retention` daily with `Authorization: Bearer $CRON_SECRET`.
7. **Legal review**: see [docs/compliance.md](docs/compliance.md).

## Not built yet

- **Photos.** The biggest matrimony feature and the biggest privacy risk. It needs object storage in India with signed,
  expiring URLs, per-photo visibility, moderation and EXIF stripping.
- Chat, notifications, payments, profile verification beyond OTP, an admin console for reports and grievance tickets
  (both are stored, there is no screen to work them).
- Hindi and other Indian-language UI (English only). The DPDP notice must be available in the 22 scheduled languages on request.
- Adding a phone number to an account created with Google, or an email to one created with a phone.
- Only Chromium has been tested. No load test or accessibility audit has been run.
- `npm audit` reports 3 high advisories in Prisma's CLI dependency chain (dev tooling only, not shipped to users).
