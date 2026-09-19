"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Check, Heart } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonClass } from "@/components/ui/button";
import type { InterestState } from "@/server/matches";
import { sendInterestAction, withdrawInterestAction } from "../actions";

/**
 * Optimistic: the button flips instantly and rolls back with a message if the server says no.
 * Uses only the member id, so nothing about the other person is sent to the browser twice.
 */
export function InterestButton({
  userId,
  initial,
  name,
  size = "md",
  className,
}: {
  userId: string;
  initial: InterestState;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  // `confirmed` is what the server last agreed to; `state` layers the optimistic guess on top while a
  // request is in flight, and falls back to `confirmed` if the request fails.
  const [confirmed, setConfirmed] = useState(initial);
  const [seenInitial, setSeenInitial] = useState(initial);
  if (initial !== seenInitial) {
    // The server sent fresh data (navigation or revalidation): adopt it.
    setSeenInitial(initial);
    setConfirmed(initial);
  }
  const [state, setState] = useOptimistic<InterestState, InterestState>(confirmed, (_, next) => next);
  const [pending, start] = useTransition();

  if (state === "ACCEPTED") {
    return (
      <Link href="/interests?tab=connections" className={buttonClass({ variant: "secondary", size, className })}>
        <Check className="size-4 text-success" />
        Connected
      </Link>
    );
  }

  if (state === "SENT") {
    return (
      <Button
        variant="secondary"
        size={size}
        className={className}
        loading={pending}
        aria-label={`Interest sent to ${name}. Press to withdraw.`}
        title="Press to withdraw"
        onClick={() =>
          start(async () => {
            setState("NONE");
            const res = await withdrawInterestAction(userId);
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            setConfirmed("NONE");
            toast("Interest withdrawn");
          })
        }
      >
        {!pending && <Check className="size-4 text-success" />}
        Interest sent
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={state === "RECEIVED" ? "primary" : "secondary"}
      className={className}
      loading={pending}
      aria-label={state === "RECEIVED" ? `Accept interest from ${name}` : `Send interest to ${name}`}
      onClick={() =>
        start(async () => {
          setState(state === "RECEIVED" ? "ACCEPTED" : "SENT");
          const res = await sendInterestAction(userId);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          setConfirmed(res.state === "ACCEPTED" ? "ACCEPTED" : "SENT");
          if (res.state === "ACCEPTED") toast.success(`You and ${name} are connected`);
          else toast.success(`Interest sent to ${name}`);
        })
      }
    >
      <Heart className="size-4" />
      {state === "RECEIVED" ? "Accept interest" : "Send interest"}
    </Button>
  );
}
