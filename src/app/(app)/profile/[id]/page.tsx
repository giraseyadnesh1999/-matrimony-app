import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { initials, labels, placeLabel } from "@/lib/display";
import { requireOnboarded } from "@/server/guards";
import { getVisibleProfile } from "@/server/matches";
import { rateLimit } from "@/server/rate-limit";
import { InterestButton } from "../../_components/interest-button";
import { ProfileSections } from "../../_components/profile-sections";
import { MemberActions } from "./_components/member-actions";

export const metadata: Metadata = { title: "Member profile" };

export default async function MemberPage({ params }: PageProps<"/profile/[id]">) {
  const { id } = await params;
  const { session, profile } = await requireOnboarded();

  // Slows profile scraping: a person browsing normally never comes near this.
  const limited = await rateLimit(`view:${session.user.id}`, 300, 3600);
  if (!limited.ok) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="font-display text-3xl">Slow down a little</h1>
        <p className="mt-2 text-sm text-muted">You&apos;ve viewed a lot of profiles in a short time. Please try again in a while.</p>
      </div>
    );
  }

  const view = await getVisibleProfile(profile, id);
  if (!view) notFound();
  const { profile: p, interest, preference } = view;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/discover"
        className="-ml-1 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Discover
      </Link>

      <header className="animate-fade-up flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-5">
          <div aria-hidden className="grid size-20 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-4xl text-accent">
            {initials(p.name)}
          </div>
          <div>
            <h1 className="font-display text-4xl leading-tight tracking-tight">{p.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {[`${p.age} yrs`, placeLabel(p), labels.religion(p.religion)].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <InterestButton userId={p.userId} initial={interest} name={p.name} size="lg" className="sm:min-w-44" />
      </header>

      <ProfileSections p={p} pref={preference} />

      <div className="flex justify-center border-t border-border pt-6">
        <MemberActions userId={p.userId} name={p.name} />
      </div>
    </div>
  );
}
