import type { Metadata } from "next";
import { WizardProgress } from "@/components/wizard/wizard-progress";
import { JourneyDetailsForm } from "@/components/journey/journey-details-form";

export const metadata: Metadata = {
  title: "Seatway — find your PKP seats",
};

/** Home: the first wizard question. All state lives in the URL afterwards. */
export default function HomePage() {
  return (
    <>
      <WizardProgress current={0} className="mx-auto" />
      <JourneyDetailsForm />
    </>
  );
}
