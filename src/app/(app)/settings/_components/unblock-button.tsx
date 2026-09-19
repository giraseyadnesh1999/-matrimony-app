"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { unblockAction } from "../../actions";

export function UnblockButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await unblockAction(userId);
          if (!res.ok) return void toast.error(res.error);
          toast("Unblocked");
          router.refresh();
        })
      }
    >
      Unblock
    </Button>
  );
}
