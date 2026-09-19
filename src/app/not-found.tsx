import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="space-y-2">
        <p className="font-display text-6xl">404</p>
        <p className="text-muted">We couldn&apos;t find that page.</p>
      </div>
      <ButtonLink href="/" variant="secondary">
        Go home
      </ButtonLink>
    </div>
  );
}
