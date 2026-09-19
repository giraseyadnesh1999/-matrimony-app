import { db } from "@/lib/db";
import { describeDevice, METHOD_LABEL, timeAgo } from "@/lib/display";
import { maskIdentifier } from "@/lib/identifier";
import { requireSession } from "@/server/session";
import { contactOf } from "@/server/users";
import { SessionsList, type DeviceRow } from "./_components/sessions-list";

export default async function AccountSettingsPage() {
  const session = await requireSession();
  const [user, sessions, oauth] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: session.user.id } }),
    db.session.findMany({
      where: { userId: session.user.id, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
      take: 20,
    }),
    db.oAuthAccount.findMany({ where: { userId: session.user.id }, select: { provider: true } }),
  ]);

  const contact = contactOf(user);
  const devices: DeviceRow[] = sessions.map((s) => {
    const d = describeDevice(s.userAgent);
    return {
      id: s.id,
      label: d.label,
      mobile: d.mobile,
      method: METHOD_LABEL[s.method] ?? s.method,
      lastSeen: timeAgo(s.lastSeenAt),
      current: s.id === session.id,
    };
  });

  return (
    <div className="space-y-6">
      <Card title="Sign-in details" note="Stored encrypted. Shown here masked. We never show these to other members without your consent.">
        <dl className="divide-y divide-border text-sm">
          <Item label="Mobile number" value={contact.phone ? maskIdentifier({ kind: "phone", value: contact.phone }) : "Not added"} verified={!!user.phoneVerifiedAt} />
          <Item label="Email" value={contact.email ? maskIdentifier({ kind: "email", value: contact.email }) : "Not added"} verified={!!user.emailVerifiedAt} />
          <Item label="Connected logins" value={oauth.length ? oauth.map((o) => o.provider[0]!.toUpperCase() + o.provider.slice(1)).join(", ") : "None"} />
        </dl>
      </Card>

      <Card title="Where you're signed in" note="If you see a device you don't recognise, sign it out and let us know.">
        <SessionsList devices={devices} />
      </Card>
    </div>
  );
}

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
      <h2 className="font-display text-2xl">{title}</h2>
      {note && <p className="mb-5 mt-1 text-sm leading-relaxed text-muted">{note}</p>}
      {!note && <div className="mb-5" />}
      {children}
    </section>
  );
}

function Item({ label, value, verified }: { label: string; value: string; verified?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="flex items-center gap-2 font-medium">
        {value}
        {verified && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-normal text-success">Verified</span>}
      </dd>
    </div>
  );
}
