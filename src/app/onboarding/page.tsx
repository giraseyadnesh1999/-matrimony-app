import { redirect } from "next/navigation";
import { STEP_IDS } from "@/lib/onboarding/steps";
import { loadWizardState } from "@/server/profile";
import { requireSession } from "@/server/session";
import { Wizard } from "./_components/wizard";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const session = await requireSession();
  if (session.user.status !== "ACTIVE") redirect("/settings/privacy");

  const sp = await searchParams;
  const { values, savedSteps, complete } = await loadWizardState(session.user.id);

  // Resume where the person left off. `?step=community` jumps to a section when editing, but nobody can
  // skip ahead of what they have saved during first-time onboarding.
  const last = STEP_IDS.length - 1;
  const requested = STEP_IDS.indexOf((first(sp.step) ?? "") as (typeof STEP_IDS)[number]);
  let startStep: number;
  if (requested >= 0) startStep = complete ? requested : Math.min(requested, savedSteps);
  else startStep = complete ? 0 : Math.min(savedSteps, last);

  return <Wizard initialValues={values} startStep={startStep} editing={complete} />;
}
