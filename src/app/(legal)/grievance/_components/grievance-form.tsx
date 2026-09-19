"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { GRIEVANCE_CATEGORIES } from "@/lib/reference";
import { submitGrievanceAction, type GrievanceResult } from "../actions";

export function GrievanceForm({ hours, days }: { hours: number; days: number }) {
  const [v, setV] = useState({ name: "", contact: "", category: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Extract<GrievanceResult, { ok: true }> | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div role="status" className="animate-fade-up space-y-3 rounded-2xl border border-border bg-card p-6 shadow-card">
        <CheckCircle2 className="size-8 text-success" />
        <h2 className="font-display text-3xl">We&apos;ve got it</h2>
        <p className="text-sm leading-relaxed text-muted">
          Your reference is <strong className="font-mono text-foreground">{done.reference}</strong>. Keep it safe. We will acknowledge your
          request within {hours} hours and resolve it by{" "}
          {new Date(done.resolveBy).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
        <Button variant="secondary" onClick={() => { setDone(null); setV({ name: "", contact: "", category: "", message: "" }); }}>
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await submitGrievanceAction(v);
          if (!res.ok) return setErrors({ [res.field ?? "_"]: res.error });
          setErrors({});
          setDone(res);
        });
      }}
      className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6"
    >
      <Field label="Your name" htmlFor="g-name" error={errors.name}>
        <Input id="g-name" value={v.name} autoComplete="name" onChange={(e) => setV({ ...v, name: e.target.value })} invalid={!!errors.name} />
      </Field>
      <Field label="Email or mobile number" htmlFor="g-contact" error={errors.contact} hint="So we can reply. Stored encrypted.">
        <Input id="g-contact" value={v.contact} autoComplete="email" onChange={(e) => setV({ ...v, contact: e.target.value })} invalid={!!errors.contact} />
      </Field>
      <Field label="What is this about?" htmlFor="g-category" error={errors.category}>
        <Select id="g-category" value={v.category} options={GRIEVANCE_CATEGORIES} placeholder="Choose a topic" onChange={(e) => setV({ ...v, category: e.target.value })} invalid={!!errors.category} />
      </Field>
      <Field label="Details" htmlFor="g-message" error={errors.message} hint={`We respond within ${days} days at the latest.`}>
        <Textarea id="g-message" value={v.message} maxLength={3000} onChange={(e) => setV({ ...v, message: e.target.value })} invalid={!!errors.message} />
      </Field>
      {errors._ && <p role="alert" className="text-sm text-danger">{errors._}</p>}
      <SubmitButtonPending pending={pending} />
    </form>
  );
}

// `useFormStatus` does not see transitions started by onSubmit, so this button takes `pending` explicitly.
function SubmitButtonPending({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" size="lg" className="w-full" loading={pending}>
      Submit
    </Button>
  );
}

