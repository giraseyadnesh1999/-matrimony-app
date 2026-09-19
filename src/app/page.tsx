import Link from "next/link";
import { EyeOff, Languages, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { SITE } from "@/config/site";
import { getSession } from "@/server/session";

export default async function Home() {
  const session = await getSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          {session ? (
            <ButtonLink href="/discover" size="sm">Go to Discover</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">Log in</ButtonLink>
              <ButtonLink href="/signup" size="sm">Create profile</ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pb-24 pt-16 sm:pt-28">
          <p className="animate-fade-up text-sm uppercase tracking-[0.2em] text-accent">Matrimony, made calm</p>
          <h1 className="animate-fade-up mt-5 max-w-3xl font-display text-6xl leading-[1.02] tracking-tight [animation-delay:60ms] sm:text-8xl">
            {SITE.tagline}
          </h1>
          <p className="animate-fade-up mt-7 max-w-xl text-lg leading-relaxed text-muted [animation-delay:120ms]">
            {SITE.description}
          </p>
          <div className="animate-fade-up mt-10 flex flex-wrap gap-3 [animation-delay:180ms]">
            <ButtonLink href={session ? "/discover" : "/signup"} size="lg">
              {session ? "Continue" : "Create your profile"}
            </ButtonLink>
            {!session && (
              <ButtonLink href="/login" variant="secondary" size="lg">
                Log in
              </ButtonLink>
            )}
          </div>
          <p className="mt-5 text-sm text-subtle">Free to join. Sign up with your mobile number, email, or Google.</p>
        </section>

        <section className="border-t border-border bg-card/50">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 py-20 sm:grid-cols-3">
            <Principle
              icon={<ShieldCheck className="size-6" strokeWidth={1.5} />}
              title="Private by default"
              body="Your number and email are encrypted and never shown. Members see only your first name, age and what you choose to add."
            />
            <Principle
              icon={<EyeOff className="size-6" strokeWidth={1.5} />}
              title="You are in control"
              body="Every optional use of your data is a separate choice you can withdraw in one tap. Download or erase your data any time."
            />
            <Principle
              icon={<Languages className="size-6" strokeWidth={1.5} />}
              title="Made for all of India"
              body="Every state and Union Territory, 40+ mother tongues, every faith and community, horoscope details, and NRI and OCI members."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-subtle">
        <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-5 gap-y-1">
          <Link href="/privacy" className="hover:text-foreground">Privacy Notice</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/grievance" className="hover:text-foreground">Grievance Officer</Link>
        </nav>
        <p className="mt-3">&copy; {new Date().getFullYear()} {SITE.name}. Members must be 18 or older.</p>
      </footer>
    </div>
  );
}

function Principle({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="space-y-3">
      <div className="text-accent">{icon}</div>
      <h2 className="font-display text-3xl">{title}</h2>
      <p className="text-[15px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}
