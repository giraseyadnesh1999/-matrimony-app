"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings", label: "Account" },
  { href: "/settings/privacy", label: "Privacy & data" },
] as const;

export function SettingsTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Settings sections" className="flex gap-1 rounded-xl border border-border bg-card p-1">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          replace
          aria-current={path === t.href ? "page" : undefined}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-center text-sm transition-colors duration-150",
            path === t.href ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
