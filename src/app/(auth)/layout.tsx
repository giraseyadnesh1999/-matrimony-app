import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-6 py-5 sm:px-10">
        <Logo />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16 pt-4">
        {children}
      </main>
      <footer className="px-6 py-6 text-center text-xs text-subtle">
        <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-5 gap-y-1">
          <Link href="/privacy" className="hover:text-foreground">Privacy Notice</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/grievance" className="hover:text-foreground">Grievance Officer</Link>
        </nav>
      </footer>
    </div>
  );
}
