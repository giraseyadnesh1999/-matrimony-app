import type { Metadata } from "next";
import Link from "next/link";
import { NOTICE_VERSION } from "@/lib/consent";
import { legal } from "@/config/legal";
import { AUDIT_RETENTION_DAYS, DELETION_GRACE_DAYS, INACTIVITY_DAYS } from "@/config/site";
import { Prose, Table } from "../_components/prose";

export const metadata: Metadata = { title: "Privacy Notice" };

/*
  TODO(legal): This notice describes what the software actually does, written to follow the Digital Personal
  Data Protection Act, 2023 (notice, consent, rights, grievance) and the IT Act / IT Rules 2021. Have counsel
  review it against your final vendors, hosting region and business terms before launch, and keep it in sync
  with NOTICE_VERSION in src/lib/consent.ts (bump the version on every material change).
*/
export default function PrivacyPage() {
  return (
    <Prose title="Privacy Notice" updated={`Version ${NOTICE_VERSION}`}>
      <section>
        <h2>The short version</h2>
        <ul>
          <li>We collect only what a matrimony service needs, and we tell you why for each item.</li>
          <li>Your phone number and email are stored encrypted. Other members never see them unless you both agree.</li>
          <li>You choose every optional use of your data, and you can withdraw it as easily as you gave it.</li>
          <li>You can download everything we hold, correct it, or erase it, from Settings.</li>
          <li>We do not sell your data, show ads, or use tracking cookies.</li>
        </ul>
      </section>

      <section>
        <h2>Who is responsible</h2>
        <p>
          <strong>{legal.entityName}</strong> (&ldquo;Saathi&rdquo;, &ldquo;we&rdquo;) decides why and how your personal data is
          processed. We are the &ldquo;Data Fiduciary&rdquo; under the Digital Personal Data Protection Act, 2023 (the &ldquo;DPDP
          Act&rdquo;). Our address is {legal.entityAddress}.
        </p>
        <p>
          Privacy contact: <a href={`mailto:${legal.dpoEmail}`}>{legal.dpoEmail}</a>. Grievance Officer: {legal.grievanceName},{" "}
          <a href={`mailto:${legal.grievanceEmail}`}>{legal.grievanceEmail}</a>. See{" "}
          <Link href="/grievance">Grievance Officer</Link>.
        </p>
      </section>

      <section>
        <h2>What we collect and why</h2>
        <p>Each row is a separate purpose. We use the data only for that purpose.</p>
        <Table
          head={["Data", "Why we need it", "Who can see it"]}
          rows={[
            ["Mobile number or email", "To create your account, send one-time codes and keep it secure.", "Only you. Shared with a matched member only if you and they both turn on contact sharing."],
            ["Name, date of birth, gender, marital status", "To build your profile and confirm you are old enough to marry. Others see your age, never your date of birth.", "Logged-in members (first name and surname initial by default)."],
            ["Religion, community, language, location, education, work, family, lifestyle", "To help you find and be found by compatible people.", "Logged-in members, as shown on your profile. Community/caste is optional free text."],
            ["Income range (optional)", "Shown only if you choose a range.", "Logged-in members, only if you fill it in."],
            ["Horoscope details (optional)", "Manglik, rashi, nakshatra, birth time and place, for matching.", "Members who view your profile, only while you keep this consent on."],
            ["Disability information (optional)", "So matches have full context, if you choose to share it.", "Members who view your profile, only while you keep this consent on."],
            ["Partner preferences", "To suggest relevant profiles.", "Shown on your profile."],
            ["Sign-in and security records", "Keyed hashes of IP address, device type, timestamps and actions, to detect abuse and show you where you're signed in.", "Only you (device list) and our security team."],
            ["Complaints and reports", "To investigate reports of misuse and answer your requests.", "Our grievance and safety team."],
          ]}
        />
        <p className="mt-4">
          <strong>We do not collect</strong> Aadhaar, PAN or other ID documents, your exact location, your phone contacts, your social
          media friends or photos from your device. If you sign in with Google or Facebook we request only your email address, and we
          discard the provider&apos;s access token immediately.
        </p>
      </section>

      <section>
        <h2>Your consent</h2>
        <p>
          We process your data on the basis of your consent, which you give by an explicit action when you join and for each optional
          purpose. Optional consents are never pre-ticked or bundled with the Terms. Every consent you give or withdraw is recorded
          with the date and the version of this notice you saw. Manage them in{" "}
          <Link href="/settings/privacy#consents">Settings &rsaquo; Privacy &amp; data</Link>.
        </p>
        <p>
          We may also process data without new consent where the law allows, for example to comply with a court order or legal
          obligation, to respond to your own requests, or to protect people from fraud and harm.
        </p>
      </section>

      <section>
        <h2>Who we share data with</h2>
        <ul>
          <li><strong>Other members:</strong> only what appears on your profile, as described above.</li>
          <li>
            <strong>Service providers (data processors)</strong> that act on our instructions: cloud hosting in India, an SMS gateway
            to deliver codes, an email relay, and, if you choose social login, Google or Facebook. They may not use your data for their
            own purposes.
          </li>
          <li><strong>Authorities</strong> when required by law, limited to what is legally required.</li>
        </ul>
        <p>We never sell or rent personal data, and we run no advertising or third-party analytics.</p>
      </section>

      <section>
        <h2>How we protect it</h2>
        <ul>
          <li>Phone numbers, emails and nominee details are encrypted with AES-256 before storage. Lookups use a keyed hash, not the raw value.</li>
          <li>One-time codes, session tokens and IP addresses are stored only as keyed hashes. Codes expire in 5 minutes and allow 5 attempts.</li>
          <li>Connections use HTTPS. Sessions use secure, HTTP-only cookies. Sign-in attempts are rate-limited.</li>
          <li>Sensitive optional details (horoscope, disability) are hidden from everyone the moment you withdraw consent.</li>
          <li>We limit staff access and keep an audit trail of sensitive actions. If a personal data breach occurs, we will notify the Data Protection Board of India and affected people as the law requires.</li>
        </ul>
      </section>

      <section>
        <h2>How long we keep it</h2>
        <Table
          head={["Data", "Kept for"]}
          rows={[
            ["Account and profile", "Until you delete your account."],
            ["After you ask us to delete", `Hidden immediately, permanently erased after ${DELETION_GRACE_DAYS} days. You can cancel by logging in during that time.`],
            ["Unused accounts", `If you do not log in for ${Math.round(INACTIVITY_DAYS / 365)} years we email you and then erase the account.`],
            ["Security and audit records", `Up to ${Math.round(AUDIT_RETENTION_DAYS / 30)} months, then deleted.`],
            ["One-time codes and expired sessions", "Deleted shortly after they expire."],
            ["Complaints and grievance records", "Up to 3 years, as records of how we handled your request."],
            ["Proof that we erased your data", "A record containing no personal data (only a keyed hash of an internal id and a date)."],
          ]}
        />
      </section>

      <section>
        <h2>Your rights</h2>
        <p>Under the DPDP Act you have the right to:</p>
        <ul>
          <li><strong>Access</strong> a summary of your data and who it is shared with. Download it any time in Settings.</li>
          <li><strong>Correct and complete</strong> your data by editing your profile.</li>
          <li><strong>Erase</strong> your data by deleting your account in Settings.</li>
          <li><strong>Withdraw consent</strong> for any optional purpose in Settings, as easily as you gave it.</li>
          <li><strong>Grievance redressal</strong>: contact our <Link href="/grievance">Grievance Officer</Link>. We acknowledge within 24 hours and resolve within 15 days.</li>
          <li><strong>Nominate</strong> a person to exercise your rights if you die or cannot act. Add one in Settings.</li>
        </ul>
        <p>
          If you are not satisfied with our response, you may complain to the Data Protection Board of India, after first using our
          grievance process.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          Saathi is only for adults. You must be at least 18, and to be listed you must meet the legal minimum age to marry (21 for
          men, 18 for women). If we learn that someone under 18 has an account, we delete it. If you create a profile for a family
          member, you must confirm that they are an adult and have agreed.
        </p>
      </section>

      <section>
        <h2>Where your data is stored</h2>
        <p>
          We host on servers in India. Where a provider processes data elsewhere, we do so only in line with the DPDP Act and any
          restrictions the Government of India notifies.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          We use only strictly necessary cookies: one to keep you signed in, and short-lived ones while you sign in with Google or
          Facebook. We use no analytics, advertising or tracking cookies, so there is no cookie banner to click through.
        </p>
      </section>

      <section>
        <h2>Language</h2>
        <p>
          This notice is in English. You may ask for it in any of the 22 languages listed in the Eighth Schedule to the Constitution
          of India by writing to <a href={`mailto:${legal.dpoEmail}`}>{legal.dpoEmail}</a>.
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If we change this notice in a way that affects how we use your data, we will tell you and, where needed, ask for your consent
          again. The version at the top shows which one applies.
        </p>
      </section>
    </Prose>
  );
}
