import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Label + control + hint/error, wired for screen readers via aria-describedby. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline justify-between text-sm font-medium">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-subtle">Optional</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="text-xs leading-relaxed text-muted">
          {hint}
        </p>
      )}
      <p
        id={`${htmlFor}-error`}
        role={error ? "alert" : undefined}
        className={cn(
          "grid text-xs text-danger transition-[grid-template-rows,opacity] duration-200",
          error ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <span className="overflow-hidden">{error}</span>
      </p>
    </div>
  );
}

export const controlClass =
  "h-11 w-full rounded-xl border bg-card px-3.5 text-foreground placeholder:text-subtle " +
  "transition-[border-color,box-shadow] duration-150 outline-none " +
  "hover:border-border-strong focus:border-accent focus:shadow-[0_0_0_4px_var(--ring)] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return (
    <input
      className={cn(controlClass, invalid ? "border-danger" : "border-border", className)}
      aria-invalid={invalid || undefined}
      aria-describedby={props.id ? `${props.id}-hint ${props.id}-error` : undefined}
      {...props}
    />
  );
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      className={cn(controlClass, "h-auto min-h-28 resize-y py-3 leading-relaxed", invalid ? "border-danger" : "border-border", className)}
      aria-invalid={invalid || undefined}
      aria-describedby={props.id ? `${props.id}-hint ${props.id}-error` : undefined}
      {...props}
    />
  );
}

/** Native <select>: best accessibility and the best mobile picker, styled to match. */
export function Select({
  className,
  invalid,
  placeholder,
  options,
  ...props
}: Omit<ComponentProps<"select">, "children"> & {
  invalid?: boolean;
  placeholder?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div className="relative">
      <select
        className={cn(controlClass, "appearance-none pr-10", invalid ? "border-danger" : "border-border", className)}
        aria-invalid={invalid || undefined}
        aria-describedby={props.id ? `${props.id}-hint ${props.id}-error` : undefined}
        {...props}
      >
        <option value="">{placeholder ?? "Select"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}
