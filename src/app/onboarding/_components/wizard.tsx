"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipSelect } from "@/components/ui/chip-select";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { ABSOLUTE_MIN_AGE, MAX_AGE } from "@/lib/age";
import {
  STEPS,
  validateStep,
  visibleFields,
  withDefaults,
  type FieldDef,
  type FieldErrors,
  type Values,
} from "@/lib/onboarding/steps";
import { saveStepAction } from "../actions";

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -28 }),
};

export function Wizard({
  initialValues,
  startStep,
  editing,
}: {
  initialValues: Values;
  startStep: number;
  editing: boolean;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(startStep);
  const [dir, setDir] = useState(1);
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, start] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Birth-date picker bounds. Lazy initialiser: computed once on mount, not on every render.
  const [dobBounds] = useState(() => {
    const now = new Date();
    const iso = (yearsBack: number) =>
      new Date(Date.UTC(now.getUTCFullYear() - yearsBack, now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10);
    return { max: iso(ABSOLUTE_MIN_AGE), min: iso(MAX_AGE + 1) };
  });

  const step = STEPS[index]!;
  const isLast = index === STEPS.length - 1;
  const fields = visibleFields(step, values);

  // Move focus to the new step's heading (screen readers announce it) and scroll to the top.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  function set(name: string, value: string | string[] | boolean) {
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e) => {
      const { [name]: _removed, ...rest } = e;
      void _removed;
      return rest;
    });
  }

  function focusFirstError(errs: FieldErrors) {
    const name = step.fields.find((f) => errs[f.name])?.name;
    if (!name) return;
    requestAnimationFrame(() => document.getElementById(name)?.focus());
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    const check = validateStep(step.id, values);
    if (!check.ok) {
      setErrors(check.errors);
      focusFirstError(check.errors);
      return;
    }

    start(async () => {
      const res = await saveStepAction(step.id, withDefaults(step, values));
      if (!res.ok) {
        setErrors(res.errors);
        if (res.errors._) toast.error(res.errors._);
        else focusFirstError(res.errors);
        return;
      }
      setErrors({});
      if (res.complete) {
        toast.success(editing ? "Profile updated" : "Your profile is live");
        router.push(editing ? "/profile" : "/discover");
        return;
      }
      setDir(1);
      setIndex(res.nextStep);
    });
  }

  function back() {
    if (index === 0 || pending) return;
    setErrors({});
    setDir(-1);
    setIndex(index - 1);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Step {index + 1} of {STEPS.length}
          </span>
          <span>{step.title}</span>
        </div>
        <Progress value={index + 1} max={STEPS.length} label="Profile progress" />
      </div>

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.form
          key={step.id}
          custom={dir}
          variants={slide}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          noValidate
          onSubmit={submit}
          className="space-y-8"
        >
          <header className="space-y-2">
            <h1 ref={headingRef} tabIndex={-1} className="font-display text-4xl leading-tight tracking-tight outline-none">
              {step.title}
            </h1>
            <p className="text-[15px] leading-relaxed text-muted">{step.subtitle}</p>
          </header>

          <div className="space-y-5">
            <AnimatePresence initial={false}>
              {fields.map((f) => (
                <motion.div
                  key={f.name}
                  layout="position"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  // Padding gives focus rings room; the negative margin cancels it so spacing stays even.
                  className="-m-1 overflow-hidden p-1"
                >
                  <FieldControl
                    def={f}
                    values={values}
                    error={errors[f.name]}
                    disabled={pending}
                    onChange={set}
                    dobBounds={dobBounds}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="sticky bottom-0 -mx-6 flex items-center gap-3 border-t border-border bg-background/85 px-6 py-4 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            {index > 0 && (
              <Button variant="secondary" size="lg" onClick={back} disabled={pending} aria-label="Previous step">
                <ArrowLeft className="size-4" />
                Back
              </Button>
            )}
            <Button type="submit" size="lg" className="flex-1" loading={pending}>
              {isLast ? (editing ? "Save changes" : "Finish and go live") : "Continue"}
            </Button>
          </div>
        </motion.form>
      </AnimatePresence>
    </div>
  );
}

function FieldControl({
  def,
  values,
  error,
  disabled,
  onChange,
  dobBounds,
}: {
  def: FieldDef;
  values: Values;
  error?: string;
  disabled: boolean;
  onChange: (name: string, value: string | string[] | boolean) => void;
  dobBounds: { min: string; max: string };
}) {
  const id = def.name;
  const raw = values[id];
  const str = typeof raw === "string" ? raw : "";

  switch (def.kind) {
    case "toggle":
      return (
        <div>
          <Checkbox
            id={id}
            checked={raw === true}
            disabled={disabled}
            onChange={(e) => onChange(id, e.target.checked)}
            label={def.label}
            description={def.description}
          />
          {error && (
            <p role="alert" className="mt-1.5 pl-8 text-xs text-danger">
              {error}
            </p>
          )}
        </div>
      );

    case "chips":
      return (
        <Field label={def.label} htmlFor={id} hint={def.hint} error={error} optional={def.optional}>
          <ChipSelect
            label={def.label}
            options={def.options}
            value={Array.isArray(raw) ? raw : []}
            max={def.max}
            onChange={(next) => onChange(id, next)}
          />
        </Field>
      );

    case "select": {
      const options = typeof def.options === "function" ? def.options(values) : def.options;
      return (
        <Field label={def.label} htmlFor={id} hint={def.hint} error={error} optional={def.optional}>
          <Select
            id={id}
            name={id}
            value={str}
            options={options}
            placeholder={def.placeholder}
            disabled={disabled}
            invalid={!!error}
            onChange={(e) => onChange(id, e.target.value)}
          />
        </Field>
      );
    }

    case "textarea":
      return (
        <Field label={def.label} htmlFor={id} hint={def.hint} error={error} optional={def.optional}>
          <Textarea
            id={id}
            name={id}
            value={str}
            maxLength={def.maxLength}
            placeholder={def.placeholder}
            disabled={disabled}
            invalid={!!error}
            onChange={(e) => onChange(id, e.target.value)}
          />
          <p className="text-right text-xs tabular-nums text-subtle">
            {str.length}/{def.maxLength}
          </p>
        </Field>
      );

    case "date":
      return (
        <Field label={def.label} htmlFor={id} hint={def.hint} error={error} optional={def.optional}>
          <Input
            id={id}
            name={id}
            type="date"
            value={str}
            min={dobBounds.min}
            max={dobBounds.max}
            autoComplete="bday"
            disabled={disabled}
            invalid={!!error}
            onChange={(e) => onChange(id, e.target.value)}
            className="appearance-none"
          />
        </Field>
      );

    case "time":
      return (
        <Field label={def.label} htmlFor={id} hint={def.hint} error={error} optional={def.optional}>
          <Input
            id={id}
            name={id}
            type="time"
            value={str}
            disabled={disabled}
            invalid={!!error}
            onChange={(e) => onChange(id, e.target.value)}
            className="appearance-none"
          />
        </Field>
      );

    default:
      return (
        <Field label={def.label} htmlFor={id} hint={def.hint} error={error} optional={def.optional}>
          <Input
            id={id}
            name={id}
            type="text"
            value={str}
            maxLength={def.maxLength}
            placeholder={def.placeholder}
            autoComplete={def.autoComplete ?? "off"}
            disabled={disabled}
            invalid={!!error}
            onChange={(e) => onChange(id, e.target.value)}
          />
        </Field>
      );
  }
}
