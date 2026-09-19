"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, AtSign } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { parseIdentifier, looksLikeEmail } from "@/lib/identifier";
import { cn } from "@/lib/utils";
import { requestOtpAction, verifyOtpAction } from "../actions";
import { FacebookIcon, GoogleIcon } from "./social-icons";

type Provider = "google" | "facebook";
type Sent = { identifier: string; masked: string; kind: "email" | "phone" };
type Errors = { identifier?: string; consent?: string; age?: string; code?: string; form?: string };

const PROVIDER_LABEL: Record<Provider, string> = { google: "Google", facebook: "Facebook" };

export function AuthForm({
  mode,
  providers,
  next,
  initialError,
  devMode,
}: {
  mode: "login" | "signup";
  providers: Provider[];
  next?: string;
  initialError?: string;
  devMode: boolean;
}) {
  const [step, setStep] = useState<"identify" | "verify">("identify");
  const [identifier, setIdentifier] = useState("");
  const [consent, setConsent] = useState(false);
  const [age, setAge] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<Errors>(initialError ? { form: initialError } : {});
  const [sent, setSent] = useState<Sent | null>(null);
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [social, setSocial] = useState<Provider | null>(null);

  const [pending, start] = useTransition();
  const [resending, startResend] = useTransition();
  const codeRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);

  const isSignup = mode === "signup";
  const typedEmail = looksLikeEmail(identifier);
  const busy = pending || resending || social !== null;

  // Resend countdown. Interval-driven so the button re-enables itself without user action.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  function validateIdentify(): boolean {
    const next: Errors = {};
    const parsed = parseIdentifier(identifier);
    if (!parsed.ok) next.identifier = parsed.error;
    if (isSignup && !consent) next.consent = "Please accept the Terms and Privacy Notice to continue.";
    if (isSignup && !age) next.age = "You must be 18 or older to join.";
    setErrors(next);
    if (next.identifier) idRef.current?.focus();
    return Object.keys(next).length === 0;
  }

  function sendCode(resend = false) {
    if (!resend && !validateIdentify()) return;
    const run = resend ? startResend : start;
    run(async () => {
      const res = await requestOtpAction({ identifier: sent?.identifier ?? identifier, mode, consent, age, marketing });
      if (!res.ok) {
        if (resend) toast.error(res.error);
        else setErrors(res.field ? { [res.field]: res.error } : { form: res.error });
        return;
      }
      setSent({ identifier: res.identifier, masked: res.masked, kind: res.kind });
      setSecondsLeft(res.cooldownSec);
      setErrors({});
      if (resend) {
        toast.success("New code sent");
        setCode("");
        codeRef.current?.focus();
      } else {
        setStep("verify");
      }
    });
  }

  function submitCode(value: string) {
    if (!sent || pending) return;
    setErrors({});
    start(async () => {
      // On success the server action redirects, so this promise never resolves and the button
      // stays in its loading state until the next page is ready: no flash of an idle form.
      const res = await verifyOtpAction({ identifier: sent.identifier, code: value, next });
      if (res && !res.ok) {
        setErrors({ code: res.error });
        setCode("");
        codeRef.current?.focus();
      }
    });
  }

  function goSocial(p: Provider) {
    if (isSignup) {
      const next: Errors = {};
      if (!consent) next.consent = "Please accept the Terms and Privacy Notice to continue.";
      if (!age) next.age = "You must be 18 or older to join.";
      if (Object.keys(next).length) {
        setErrors(next);
        return;
      }
    }
    setSocial(p);
    const q = new URLSearchParams({ intent: mode });
    if (isSignup) {
      q.set("consent", "1");
      q.set("age", "1");
      if (marketing) q.set("marketing", "1");
    }
    if (next) q.set("next", next);
    // Full-page navigation on purpose: this is a route handler that redirects to the provider.
    window.location.assign(new URL(`/api/auth/${p}?${q}`, window.location.origin).href);
  }

  function changeIdentifier() {
    setStep("identify");
    setCode("");
    setErrors({});
    requestAnimationFrame(() => idRef.current?.focus());
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait" initial={false}>
        {step === "identify" ? (
          <motion.div
            key="identify"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <header className="mb-8 space-y-2">
              <h1 className="font-display text-4xl leading-tight tracking-tight">
                {isSignup ? "Create your profile" : "Welcome back"}
              </h1>
              <p className="text-[15px] leading-relaxed text-muted">
                {isSignup
                  ? "Free to join. Your details stay private until you choose to share them."
                  : "Log in with your mobile number or email. We'll send a one-time code."}
              </p>
            </header>

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                sendCode();
              }}
              className="space-y-5"
            >
              {errors.form && (
                <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
                  {errors.form}
                </p>
              )}

              <Field label="Mobile number or email" htmlFor="identifier" error={errors.identifier}>
                <div className="relative">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center gap-1 text-sm text-muted"
                  >
                    {typedEmail ? <AtSign className="size-4" /> : <span className="tabular-nums">+91</span>}
                  </span>
                  <Input
                    ref={idRef}
                    id="identifier"
                    name="identifier"
                    // "text" (not "email"/"tel") so one field can take either kind without the browser rejecting it.
                    type="text"
                    inputMode={typedEmail ? "email" : "tel"}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoFocus
                    placeholder="98765 43210 or you@example.com"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errors.identifier) setErrors((s) => ({ ...s, identifier: undefined }));
                    }}
                    invalid={!!errors.identifier}
                    className={cn(typedEmail ? "pl-10" : "pl-12")}
                    disabled={busy}
                  />
                </div>
              </Field>

              {isSignup && (
                <fieldset className="space-y-3.5 rounded-2xl border border-border bg-card/60 p-4">
                  <legend className="sr-only">Consent</legend>
                  <div>
                    <Checkbox
                      checked={consent}
                      onChange={(e) => {
                        setConsent(e.target.checked);
                        setErrors((s) => ({ ...s, consent: undefined }));
                      }}
                      disabled={busy}
                      label={
                        <>
                          I agree to the{" "}
                          <Link href="/terms" target="_blank" className="underline underline-offset-2 hover:text-accent">
                            Terms
                          </Link>{" "}
                          and have read the{" "}
                          <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-accent">
                            Privacy Notice
                          </Link>
                          . I consent to {`Saathi`} using the details I enter to run my account and profile.
                        </>
                      }
                    />
                    {errors.consent && <p role="alert" className="mt-1.5 pl-8 text-xs text-danger">{errors.consent}</p>}
                  </div>
                  <div>
                    <Checkbox
                      checked={age}
                      onChange={(e) => {
                        setAge(e.target.checked);
                        setErrors((s) => ({ ...s, age: undefined }));
                      }}
                      disabled={busy}
                      label="I am 18 years or older."
                    />
                    {errors.age && <p role="alert" className="mt-1.5 pl-8 text-xs text-danger">{errors.age}</p>}
                  </div>
                  <Checkbox
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    disabled={busy}
                    label="Send me occasional tips and offers."
                    description="Optional. You can change this any time in Settings."
                  />
                </fieldset>
              )}

              <Button type="submit" size="lg" className="w-full" loading={pending} disabled={busy && !pending}>
                Continue
              </Button>
            </form>

            {providers.length > 0 && (
              <>
                <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-wider text-subtle">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid gap-3">
                  {providers.map((p) => (
                    <Button
                      key={p}
                      variant="secondary"
                      size="lg"
                      className="w-full"
                      onClick={() => goSocial(p)}
                      loading={social === p}
                      disabled={busy && social !== p}
                    >
                      {social !== p && (p === "google" ? <GoogleIcon className="size-5" /> : <FacebookIcon className="size-5" />)}
                      Continue with {PROVIDER_LABEL[p]}
                    </Button>
                  ))}
                </div>
              </>
            )}

            <p className="mt-8 text-center text-sm text-muted">
              {isSignup ? "Already a member?" : "New to Saathi?"}{" "}
              <Link
                href={{ pathname: isSignup ? "/login" : "/signup", query: next ? { next } : {} }}
                className="font-medium text-foreground underline underline-offset-4 hover:text-accent"
              >
                {isSignup ? "Log in" : "Create a profile"}
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="verify"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <button
              type="button"
              onClick={changeIdentifier}
              disabled={pending}
              className="mb-6 -ml-1 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm text-muted transition-colors hover:text-foreground disabled:opacity-50"
            >
              <ArrowLeft className="size-4" />
              {sent?.kind === "email" ? "Use a different email" : "Use a different number"}
            </button>

            <header className="mb-8 space-y-2">
              <h1 className="font-display text-4xl leading-tight tracking-tight">Enter your code</h1>
              <p className="text-[15px] leading-relaxed text-muted">
                We sent a 6-digit code to <span className="font-medium text-foreground">{sent?.masked}</span>.
                {!isSignup && " If you have an account, it will arrive in a few seconds."}
              </p>
            </header>

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (code.length === 6) submitCode(code);
                else setErrors({ code: "Enter the 6-digit code." });
              }}
              className="space-y-5"
            >
              <Field label="Verification code" htmlFor="code" error={errors.code}>
                <Input
                  ref={codeRef}
                  id="code"
                  name="code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  placeholder="······"
                  value={code}
                  disabled={pending}
                  invalid={!!errors.code}
                  className="h-14 text-center font-mono text-2xl tracking-[0.5em] placeholder:tracking-[0.5em]"
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setCode(digits);
                    if (errors.code) setErrors({});
                    if (digits.length === 6) submitCode(digits); // auto-submit: no extra tap needed
                  }}
                />
              </Field>

              {devMode && (
                <p className="rounded-xl bg-accent-soft px-4 py-3 text-xs leading-relaxed text-muted">
                  Development mode: no SMS or email is sent. Find the code in the terminal running <code>npm run dev</code>.
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" loading={pending} disabled={code.length < 6 && !pending}>
                {isSignup ? "Verify and create account" : "Verify and log in"}
              </Button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
              <span>Didn&apos;t get it?</span>
              <button
                type="button"
                onClick={() => sendCode(true)}
                disabled={secondsLeft > 0 || busy}
                className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 transition-colors enabled:hover:text-accent enabled:hover:underline disabled:text-subtle"
              >
                {resending && <Spinner className="size-3.5" />}
                {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
              </button>
            </div>
            {!isSignup && (
              <p className="mt-3 text-center text-xs text-subtle">
                No account yet?{" "}
                <Link href={{ pathname: "/signup", query: next ? { next } : {} }} className="underline underline-offset-2 hover:text-accent">
                  Create one
                </Link>
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
