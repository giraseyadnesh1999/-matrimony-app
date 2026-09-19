"use client";

import { Button } from "@/components/ui/button";

/** Route-level error boundary: friendly message and a retry that re-renders without a full reload. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // The error itself is never rendered: it may contain internal details or personal data.
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 px-6 text-center" role="alert">
      <p className="font-display text-4xl">Something went wrong</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        It&apos;s on our side. Your information is safe. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
