import Link from "next/link";
import { GraduationCap, MapPin, MessageCircle } from "lucide-react";
import { heightLabel, initials, labels, placeLabel } from "@/lib/display";
import { DIET, labelOf } from "@/lib/reference";
import type { DiscoverCard } from "@/server/matches";
import { InterestButton } from "./interest-button";

/**
 * Server-rendered card. Only the member id and interest state cross into the client (for the button),
 * so the rest of the profile never travels to the browser inside a component payload.
 */
export function ProfileCard({ p }: { p: DiscoverCard }) {
  const community = [labels.religion(p.religion), p.caste].filter(Boolean).join(" · ");
  const work = [p.occupation || labels.sector(p.occupationSector), labels.income(p.incomeBand)].filter(Boolean).join(" · ");
  const basics = [`${p.age} yrs`, heightLabel(p.heightCm), labels.marital(p.maritalStatus)].filter(Boolean).join(" · ");

  return (
    <article className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong">
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-2xl text-accent"
        >
          {initials(p.name)}
        </div>
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl leading-tight">
            {/* Stretched link: the whole card is clickable, while the button below stays independent. */}
            <Link
              href={`/profile/${p.userId}`}
              className="after:absolute after:inset-0 after:z-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-accent"
            >
              {p.name}
            </Link>
          </h2>
          <p className="mt-0.5 text-sm text-muted">{basics}</p>
        </div>
      </div>

      <dl className="mt-5 space-y-2 text-sm">
        <Row icon={<MapPin className="size-4" />} text={placeLabel(p)} />
        <Row icon={<GraduationCap className="size-4" />} text={[labels.education(p.education), work].filter(Boolean).join(" · ")} />
        <Row
          icon={<MessageCircle className="size-4" />}
          text={[labels.motherTongue(p.motherTongue), community, p.diet ? labelOf(DIET, p.diet) : ""].filter(Boolean).join(" · ")}
        />
      </dl>

      <div className="relative z-10 mt-5">
        <InterestButton userId={p.userId} initial={p.interest} name={p.name} className="w-full" />
      </div>
    </article>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  if (!text) return null;
  return (
    <div className="flex items-start gap-2.5 text-muted">
      <span aria-hidden className="mt-0.5 shrink-0 text-subtle">
        {icon}
      </span>
      <dd className="leading-snug">{text}</dd>
    </div>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card" aria-hidden>
      <div className="flex items-start gap-4">
        <div className="skeleton size-14 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="skeleton h-6 w-2/3" />
          <div className="skeleton h-4 w-full" />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-2/3" />
      </div>
      <div className="skeleton mt-5 h-11 w-full rounded-xl" />
    </div>
  );
}
