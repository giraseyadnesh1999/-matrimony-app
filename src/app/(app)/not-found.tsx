import { ButtonLink } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="font-display text-4xl">Not available</p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        This profile doesn&apos;t exist, or it isn&apos;t visible to you. It may have been hidden, removed or blocked.
      </p>
      <ButtonLink href="/discover" variant="secondary" className="mt-8">
        Back to Discover
      </ButtonLink>
    </div>
  );
}
