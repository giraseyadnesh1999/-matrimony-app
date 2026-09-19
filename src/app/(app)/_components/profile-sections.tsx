import Link from "next/link";
import { Pencil } from "lucide-react";
import { heightLabel, labels, placeLabel } from "@/lib/display";
import {
  DIET,
  EDUCATION_FIELD,
  FAMILY_TYPE,
  FAMILY_VALUES,
  HABIT,
  HAS_CHILDREN,
  MANGLIK,
  MANGLIK_PREFERENCE,
  MARITAL_STATUS,
  MOTHER_TONGUES,
  NAKSHATRA,
  RASHI,
  RELIGIONS,
  RESIDENCY_STATUS,
  SECTS,
  labelOf,
} from "@/lib/reference";
import type { PublicProfile } from "@/server/matches";

type Pref = {
  ageMin: number | null;
  ageMax: number | null;
  religions: string[];
  maritalStatuses: string[];
  diets: string[];
  manglik: string;
  casteNoBar: boolean;
  about: string | null;
} | null;

/** Read-only profile body, used for other members and for "how others see me". */
export function ProfileSections({ p, pref, editStepBase }: { p: PublicProfile; pref: Pref; editStepBase?: string }) {
  const edit = (step: string) => (editStepBase ? `${editStepBase}?step=${step}` : undefined);
  const list = (values: string[], opts: readonly { value: string; label: string }[]) =>
    values.map((v) => labelOf(opts, v)).join(", ");

  return (
    <div className="space-y-6">
      {p.about && (
        <Section title="About" editHref={edit("about")}>
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{p.about}</p>
        </Section>
      )}

      <Section title="Basics" editHref={edit("basics")}>
        <Rows
          rows={[
            ["Age", `${p.age} years`],
            ["Height", heightLabel(p.heightCm)],
            ["Marital status", labels.marital(p.maritalStatus)],
            ["Children", p.maritalStatus === "NEVER_MARRIED" ? "" : labelOf(HAS_CHILDREN, p.hasChildren)],
            ["Lives in", placeLabel(p)],
            ["Residency", p.country === "IN" && p.residencyStatus === "RESIDENT" ? "" : labelOf(RESIDENCY_STATUS, p.residencyStatus)],
            ["Disability", p.physicalStatus === "DISABILITY" ? (p.disabilityNote || "Person with disability") : ""],
          ]}
        />
      </Section>

      <Section title="Religion & community" editHref={edit("community")}>
        <Rows
          rows={[
            ["Religion", labels.religion(p.religion)],
            ["Denomination", p.religion && p.sect ? labelOf(SECTS[p.religion] ?? [], p.sect) : ""],
            ["Community", p.caste ?? ""],
            ["Sub-community", p.subCaste ?? ""],
            ["Gotra", p.gotra ?? ""],
            ["Mother tongue", labels.motherTongue(p.motherTongue)],
            ["Also speaks", list(p.knownLanguages, MOTHER_TONGUES)],
          ]}
        />
      </Section>

      <Section title="Education & work" editHref={edit("career")}>
        <Rows
          rows={[
            ["Education", labels.education(p.education)],
            ["Field", labelOf(EDUCATION_FIELD, p.educationField)],
            ["College", p.institution ?? ""],
            ["Works in", labels.sector(p.occupationSector)],
            ["Role", p.occupation ?? ""],
            ["Income", labels.income(p.incomeBand)],
          ]}
        />
      </Section>

      <Section title="Family & lifestyle" editHref={edit("family")}>
        <Rows
          rows={[
            ["Diet", labelOf(DIET, p.diet)],
            ["Smoking", labelOf(HABIT, p.smoking)],
            ["Drinking", labelOf(HABIT, p.drinking)],
            ["Family type", labelOf(FAMILY_TYPE, p.familyType)],
            ["Family values", labelOf(FAMILY_VALUES, p.familyValues)],
            ["Father", p.fatherOccupation ?? ""],
            ["Mother", p.motherOccupation ?? ""],
            ["Siblings", siblings(p.brothers, p.sisters)],
          ]}
        />
      </Section>

      {p.horoscope && (
        <Section title="Horoscope" editHref={edit("community")}>
          <Rows
            rows={[
              ["Manglik", labelOf(MANGLIK, p.horoscope.manglik)],
              ["Rashi", labelOf(RASHI, p.horoscope.rashi)],
              ["Nakshatra", labelOf(NAKSHATRA, p.horoscope.nakshatra)],
              ["Born at", p.horoscope.birthTime ?? ""],
              ["Born in", p.horoscope.birthPlace ?? ""],
            ]}
          />
        </Section>
      )}

      {pref && (
        <Section title="Looking for" editHref={edit("about")}>
          <Rows
            rows={[
              ["Age", pref.ageMin || pref.ageMax ? `${pref.ageMin ?? "any"} to ${pref.ageMax ?? "any"}` : ""],
              ["Religion", list(pref.religions, RELIGIONS)],
              ["Marital status", list(pref.maritalStatuses, MARITAL_STATUS)],
              ["Diet", list(pref.diets, DIET)],
              ["Manglik", pref.manglik !== "ANY" ? labelOf(MANGLIK_PREFERENCE, pref.manglik) : ""],
              ["Community", pref.casteNoBar ? "No bar" : ""],
            ]}
          />
          {pref.about && <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed">{pref.about}</p>}
        </Section>
      )}
    </div>
  );
}

const siblings = (b: number | null, s: number | null) =>
  b === null && s === null ? "" : `${b ?? 0} brother${b === 1 ? "" : "s"}, ${s ?? 0} sister${s === 1 ? "" : "s"}`;

function Section({ title, editHref, children }: { title: string; editHref?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-2xl">{title}</h2>
        {editHref && (
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:bg-accent-soft hover:text-accent"
          >
            <Pencil className="size-3.5" /> Edit
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: Array<[string, string]> }) {
  const shown = rows.filter(([, v]) => v);
  if (shown.length === 0) return <p className="text-sm text-subtle">Nothing added yet.</p>;
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {shown.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5">
          <dt className="text-xs uppercase tracking-wider text-subtle">{k}</dt>
          <dd className="text-[15px]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
