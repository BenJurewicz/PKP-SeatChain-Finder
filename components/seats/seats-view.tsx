"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResultsSkeleton } from "@/components/skeletons";
import {
  WizardProgress,
  RESULTS_STEP_INDEX,
} from "@/components/wizard/wizard-progress";
import { SeatResults } from "@/components/seat-results";
import { useSeatPipeline } from "@/components/hooks/use-seat-pipeline";
import {
  journeyHref,
  seatsHrefFromQuery,
  seatsQueryTripInfo,
} from "@/lib/journey-params";
import type { SeatsQuery } from "@/lib/journey-params";

interface SeatsViewProps {
  query: SeatsQuery;
  initialTravelers: number;
}

/** Final wizard step for a chosen train. Segments are fetched live for the
 * encoded trip, so refreshing or sharing the link recomputes fresh seats. */
export function SeatsView({ query, initialTravelers }: SeatsViewProps) {
  const router = useRouter();
  const pipeline = useSeatPipeline(initialTravelers);
  const startedRef = useRef(false);

  const segmentRequest = query.segmentRequest;
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void pipeline.loadSegments(segmentRequest, seatsQueryTripInfo(query));
    // Runs once per trip; reloads happen through navigation, not state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentRequest]);

  const journey = query.journey;

  /** Reflect the travelers choice in the URL without triggering a route
   * refresh (the results stay mounted; recalculation is explicit). */
  function syncTravelersToUrl(next: number) {
    pipeline.setTravelers(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", seatsHrefFromQuery(query, next));
    }
  }

  const loading = pipeline.segmentsLoading && !pipeline.output;
  // startedRef becomes true inside the load effect, so the first paint never
  // shows the error card before a load attempt has actually failed.
  const loadFailed =
    startedRef.current && !pipeline.segmentsLoading && pipeline.segmentsData === null;

  return (
    <>
      <WizardProgress
        current={RESULTS_STEP_INDEX}
        onStepClick={(index) => {
          if (index === 0) router.push("/");
          if (index === 1 && journey) {
            router.push(journeyHref(journey, pipeline.travelers));
          }
        }}
        className="mx-auto"
      />

      {loading ? <ResultsSkeleton /> : null}

      {!loading && loadFailed ? <SeatLoadError journey={journey} /> : null}

      {!loading && !loadFailed && pipeline.output ? (
        <SeatResults
          pipeline={pipeline}
          sourceHarName={`${query.trainName} (${query.departureStationName} → ${query.arrivalStationName})`}
          canRecalculate={pipeline.segmentsData !== null}
          onTravelersChange={syncTravelersToUrl}
          onChangeTrip={
            journey ? () => router.push(journeyHref(journey, pipeline.travelers)) : undefined
          }
          onNewSearch={() => router.push("/")}
        />
      ) : null}
    </>
  );
}

/** Friendly error when the seat map for the encoded trip cannot be fetched
 * (e.g. a stale shared link to a train without a seat schematic). */
function SeatLoadError({ journey }: { journey: SeatsQuery["journey"] }) {
  const router = useRouter();
  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <Alert variant="destructive" className="text-left">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Seat data unavailable</AlertTitle>
          <AlertDescription>
            We couldn&apos;t fetch the live seat map for this train. It may not
            have a seat schematic, or the service is temporarily unavailable.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          {journey ? (
            <Button
              variant="outline"
              onClick={() => router.push(journeyHref(journey, 1))}
            >
              Back to trains
            </Button>
          ) : null}
          <Button asChild>
            <Link href="/">Start a new search</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
