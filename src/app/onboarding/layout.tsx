import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Your profile", robots: { index: false, follow: false } };

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo href="/discover" />
        <Link href="/discover" className="text-sm text-muted transition-colors hover:text-foreground">
          Save &amp; exit
        </Link>
      </header>
      <main id="main" className="mx-auto w-full max-w-xl flex-1 px-6 pb-24 pt-2">
        {children}
      </main>
    </div>
  );
}
