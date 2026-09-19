import type { Metadata } from "next";
import Link from "next/link";
import { legal } from "@/config/legal";
import { GRIEVANCE_ACK_HOURS, GRIEVANCE_RESOLVE_DAYS } from "@/config/site";
import { GrievanceForm } from "./_components/grievance-form";

export const metadata: Metadata = { title: "Grievance Officer" };

export default function GrievancePage() {
  return (
    <div className="animate-fade-up space-y-10">
      <header className="space-y-3">
        <h1 className="font-display text-5xl leading-tight tracking-tight">Grievance Officer</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Use this page to access, correct or erase your data, to question a consent, to report misuse of your data or a profile, or to
          make any other complaint. We acknowledge within {GRIEVANCE_ACK_HOURS} hours and resolve within {GRIEVANCE_RESOLVE_DAYS} days.
        </p>
      </header>

      <section aria-label="Officer details" className="rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed shadow-card sm:p-6">
        <p className="font-medium">{legal.grievanceName}</p>
        <p className="text-muted">Grievance Officer, {legal.entityName}</p>
        <p className="text-muted">{legal.entityAddress}</p>
        <p className="mt-2">
          <a className="underline underline-offset-2 hover:text-accent" href={`mailto:${legal.grievanceEmail}`}>
            {legal.grievanceEmail}
          </a>
        </p>
      </section>

      <GrievanceForm hours={GRIEVANCE_ACK_HOURS} days={GRIEVANCE_RESOLVE_DAYS} />

      <p className="text-xs leading-relaxed text-subtle">
        Signed-in members can also download, correct and delete their data directly in{" "}
        <Link href="/settings/privacy" className="underline underline-offset-2">Settings</Link>. If we do not resolve your complaint,
        you may approach the Data Protection Board of India.
      </p>
    </div>
  );
}
