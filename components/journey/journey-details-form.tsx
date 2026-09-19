"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight, FileInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StationInput } from "@/components/station-input";
import { DateTimePicker } from "@/components/date-time-picker";
import { Field } from "@/components/form-field";
import { LoadingButtonLabel } from "@/components/loading";
import { WizardStep } from "@/components/wizard/wizard-step";
import { journeyHref } from "@/lib/journey-params";
import { nowPolish } from "@/lib/formatting";
import type { Station } from "@/lib/types";

/** First question: where and when. Submitting navigates to /trains, whose
 * URL encodes the whole journey so the train list can be linked or refreshed. */
export function JourneyDetailsForm() {
  const router = useRouter();
  const [fromStation, setFromStation] = useState<Station | null>(null);
  const [toStation, setToStation] = useState<Station | null>(null);
  const [tripDate, setTripDate] = useState<string>(() => nowPolish().date);
  const [tripTime, setTripTime] = useState<string>(() => nowPolish().time);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fromStation || !toStation) {
      setError("Please select both departure and destination stations.");
      return;
    }
    if (!tripDate || !tripTime) {
      setError("Please select date and time.");
      return;
    }
    router.push(journeyHref({ from: fromStation, to: toStation, date: tripDate, time: tripTime }));
  }

  return (
    <WizardStep
      wide
      title="Where and when do you travel?"
      description="Pick your route and the earliest departure time — times are in the Polish timezone."
      footer={
        <>
          <span className="text-xs text-muted-foreground">
            Tip: press Enter to search
          </span>
          <Button
            type="submit"
            form="journey-details"
            disabled={!fromStation || !toStation || !tripDate || !tripTime}
            className="min-w-40"
          >
            <LoadingButtonLabel text="Find trains" icon={<Search className="mr-2 h-4 w-4" />} />
          </Button>
        </>
      }
    >
      <form id="journey-details" onSubmit={handleSubmit}>
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
          <Field label="From" htmlFor="from-station">
            <StationInput
              value={fromStation}
              onChange={setFromStation}
              placeholder="Departure station…"
            />
          </Field>
          <ArrowRight
            aria-hidden="true"
            className="mx-auto mt-9 hidden h-4 w-4 text-muted-foreground md:block"
          />
          <Field label="To" htmlFor="to-station">
            <StationInput
              value={toStation}
              onChange={setToStation}
              placeholder="Destination station…"
            />
          </Field>
        </div>

        <div className="mt-4">
          <DateTimePicker
            date={tripDate}
            time={tripTime}
            onDateChange={setTripDate}
            onTimeChange={setTripTime}
          />
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/import"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <FileInput className="h-4 w-4" />
            Have a captured HAR file? Import it instead
          </Link>
        </div>
      </form>
    </WizardStep>
  );
}
