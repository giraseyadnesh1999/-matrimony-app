import type { Metadata } from "next";
import Link from "next/link";
import { legal } from "@/config/legal";
import { Prose } from "../_components/prose";

export const metadata: Metadata = { title: "Terms of Use" };

/*
  TODO(legal): Template terms for a matrimony intermediary in India. Have counsel adapt them (governing law
  venue, liability caps, paid features, refund policy, IT Rules 2021 intermediary due-diligence text) before launch.
*/
export default function TermsPage() {
  return (
    <Prose title="Terms of Use" updated="Version 2026-09-01">
      <section>
        <h2>Using Saathi</h2>
        <p>
          Saathi, run by {legal.entityName}, is an online service that helps adults introduce themselves to one another with
          marriage in mind. By creating an account you agree to these terms and to our <Link href="/privacy">Privacy Notice</Link>.
        </p>
      </section>

      <section>
        <h2>Who can join</h2>
        <ul>
          <li>You must be at least 18, and at least the legal minimum age to marry in India (21 for men, 18 for women).</li>
          <li>You must be legally free to marry under the law that applies to you.</li>
          <li>You may create a profile for a family member only if they are an adult and have agreed.</li>
          <li>One person, one profile. Do not create accounts for people who do not know about them.</li>
        </ul>
      </section>

      <section>
        <h2>Be honest</h2>
        <ul>
          <li>Give true information, including your marital status and any children.</li>
          <li>Do not impersonate anyone or use another person&apos;s details.</li>
          <li>Do not ask other members for money, gifts or financial information. Report anyone who does.</li>
          <li>Do not put phone numbers, emails, links or social handles in profile text. Use the contact-sharing setting after a mutual match.</li>
        </ul>
      </section>

      <section>
        <h2>Respect others</h2>
        <p>
          No harassment, threats, hate, discrimination in abusive form, sexual content, spam, scraping or automated access. Do not
          copy, share or publish other members&apos; profile information. Breaking these rules can lead to removal.
        </p>
      </section>

      <section>
        <h2>Staying safe</h2>
        <ul>
          <li>Meet in a public place first and tell someone you trust where you are going.</li>
          <li>Verify what people tell you, including their identity, job, marital status and family, before making any commitment.</li>
          <li>Never send money to someone you have not met. Block and report anything that feels wrong.</li>
        </ul>
        <p>
          We provide tools to block and report, and we review reports. We cannot guarantee any member&apos;s identity or intentions, and
          Saathi does not arrange marriages or act as a party to any arrangement between members.
        </p>
      </section>

      <section>
        <h2>Your content and data</h2>
        <p>
          You own what you write. You allow us to display it to other members as you have configured, so we can run the service.
          Personal data is handled as described in the Privacy Notice, and you can delete your account at any time.
        </p>
      </section>

      <section>
        <h2>Our role and limits</h2>
        <p>
          We act as an intermediary: members create the content. We may remove content or accounts that break these terms or the law,
          and we will act on lawful government or court orders. The service is provided as is. To the extent the law allows, we are not
          liable for what members say or do, or for outcomes of introductions.
        </p>
      </section>

      <section>
        <h2>Complaints</h2>
        <p>
          Write to our <Link href="/grievance">Grievance Officer</Link>. We acknowledge within 24 hours and resolve within 15 days.
        </p>
      </section>

      <section>
        <h2>Law</h2>
        <p>These terms are governed by the laws of India. Courts at the location of our registered office have jurisdiction, subject to any rights you have as a consumer.</p>
      </section>
    </Prose>
  );
}
