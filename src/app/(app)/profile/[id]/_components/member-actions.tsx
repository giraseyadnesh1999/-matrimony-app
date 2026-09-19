"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Select, Textarea } from "@/components/ui/field";
import { REPORT_REASONS } from "@/lib/reference";
import { blockAction, reportAction } from "../../../actions";

export function MemberActions({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [reasonError, setReasonError] = useState<string>();

  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmDialog
        title="Report this profile"
        description="Tell us what's wrong. Reports are confidential and reviewed by our team. The member is not told who reported them."
        confirmLabel="Send report"
        trigger={(open) => (
          <Button variant="ghost" size="sm" onClick={open}>
            <Flag className="size-4" /> Report
          </Button>
        )}
        onConfirm={async () => {
          if (!reason) {
            setReasonError("Please choose a reason.");
            return false; // keep the dialog open
          }
          const res = await reportAction({ userId, reason, details: details || undefined });
          if (!res.ok) {
            toast.error(res.error);
            return false;
          }
          setReason("");
          setDetails("");
          toast.success("Thanks. We'll review this profile.");
        }}
      >
        <div className="space-y-4">
          <Field label="Reason" htmlFor="report-reason" error={reasonError}>
            <Select
              id="report-reason"
              value={reason}
              options={REPORT_REASONS}
              placeholder="Choose a reason"
              onChange={(e) => {
                setReason(e.target.value);
                setReasonError(undefined);
              }}
              invalid={!!reasonError}
            />
          </Field>
          <Field label="Details" htmlFor="report-details" optional>
            <Textarea id="report-details" value={details} maxLength={1000} onChange={(e) => setDetails(e.target.value)} className="min-h-20" />
          </Field>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        destructive
        title={`Block ${name}?`}
        description="You will no longer see each other anywhere on Saathi, and any interests between you are removed. You can unblock later in Settings."
        confirmLabel="Block"
        trigger={(open) => (
          <Button variant="danger-ghost" size="sm" onClick={open}>
            <Ban className="size-4" /> Block
          </Button>
        )}
        onConfirm={async () => {
          const res = await blockAction(userId);
          if (!res.ok) {
            toast.error(res.error);
            return false;
          }
          toast(`${name} is blocked`);
          router.replace("/discover");
        }}
      />
    </div>
  );
}
