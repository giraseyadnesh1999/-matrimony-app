"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/interests", label: "Interests", icon: Heart },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/**
 * "Profile" means the member's OWN profile. Other members' pages (/profile/[id]) are reached from, and
 * belong to, Discover, so they must not light up the Profile tab.
 */
function useActive() {
  const path = usePathname();
  return (href: string) => {
    if (href === "/profile") return path === "/profile";
    if (href === "/discover") return path === "/discover" || path.startsWith("/discover/") || path.startsWith("/profile/");
    return path === href || path.startsWith(`${href}/`);
  };
}

/** Top links on wide screens. `pending` is the count of unanswered interests. */
export function DesktopNav({ pending }: { pending: number }) {
  const active = useActive();
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {ITEMS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          className={cn(
            "relative rounded-lg px-3.5 py-2 text-sm transition-colors duration-150",
            active(href) ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-foreground",
          )}
        >
          {label}
          {href === "/interests" && pending > 0 && <Dot count={pending} />}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Fixed tab bar on phones. It must be rendered OUTSIDE the header: the header uses backdrop-filter, which
 * turns it into the containing block for fixed descendants and would pin this bar to the top of the page.
 */
export function MobileNav({ pending }: { pending: number }) {
  const active = useActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      {ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          className={cn(
            "relative flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors duration-150 active:scale-95",
            active(href) ? "text-accent" : "text-muted",
          )}
        >
          <span className="relative">
            <Icon className="size-5" strokeWidth={active(href) ? 2.25 : 1.75} />
            {href === "/interests" && pending > 0 && <Dot count={pending} mobile />}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Dot({ count, mobile }: { count: number; mobile?: boolean }) {
  return (
    <span
      className={cn(
        "grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-medium leading-4 text-accent-foreground",
        mobile ? "absolute -right-2 -top-1.5" : "ml-1.5 inline-grid",
      )}
      aria-label={`${count} new`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
