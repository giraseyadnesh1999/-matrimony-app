import type { ComponentProps, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Large, forgiving tap target; the whole row toggles. Never pre-checked for optional consents. */
export function Checkbox({
  label,
  description,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-start gap-3 rounded-xl p-2 -m-2 transition-colors hover:bg-accent-soft/60",
        props.disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
        <input type="checkbox" className="peer absolute inset-0 size-5 cursor-[inherit] opacity-0" {...props} />
        <span
          aria-hidden
          className="absolute inset-0 rounded-md border border-border-strong bg-card transition-[background-color,border-color,box-shadow] duration-150 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:shadow-[0_0_0_4px_var(--ring)]"
        />
        <Check
          aria-hidden
          strokeWidth={3}
          className="relative size-3 scale-50 text-accent-foreground opacity-0 transition-[transform,opacity] duration-150 peer-checked:scale-100 peer-checked:opacity-100"
        />
      </span>
      <span className="text-sm leading-snug">
        <span className="block">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
      </span>
    </label>
  );
}
