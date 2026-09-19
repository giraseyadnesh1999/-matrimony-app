import type { Metadata } from "next";
import Link from "next/link";
import { EyeOff, Pencil } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/db";
import { initials, labels, placeLabel } from "@/lib/display";
import { requireOnboarded } from "@/server/guards";
import { toPublic } from "@/server/matches";
import { currentConsents } from "@/server/users";
import { ProfileSections } from "../_components/profile-sections";

export const metadata: Metadata = { title: "Your profile" };

export default async function MyProfilePage() {
  const { session, profile } = await requireOnboarded();
  const [consents, pref] = await Promise.all([
    currentConsents(session.user.id),
    db.partnerPreference.findUnique({ where: { userId: session.user.id } }),
  ]);
  const p = toPublic({ ...profile, hideLastName: profile.hideLastName }, consents);

  const preference = pref
    ? {
        ageMin: pref.ageMin,
        ageMax: pref.ageMax,
        religions: (pref.religions as string[] | null) ?? [],
        maritalStatuses: (pref.maritalStatuses as string[] | null) ?? [],
        diets: (pref.diets as string[] | null) ?? [],
        manglik: pref.manglik,
        casteNoBar: pref.casteNoBar,
        about: pref.about,
      }
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {profile.isHidden && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-border bg-accent-soft px-4 py-3 text-sm">
          <EyeOff className="size-4 shrink-0 text-accent" />
          <p>
            Your profile is hidden. Nobody can find or message you.{" "}
            <Link href="/settings/privacy" className="font-medium underline underline-offset-2">
              Change visibility
            </Link>
          </p>
        </div>
      )}

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
        <ButtonLink href="/onboarding" variant="secondary">
          <Pencil className="size-4" /> Edit profile
        </ButtonLink>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="mb-3 flex items-baseline justify-between text-sm">
          <h2 className="font-medium">Profile strength</h2>
          <span className="tabular-nums text-muted">{profile.completeness}%</span>
        </div>
        <Progress value={profile.completeness} max={100} label="Profile strength" />
        <p className="mt-3 text-xs leading-relaxed text-muted">
          A fuller profile is easier to match. Below is exactly what other members see. Your date of birth, phone and email are never shown.
        </p>
      </section>

      <ProfileSections p={p} pref={preference} editStepBase="/onboarding" />
    </div>
  );
}
