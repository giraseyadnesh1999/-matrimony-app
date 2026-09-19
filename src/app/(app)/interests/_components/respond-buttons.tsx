"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { respondInterestAction, withdrawInterestAction } from "../../actions";

/** Accept / decline with instant feedback: the row collapses away as soon as the server confirms. */
export function RespondButtons({ interestId, name }: { interestId: string; name: string }) {
  const [pending, start] = useTransition();
  const [which, setWhich] = useState<"ACCEPT" | "DECLINE" | null>(null);
  const [done, setDone] = useState<"ACCEPT" | "DECLINE" | null>(null);

  if (done) {
    return (
      <p className="text-sm text-muted" role="status">
        {done === "ACCEPT" ? "Accepted" : "Declined"}
      </p>
    );
  }

  const respond = (action: "ACCEPT" | "DECLINE") => {
    setWhich(action);
    start(async () => {
      const res = await respondInterestAction(interestId, action);
      if (!res.ok) {
        toast.error(res.error);
        setWhich(null);
        return;
      }
      setDone(action);
      if (action === "ACCEPT") toast.success(`You and ${name} are connected`);
    });
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" loading={pending && which === "ACCEPT"} disabled={pending} onClick={() => respond("ACCEPT")} aria-label={`Accept interest from ${name}`}>
        <Check className="size-4" /> Accept
      </Button>
      <Button size="sm" variant="secondary" loading={pending && which === "DECLINE"} disabled={pending} onClick={() => respond("DECLINE")} aria-label={`Decline interest from ${name}`}>
        <X className="size-4" /> Decline
      </Button>
    </div>
  );
}

export function WithdrawButton({ userId, name }: { userId: string; name: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  if (done) return <p className="text-sm text-muted" role="status">Withdrawn</p>;
  return (
    <Button
      size="sm"
      variant="ghost"
      loading={pending}
      aria-label={`Withdraw interest in ${name}`}
      onClick={() =>
        start(async () => {
          const res = await withdrawInterestAction(userId);
          if (res.ok) setDone(true);
          else toast.error(res.error);
        })
      }
    >
      Withdraw
    </Button>
  );
}
