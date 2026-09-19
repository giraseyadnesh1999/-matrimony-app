"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Button } from "./button";

/**
 * Confirmation dialog built on the native <dialog> element: focus trapping, Esc to close and
 * top-layer stacking come from the browser, so it is accessible and smooth with zero extra JS.
 * For destructive actions the confirm button is `danger` and the safe choice is focused first.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
  confirmDisabled = false,
  children,
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Return `false` to keep the dialog open (validation or server error); anything else closes it. */
  onConfirm: () => Promise<boolean | void> | boolean | void;
  destructive?: boolean;
  /** Keeps the confirm button disabled, e.g. until the user types a confirmation word. */
  confirmDisabled?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      {trigger(() => setOpen(true))}
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current && !pending) setOpen(false); // click on backdrop
        }}
        className="m-auto w-[min(92vw,26rem)] rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:animate-fade-up"
      >
        <div className="space-y-4 p-6">
          <h2 className="font-display text-2xl">{title}</h2>
          <div className="text-sm leading-relaxed text-muted">{description}</div>
          {children}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" autoFocus onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant={destructive ? "danger" : "primary"}
              loading={pending}
              disabled={confirmDisabled}
              onClick={() =>
                start(async () => {
                  const keepOpen = (await onConfirm()) === false;
                  if (!keepOpen) setOpen(false);
                })
              }
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
