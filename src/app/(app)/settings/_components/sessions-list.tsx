"use client";

import { useState, useTransition } from "react";
import { Laptop, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { revokeOtherSessionsAction, revokeSessionAction } from "../actions";

export type DeviceRow = { id: string; label: string; method: string; lastSeen: string; current: boolean; mobile: boolean };

export function SessionsList({ devices }: { devices: DeviceRow[] }) {
  const [rows, setRows] = useState(devices);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const others = rows.filter((r) => !r.current).length;

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border">
        {rows.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="flex min-w-0 items-center gap-3">
              {d.mobile ? <Smartphone className="size-5 shrink-0 text-subtle" /> : <Laptop className="size-5 shrink-0 text-subtle" />}
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">
                  {d.label} {d.current && <span className="ml-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-normal text-accent">This device</span>}
                </p>
                <p className="text-muted">{d.method} · last active {d.lastSeen}</p>
              </div>
            </div>
            {!d.current && (
              <Button
                size="sm"
                variant="ghost"
                loading={busy === d.id}
                disabled={pending && busy !== d.id}
                onClick={() => {
                  setBusy(d.id);
                  start(async () => {
                    const res = await revokeSessionAction(d.id);
                    setBusy(null);
                    if (!res.ok) return void toast.error(res.error);
                    setRows((r) => r.filter((x) => x.id !== d.id));
                    toast("Signed out");
                  });
                }}
              >
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>
      {others > 0 && (
        <Button
          variant="secondary"
          size="sm"
          loading={pending && busy === null}
          onClick={() =>
            start(async () => {
              const res = await revokeOtherSessionsAction();
              setRows((r) => r.filter((x) => x.current));
              toast.success(`Signed out of ${res.count} other ${res.count === 1 ? "device" : "devices"}`);
            })
          }
        >
          Sign out everywhere else
        </Button>
      )}
    </div>
  );
}
