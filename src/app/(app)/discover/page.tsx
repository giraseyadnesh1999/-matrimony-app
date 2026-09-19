import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireOnboarded } from "@/server/guards";
import { discover, parseFilters } from "@/server/matches";
import { ProfileCard } from "../_components/profile-card";
import { Filters } from "./_components/filters";
import { FilterShell, PendingBar, ResultsDim } from "./_components/filter-shell";

export const metadata: Metadata = { title: "Discover" };

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const { session, profile } = await requireOnboarded();
  const sp = await searchParams;

  const filters = parseFilters(sp);
  // First visit: start from the partner preferences the person set. Once they touch the age filter
  // (even to choose "Any") their explicit choice wins.
  if (!("ageMin" in sp) && !("ageMax" in sp)) {
    const pref = await db.partnerPreference.findUnique({ where: { userId: session.user.id } });
    filters.ageMin = pref?.ageMin ?? undefined;
    filters.ageMax = pref?.ageMax ?? undefined;
  }

  const { items, total, pages } = await discover(profile, filters);
  const page = Math.min(filters.page, pages);

  const effective: Record<string, string> = {
    ageMin: filters.ageMin ? String(filters.ageMin) : "",
    ageMax: filters.ageMax ? String(filters.ageMax) : "",
    religion: filters.religion ?? "",
    motherTongue: filters.motherTongue ?? "",
    state: filters.state ?? "",
    maritalStatus: filters.maritalStatus ?? "",
    diet: filters.diet ?? "",
    education: filters.education ?? "",
  };

  return (
    <FilterShell>
      <div className="space-y-6">
        <header className="flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-4xl leading-tight tracking-tight">Discover</h1>
            <p className="text-sm text-muted" aria-live="polite">
              {total === 0 ? "No members match right now" : `${total.toLocaleString("en-IN")} ${total === 1 ? "member" : "members"}`}
            </p>
          </div>
        </header>

        <Filters effective={effective} />
        <PendingBar />

        <ResultsDim>
          {items.length === 0 ? (
            <Empty filtered={Object.values(effective).some(Boolean)} />
          ) : (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((p, i) => (
                  <li key={p.userId} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                    <ProfileCard p={p} />
                  </li>
                ))}
              </ul>
              {pages > 1 && <Pagination page={page} pages={pages} sp={sp} />}
            </>
          )}
        </ResultsDim>
      </div>
    </FilterShell>
  );
}

function Empty({ filtered }: { filtered: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong px-6 py-16 text-center">
      <p className="font-display text-2xl">{filtered ? "Nobody matches these filters" : "You're early"}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
        {filtered
          ? "Try widening the age range or removing a filter."
          : "New members join every day. Check back soon, and complete your profile to be easier to find."}
      </p>
      {filtered && (
        <Link href="/discover?ageMin=any&ageMax=any" className={buttonClass({ variant: "secondary", className: "mt-6" })}>
          Clear filters
        </Link>
      )}
    </div>
  );
}

function Pagination({ page, pages, sp }: { page: number; pages: number; sp: Record<string, string | string[] | undefined> }) {
  const href = (n: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (k !== "page" && typeof v === "string") q.set(k, v);
    if (n > 1) q.set("page", String(n));
    return `/discover${q.size ? `?${q}` : ""}`;
  };
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between">
      {page > 1 ? (
        <Link href={href(page - 1)} className={buttonClass({ variant: "secondary" })} scroll>
          <ArrowLeft className="size-4" /> Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={buttonClass({ variant: "secondary" })} scroll>
          Next <ArrowRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
