import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Accessible on/off switch (role="switch"). The thumb slides; state is announced to screen readers. */
export function Switch({
  checked,
  className,
  ...props
}: Omit<ComponentProps<"button">, "role" | "type"> & { checked: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition-[background-color,border-color,box-shadow] duration-200 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "border-accent bg-accent" : "border-border-strong bg-border",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0.5 top-0.5 size-[22px] rounded-full bg-white shadow transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
