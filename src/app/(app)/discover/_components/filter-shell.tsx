"use client";

import { createContext, useContext, useTransition, type ReactNode, type TransitionStartFunction } from "react";
import { cn } from "@/lib/utils";

/**
 * Shares one transition between the filter controls and the results. Changing a filter starts a
 * transition, React keeps the old results on screen (no flash, no layout jump) while the server
 * renders the new ones, and the results dim slightly so people see something is happening.
 */
const Ctx = createContext<{ pending: boolean; start: TransitionStartFunction } | null>(null);

export function FilterShell({ children }: { children: ReactNode }) {
  const [pending, start] = useTransition();
  return <Ctx value={{ pending, start }}>{children}</Ctx>;
}

export function useFilterTransition() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilterTransition must be used inside <FilterShell>");
  return ctx;
}

export function ResultsDim({ children }: { children: ReactNode }) {
  const { pending } = useFilterTransition();
  return (
    <div
      aria-busy={pending}
      className={cn("transition-[opacity,filter] duration-200", pending && "pointer-events-none opacity-50 saturate-50")}
    >
      {children}
    </div>
  );
}

/** Thin indeterminate bar under the header while results reload. */
export function PendingBar() {
  const { pending } = useFilterTransition();
  return (
    <div
      aria-hidden
      className={cn(
        "h-0.5 overflow-hidden rounded-full bg-transparent transition-opacity duration-200",
        pending ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="skeleton h-full w-full !bg-accent/30" />
    </div>
  );
}
