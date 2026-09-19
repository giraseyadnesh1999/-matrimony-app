import Link from "next/link";
import { Logo } from "@/components/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
        <Logo />
        <Link href="/login" className="text-sm text-muted transition-colors hover:text-foreground">
          Log in
        </Link>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-6 pb-20 pt-6">
        {children}
      </main>
      <footer className="border-t border-border px-6 py-8 text-center text-xs text-subtle">
        <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-5 gap-y-1">
          <Link href="/privacy" className="hover:text-foreground">Privacy Notice</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/grievance" className="hover:text-foreground">Grievance Officer</Link>
        </nav>
      </footer>
    </div>
  );
}
