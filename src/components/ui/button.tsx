import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium " +
  "transition-[background-color,border-color,color,transform,box-shadow,opacity] duration-150 ease-out " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants = {
  primary: "bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm",
  secondary: "border border-border-strong bg-card text-foreground hover:bg-accent-soft",
  ghost: "text-muted hover:bg-accent-soft hover:text-foreground",
  danger: "bg-danger text-white hover:opacity-90",
  "danger-ghost": "text-danger hover:bg-danger-soft",
} as const;

const sizes = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-12 px-6 text-base",
} as const;

export type ButtonStyle = { variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string };

export const buttonClass = ({ variant = "primary", size = "md", className }: ButtonStyle = {}) =>
  cn(base, variants[variant], sizes[size], className);

type ButtonProps = ComponentProps<"button"> & ButtonStyle & { loading?: boolean };

export function Button({ variant, size, className, loading, disabled, children, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      <span className={cn("inline-flex items-center gap-2", loading && "opacity-80")}>{children}</span>
    </button>
  );
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & ButtonStyle) {
  return <Link className={buttonClass({ variant, size, className })} {...props} />;
}
