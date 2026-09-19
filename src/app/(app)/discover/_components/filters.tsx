"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Select } from "@/components/ui/field";
import { ABSOLUTE_MIN_AGE, MAX_AGE } from "@/lib/age";
import { DIET, EDUCATION, MARITAL_STATUS, MOTHER_TONGUES, RELIGIONS, STATES } from "@/lib/reference";
import { cn } from "@/lib/utils";
import { useFilterTransition } from "./filter-shell";

const AGES = Array.from({ length: MAX_AGE - ABSOLUTE_MIN_AGE + 1 }, (_, i) => {
  const v = String(ABSOLUTE_MIN_AGE + i);
  return { value: v, label: v };
});

type Effective = Record<string, string>;

export function Filters({ effective }: { effective: Effective }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { start, pending } = useFilterTransition();
  const [open, setOpen] = useState(false);

  const active = ["ageMin", "ageMax", "religion", "motherTongue", "state", "maritalStatus", "diet", "education"].filter(
    (k) => effective[k],
  ).length;

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    // Age uses "any" to mean "explicitly no limit" so it is not replaced by the partner-preference default.
    if (key === "ageMin" || key === "ageMax") next.set(key, value || "any");
    else if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  function clearAll() {
    start(() => router.replace(`${pathname}?ageMin=any&ageMax=any`, { scroll: false }));
  }

  const sel = (key: string, label: string, options: readonly { value: string; label: string }[], placeholder: string) => (
    <div className="space-y-1.5">
      <label htmlFor={`f-${key}`} className="text-xs font-medium text-muted">
        {label}
      </label>
      <Select
        id={`f-${key}`}
        value={effective[key] ?? ""}
        options={options}
        placeholder={placeholder}
        onChange={(e) => update(key, e.target.value)}
        className="h-10 text-sm"
        aria-busy={pending}
      />
    </div>
  );

  return (
    <section aria-label="Filters" className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between sm:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="filter-grid"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 text-sm font-medium"
        >
          <SlidersHorizontal className="size-4" />
          Filters{active > 0 && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">{active}</span>}
        </button>
        {active > 0 && (
          <button type="button" onClick={clearAll} className="text-xs text-muted hover:text-foreground">
            Clear
          </button>
        )}
      </div>

      <div
        id="filter-grid"
        className={cn(
          "grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4",
          "max-sm:overflow-hidden max-sm:transition-[max-height,opacity,margin] max-sm:duration-300",
          open ? "max-sm:mt-4 max-sm:max-h-[40rem] max-sm:opacity-100" : "max-sm:max-h-0 max-sm:opacity-0",
        )}
      >
        {sel("ageMin", "Age from", AGES, "Any")}
        {sel("ageMax", "Age to", AGES, "Any")}
        {sel("religion", "Religion", RELIGIONS, "Any")}
        {sel("motherTongue", "Mother tongue", MOTHER_TONGUES, "Any")}
        {sel("state", "State", STATES, "Any")}
        {sel("maritalStatus", "Marital status", MARITAL_STATUS, "Any")}
        {sel("diet", "Diet", DIET, "Any")}
        {sel("education", "Education", EDUCATION, "Any")}
      </div>

      {active > 0 && (
        <div className="mt-4 hidden justify-end sm:flex">
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
