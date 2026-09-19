import Link from "next/link";
import { SITE } from "@/config/site";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-display text-2xl leading-none tracking-tight", className)} aria-label={`${SITE.name} home`}>
      <span aria-hidden className="relative grid size-7 place-items-center">
        <span className="absolute size-5 -translate-x-1 rounded-full border-[1.5px] border-accent" />
        <span className="absolute size-5 translate-x-1 rounded-full border-[1.5px] border-foreground/70" />
      </span>
      {SITE.name}
    </Link>
  );
}
