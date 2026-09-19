import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { db } from "@/lib/db";
import { NOTICE_VERSION } from "@/lib/consent";
import { requireSession } from "@/server/session";
import { getNominee } from "@/server/privacy";
import { currentConsents } from "@/server/users";
import { ConsentToggles, DeleteAccount, NomineeForm, VisibilityToggles } from "../_components/privacy-controls";
import { UnblockButton } from "../_components/unblock-button";

export const metadata: Metadata = { title: "Privacy & data" };

export default async function PrivacySettingsPage() {
  const session = await requireSession();
  const userId = session.user.id;

  const [consents, profile, nominee, blocks] = await Promise.all([
    currentConsents(userId),
    db.profile.findUnique({ where: { userId }, select: { isHidden: true, hideLastName: true } }),
    getNominee(userId),
    db.block.findMany({
      where: { blockerId: userId },
      include: { blocked: { select: { id: true, profile: { select: { firstName: true } } } } },
    }),
  ]);
  const pending = session.user.status === "PENDING_DELETION";

  return (
    <div className="space-y-6">
      {profile && (
        <Section title="Visibility" id="visibility">
          <VisibilityToggles hidden={profile.isHidden} hideLastName={profile.hideLastName} />
        </Section>
      )}

      <Section
        id="consents"
        title="Your consents"
        note={`You decide what we may do with your data, and you can change your mind at any time. Every change is recorded. Privacy Notice version ${NOTICE_VERSION}.`}
      >
        <ConsentToggles initial={consents} />
      </Section>

      <Section title="Your data" id="data" note="You have the right to see, correct and take a copy of everything we hold about you.">
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/me/export"
            download
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border-strong bg-card px-5 text-[15px] font-medium transition-colors hover:bg-accent-soft active:scale-[0.98]"
          >
            <Download className="size-4" /> Download my data
          </a>
          <ButtonLink href="/onboarding" variant="secondary">Correct my profile</ButtonLink>
          <ButtonLink href="/grievance" variant="ghost">Raise a request or complaint</ButtonLink>
        </div>
      </Section>

      <Section
        title="Nominee"
        id="nominee"
        note="Under the DPDP Act you may nominate someone to exercise your data rights if you die or become unable to. They are contacted only for that."
      >
        <NomineeForm initial={nominee} />
      </Section>

      {blocks.length > 0 && (
        <Section title="Blocked members" id="blocked">
          <ul className="divide-y divide-border">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="text-sm">{b.blocked.profile?.firstName ?? "Member"}</span>
                <UnblockButton userId={b.blocked.id} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Delete account" id="delete" note="This withdraws your main consent. Everything is erased after a 7-day cooling-off period.">
        {pending ? (
          <p className="text-sm text-muted">
            Deletion is already scheduled. Use the banner at the top of the page to keep your account.
          </p>
        ) : (
          <DeleteAccount />
        )}
      </Section>

      <p className="pb-2 text-center text-xs text-subtle">
        Read the{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Privacy Notice
        </Link>{" "}
        or contact the{" "}
        <Link href="/grievance" className="underline underline-offset-2 hover:text-foreground">
          Grievance Officer
        </Link>
        .
      </p>
    </div>
  );
}

function Section({ title, id, note, children }: { title: string; id: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      {note ? <p className="mb-5 mt-1 text-sm leading-relaxed text-muted">{note}</p> : <div className="mb-5" />}
      {children}
    </section>
  );
}
