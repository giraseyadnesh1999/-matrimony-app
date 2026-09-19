"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelDeletionAction } from "../settings/actions";

export function DeletionBanner({ date }: { date: string }) {
  const [pending, start] = useTransition();
  const when = new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div role="status" className="border-b border-danger/20 bg-danger-soft">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm sm:px-8">
        <p className="text-danger">
          Your account and all its data will be permanently erased on <strong>{when}</strong>.
        </p>
        <Button
          size="sm"
          variant="secondary"
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await cancelDeletionAction();
              if (res.ok) toast.success("Deletion cancelled. Welcome back.");
              else toast.error(res.error);
            })
          }
        >
          Keep my account
        </Button>
      </div>
    </div>
  );
}
