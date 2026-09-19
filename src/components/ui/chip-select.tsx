"use client";

import { cn } from "@/lib/utils";

/**
 * Tap-friendly multi-select. Renders as a group of toggle buttons (aria-pressed) so it is fully
 * keyboard and screen-reader accessible without a custom listbox.
 */
export function ChipSelect({
  options,
  value,
  onChange,
  max,
  label,
}: {
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  label: string;
}) {
  const atMax = max !== undefined && value.length >= max;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            disabled={!on && atMax}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn(
              "h-9 rounded-full border px-3.5 text-sm transition-[background-color,border-color,color,transform] duration-150 active:scale-95",
              "disabled:cursor-not-allowed disabled:opacity-40",
              on
                ? "border-accent bg-accent-soft font-medium text-accent"
                : "border-border bg-card text-muted hover:border-border-strong hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
