import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Logo } from "@/components/logo";
import { requireSession } from "@/server/session";
import { logoutAction } from "../(auth)/actions";
import { DesktopNav, MobileNav } from "./_components/app-nav";
import { DeletionBanner } from "./_components/deletion-banner";

// Everything behind login is private: keep it out of search engines and caches.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const pending = await db.interest.count({ where: { toUserId: session.user.id, status: "PENDING" } });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Logo href="/discover" />
          <DesktopNav pending={pending} />
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-foreground active:scale-95"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      {session.user.status === "PENDING_DELETION" && session.user.deletionScheduledFor && (
        <DeletionBanner date={session.user.deletionScheduledFor.toISOString()} />
      )}

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-5 pb-28 pt-8 sm:px-8 md:pb-16">
        {children}
      </main>

      <MobileNav pending={pending} />
    </div>
  );
}
