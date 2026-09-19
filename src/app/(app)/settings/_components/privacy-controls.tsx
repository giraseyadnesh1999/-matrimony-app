"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { CONSENT_PURPOSES, OPTIONAL_PURPOSES, type ConsentPurpose } from "@/lib/consent";
import { NOMINEE_RELATIONS } from "@/lib/reference";
import {
  removeNomineeAction,
  requestDeletionAction,
  saveNomineeAction,
  setConsentAction,
  setVisibilityAction,
} from "../actions";

export function ConsentToggles({ initial }: { initial: Record<ConsentPurpose, boolean> }) {
  const [state, setState] = useState(initial);
  const [, start] = useTransition();
  const [busy, setBusy] = useState<ConsentPurpose | null>(null);

  function toggle(p: ConsentPurpose) {
    const next = !state[p];
    setState((s) => ({ ...s, [p]: next }));
    setBusy(p);
    start(async () => {
      const res = await setConsentAction(p, next);
      setBusy(null);
      if (!res.ok) {
        setState((s) => ({ ...s, [p]: !next })); // roll back
        toast.error(res.error);
        return;
      }
      if (next) toast.success("Consent recorded");
      else toast(`Consent withdrawn. ${CONSENT_PURPOSES[p].withdrawEffect}`);
    });
  }

  return (
    <ul className="divide-y divide-border">
      <li className="flex items-start justify-between gap-4 py-4 first:pt-0">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-[15px] font-medium">
            {CONSENT_PURPOSES.core_service.title}
            <Lock className="size-3.5 text-subtle" aria-label="Required" />
          </p>
          <p className="text-sm leading-relaxed text-muted">{CONSENT_PURPOSES.core_service.description}</p>
          <p className="text-xs leading-relaxed text-subtle">{CONSENT_PURPOSES.core_service.withdrawEffect}</p>
        </div>
        <span className="mt-1 shrink-0 text-xs font-medium text-success">Given</span>
      </li>
      {OPTIONAL_PURPOSES.map((p) => (
        <li key={p} className="flex items-start justify-between gap-4 py-4 last:pb-0">
          <div className="space-y-1">
            <label htmlFor={`consent-${p}`} className="block cursor-pointer text-[15px] font-medium">
              {CONSENT_PURPOSES[p].title}
            </label>
            <p className="text-sm leading-relaxed text-muted">{CONSENT_PURPOSES[p].description}</p>
            <p className="text-xs leading-relaxed text-subtle">If you turn this off: {CONSENT_PURPOSES[p].withdrawEffect}</p>
          </div>
          <Switch
            id={`consent-${p}`}
            checked={state[p]}
            disabled={busy === p}
            onClick={() => toggle(p)}
            aria-label={CONSENT_PURPOSES[p].title}
            className="mt-0.5"
          />
        </li>
      ))}
    </ul>
  );
}

export function VisibilityToggles({ hidden, hideLastName }: { hidden: boolean; hideLastName: boolean }) {
  const [state, setState] = useState({ isHidden: hidden, hideLastName });
  const [, start] = useTransition();

  function toggle(field: "isHidden" | "hideLastName") {
    const next = !state[field];
    setState((s) => ({ ...s, [field]: next }));
    start(async () => {
      const res = await setVisibilityAction(field, next);
      if (!res.ok) {
        setState((s) => ({ ...s, [field]: !next }));
        toast.error(res.error);
      } else {
        toast.success(field === "isHidden" ? (next ? "Profile hidden" : "Profile visible") : "Saved");
      }
    });
  }

  return (
    <ul className="divide-y divide-border">
      <li className="flex items-start justify-between gap-4 py-4 first:pt-0">
        <div className="space-y-1">
          <label htmlFor="vis-hidden" className="block cursor-pointer text-[15px] font-medium">Pause my profile</label>
          <p className="text-sm leading-relaxed text-muted">
            Hide it from search and stop new interests. Existing connections are unaffected. Turn it back on any time.
          </p>
        </div>
        <Switch id="vis-hidden" checked={state.isHidden} onClick={() => toggle("isHidden")} aria-label="Pause my profile" className="mt-0.5" />
      </li>
      <li className="flex items-start justify-between gap-4 py-4 last:pb-0">
        <div className="space-y-1">
          <label htmlFor="vis-surname" className="block cursor-pointer text-[15px] font-medium">Show only my surname initial</label>
          <p className="text-sm leading-relaxed text-muted">Other members see &ldquo;Priya S.&rdquo; instead of your full name.</p>
        </div>
        <Switch id="vis-surname" checked={state.hideLastName} onClick={() => toggle("hideLastName")} aria-label="Show only my surname initial" className="mt-0.5" />
      </li>
    </ul>
  );
}

export function NomineeForm({ initial }: { initial: { name: string; relation: string; contact: string } | null }) {
  const [editing, setEditing] = useState(!initial);
  const [values, setValues] = useState(initial ?? { name: "", relation: "", contact: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!editing && initial) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm">
          <p className="font-medium">{initial.name}</p>
          <p className="text-muted">
            {NOMINEE_RELATIONS.find((r) => r.value === initial.relation)?.label} · {initial.contact}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Change</Button>
          <Button
            size="sm"
            variant="ghost"
            loading={pending}
            onClick={() => start(async () => { await removeNomineeAction(); toast("Nominee removed"); router.refresh(); })}
          >
            Remove
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveNomineeAction(values);
          if (!res.ok) return setErrors({ [res.field ?? "_"]: res.error });
          setErrors({});
          setEditing(false);
          toast.success("Nominee saved");
          router.refresh();
        });
      }}
    >
      <Field label="Nominee's name" htmlFor="nom-name" error={errors.name}>
        <Input id="nom-name" value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} autoComplete="off" invalid={!!errors.name} />
      </Field>
      <Field label="Relationship" htmlFor="nom-relation" error={errors.relation}>
        <Select id="nom-relation" value={values.relation} options={NOMINEE_RELATIONS} placeholder="Choose" onChange={(e) => setValues({ ...values, relation: e.target.value })} invalid={!!errors.relation} />
      </Field>
      <Field label="Their phone or email" htmlFor="nom-contact" error={errors.contact}>
        <Input id="nom-contact" value={values.contact} onChange={(e) => setValues({ ...values, contact: e.target.value })} autoComplete="off" invalid={!!errors.contact} />
      </Field>
      {errors._ && <p role="alert" className="text-sm text-danger">{errors._}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={pending}>Save nominee</Button>
        {initial && <Button variant="ghost" onClick={() => { setEditing(false); setErrors({}); }}>Cancel</Button>}
      </div>
    </form>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  return (
    <ConfirmDialog
      destructive
      title="Delete your account?"
      description={
        <>
          Your profile is hidden immediately and everything is <strong>permanently erased after 7 days</strong>: profile, preferences,
          interests, consents and sign-in details. Log in any time during those 7 days to cancel.
        </>
      }
      confirmLabel="Delete my account"
      confirmDisabled={confirm.trim().toUpperCase() !== "DELETE"}
      trigger={(open) => (
        <Button variant="danger-ghost" onClick={open}>
          Delete my account
        </Button>
      )}
      onConfirm={async () => {
        const res = await requestDeletionAction();
        if (!res.ok) {
          toast.error(res.error);
          return false;
        }
        setConfirm("");
        toast("Account scheduled for deletion");
        router.refresh();
      }}
    >
      <Field label="Type DELETE to confirm" htmlFor="delete-confirm">
        <Input id="delete-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" autoCapitalize="characters" />
      </Field>
    </ConfirmDialog>
  );
}
