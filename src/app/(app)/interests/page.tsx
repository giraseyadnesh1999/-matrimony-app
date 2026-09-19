import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { heightLabel, initials, labels, placeLabel } from "@/lib/display";
import { cn } from "@/lib/utils";
import { requireOnboarded } from "@/server/guards";
import {
  connectionProfiles,
  interestCounts,
  listConnections,
  listInterests,
} from "@/server/interests";
import type { PublicProfile } from "@/server/matches";
import { RespondButtons, WithdrawButton } from "./_components/respond-buttons";

export const metadata: Metadata = { title: "Interests" };

const TABS = ["received", "sent", "connections"] as const;
type Tab = (typeof TABS)[number];
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function InterestsPage({ searchParams }: PageProps<"/interests">) {
  const { session } = await requireOnboarded();
  const sp = await searchParams;
  const requested = first(sp.tab) as Tab;
  const tab: Tab = TABS.includes(requested) ? requested : "received";
  const counts = await interestCounts(session.user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-4xl leading-tight tracking-tight">Interests</h1>

      <nav aria-label="Interest lists" className="flex gap-1 rounded-xl border border-border bg-card p-1">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/interests?tab=${t}`}
            replace
            aria-current={t === tab ? "page" : undefined}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-center text-sm capitalize transition-colors duration-150",
              t === tab ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-foreground",
            )}
          >
            {t}
            <span className="ml-1.5 tabular-nums text-xs opacity-70">{counts[t]}</span>
          </Link>
        ))}
      </nav>

      <div key={tab} className="animate-fade-up">
        {tab === "connections" ? <Connections viewerId={session.user.id} /> : <Pending viewerId={session.user.id} kind={tab} />}
      </div>
    </div>
  );
}

async function Pending({ viewerId, kind }: { viewerId: string; kind: "received" | "sent" }) {
  const rows = await listInterests(viewerId, kind);
  if (rows.length === 0) {
    return (
      <Empty
        title={kind === "received" ? "No new interests" : "You haven't sent any interests"}
        body={
          kind === "received"
            ? "When someone shows interest in you, it appears here."
            : "Find someone you'd like to know better and send an interest."
        }
        cta
      />
    );
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <Row key={r.interestId} p={r.profile}>
          {kind === "received" ? (
            <RespondButtons interestId={r.interestId} name={r.profile.name} />
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">Awaiting reply</span>
              <WithdrawButton userId={r.profile.userId} name={r.profile.name} />
            </div>
          )}
        </Row>
      ))}
    </ul>
  );
}

async function Connections({ viewerId }: { viewerId: string }) {
  const { cards, viewerConsents } = await listConnections(viewerId);
  const profiles = await connectionProfiles(cards.map((c) => c.userId));
  const shown = cards.filter((c) => profiles.has(c.userId));

  if (shown.length === 0) {
    return <Empty title="No connections yet" body="When an interest is accepted, you'll both appear here." cta />;
  }

  return (
    <div className="space-y-3">
      {!viewerConsents && (
        <div className="rounded-xl border border-border bg-accent-soft px-4 py-3 text-sm leading-relaxed">
          <p>
            Contact details are hidden. To exchange them, both of you must agree to share.{" "}
            <Link href="/settings/privacy#consents" className="font-medium underline underline-offset-2">
              Turn on contact sharing
            </Link>
          </p>
        </div>
      )}
      <ul className="space-y-3">
        {shown.map((c) => (
          <Row key={c.interestId} p={profiles.get(c.userId)!}>
            {c.contact ? (
              <div className="space-y-1 text-sm">
                {c.contact.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="size-4 text-subtle" />
                    <a className="underline-offset-2 hover:underline" href={`tel:${c.contact.phone}`}>{c.contact.phone}</a>
                  </p>
                )}
                {c.contact.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="size-4 text-subtle" />
                    <a className="underline-offset-2 hover:underline" href={`mailto:${c.contact.email}`}>{c.contact.email}</a>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">{viewerConsents ? "Waiting for them to enable sharing" : "Contact hidden"}</p>
            )}
          </Row>
        ))}
      </ul>
    </div>
  );
}

function Row({ p, children }: { p: PublicProfile; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <Link href={`/profile/${p.userId}`} className="group flex min-w-0 items-center gap-4">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-xl text-accent"
        >
          {initials(p.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-xl leading-tight group-hover:text-accent">{p.name}</span>
          <span className="block truncate text-sm text-muted">
            {[`${p.age} yrs`, heightLabel(p.heightCm), placeLabel(p), labels.religion(p.religion)].filter(Boolean).join(" · ")}
          </span>
        </span>
      </Link>
      <div className="shrink-0">{children}</div>
    </li>
  );
}

function Empty({ title, body, cta }: { title: string; body: string; cta?: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong px-6 py-14 text-center">
      <p className="font-display text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{body}</p>
      {cta && (
        <ButtonLink href="/discover" variant="secondary" className="mt-6">
          Discover members
        </ButtonLink>
      )}
    </div>
  );
}

