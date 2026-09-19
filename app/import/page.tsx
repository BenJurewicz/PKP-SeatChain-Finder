"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/file-upload";
import { HarInstructions } from "@/components/har-instructions";
import { NumberStepper } from "@/components/number-stepper";
import { LoadingButtonLabel } from "@/components/loading";
import { ResultsSkeleton } from "@/components/skeletons";
import { WizardStep, WizardBackButton } from "@/components/wizard/wizard-step";
import { SeatResults } from "@/components/seat-results";
import { useSeatPipeline } from "@/components/hooks/use-seat-pipeline";
import { runHarFile } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

/** Advanced flow: replay a captured HAR request through the seat pipeline.
 * Results render in place — a HAR capture cannot be reconstructed from a URL. */
export default function ImportPage() {
  const router = useRouter();
  const pipeline = useSeatPipeline(1);
  const [harFile, setHarFile] = useState<File | null>(null);
  const [harInstructionsOpen, setHarInstructionsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleHarSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!harFile) {
      setError("Please select a HAR file.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const data = await runHarFile(harFile, pipeline.travelers);
      pipeline.adoptHarResponse(data);
    } catch (submitError) {
      setError(getFriendlyErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setHarFile(null);
    setError(null);
    setHarInstructionsOpen(false);
  }

  if (pipeline.output) {
    return (
      <SeatResults
        pipeline={pipeline}
        sourceHarName={pipeline.tripInfo?.trainName ?? "Imported capture"}
        canRecalculate={pipeline.segmentsData !== null}
        onNewSearch={() => {
          resetAll();
          pipeline.reset();
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
        Advanced mode — replay a captured request
      </p>
      <WizardStep
        title="Import a captured request"
        description="Replay a browser capture (HAR file) through the same seat-finding pipeline."
        footer={<WizardBackButton onClick={() => router.push("/")} label="Live search" />}
      >
        <form className="grid gap-5" onSubmit={handleHarSubmit}>
          <HarInstructions
            open={harInstructionsOpen}
            onOpenChange={setHarInstructionsOpen}
          />
          <FileUpload onChange={setHarFile} accept=".har,application/json" disabled={submitting} />
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Travelers</span>
            <NumberStepper
              value={pipeline.travelers}
              onChange={pipeline.setTravelers}
              min={1}
              max={20}
              disabled={submitting}
              className="scale-90 origin-left"
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full sm:w-56">
            <LoadingButtonLabel
              loading={submitting}
              loadingText="Building seat chains…"
              text="Build seat chains"
            />
          </Button>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </WizardStep>
      {submitting ? (
        <div className="mt-6">
          <ResultsSkeleton />
        </div>
      ) : null}
    </div>
  );
}
