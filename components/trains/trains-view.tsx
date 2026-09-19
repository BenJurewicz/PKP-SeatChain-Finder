"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WizardProgress } from "@/components/wizard/wizard-progress";
import { WizardStep, WizardBackButton } from "@/components/wizard/wizard-step";
import { TripList } from "@/components/trip-list";
import { searchTrips } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { journeyHref, seatsHref } from "@/lib/journey-params";
import {
  EARLIER_WINDOW_MINUTES,
  stableTripKey,
  sortTrips,
  withSequentialIndices,
  shiftWallClock,
} from "@/lib/trip-utils";
import type { JourneyQuery } from "@/lib/journey-params";
import type { Trip } from "@/lib/types";

interface TrainsViewProps {
  journey: JourneyQuery;
  /** Server-fetched initial window of trains. */
  initialTrips: Trip[];
  /** Travelers count carried through from a shared /seats link. */
  travelers: number;
}

/** Second question: which train. Server-fetched list, expandable backwards
 * and forwards; selecting a train deep-links to /seats. */
export function TrainsView({ journey, initialTrips, travelers }: TrainsViewProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>(() =>
    withSequentialIndices(sortTrips(initialTrips)),
  );
  const [earlierLoading, setEarlierLoading] = useState(false);
  const [laterLoading, setLaterLoading] = useState(false);
  const [earlierExhausted, setEarlierExhausted] = useState(false);
  const [laterExhausted, setLaterExhausted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { from, to, date, time } = journey;

  const journeySummaryLabel = `${from.name} → ${to.name} · ${date} ${time}`;

  /** Load the window of trains before/after the currently listed ones and
   * merge it into the list. Marks the direction exhausted when the new
   * window contains no unseen trains. */
  async function loadMoreTrips(direction: "earlier" | "later"): Promise<void> {
    if (trips.length === 0) return;
    const loading = direction === "earlier" ? earlierLoading : laterLoading;
    const exhausted = direction === "earlier" ? earlierExhausted : laterExhausted;
    if (loading || exhausted) return;

    const boundary = direction === "earlier" ? trips[0] : trips[trips.length - 1];
    const anchor =
      direction === "earlier"
        ? shiftWallClock(boundary.departure.dateTime, -EARLIER_WINDOW_MINUTES)
        : shiftWallClock(boundary.departure.dateTime, 1);

    const setBusy = direction === "earlier" ? setEarlierLoading : setLaterLoading;
    const setExhausted = direction === "earlier" ? setEarlierExhausted : setLaterExhausted;

    setBusy(true);
    setError(null);
    try {
      const incoming = await searchTrips(from, to, anchor.date, anchor.time);
      const existingKeys = new Set(trips.map(stableTripKey));
      const boundaryDeparture = boundary.departure.dateTime;
      const fresh = incoming.filter(
        (trip) =>
          trip.departure.dateTime.length > 0 &&
          !existingKeys.has(stableTripKey(trip)) &&
          (direction === "earlier"
            ? trip.departure.dateTime < boundaryDeparture
            : trip.departure.dateTime > boundaryDeparture),
      );
      if (fresh.length === 0) {
        setExhausted(true);
        return;
      }
      setTrips(withSequentialIndices(sortTrips([...trips, ...fresh])));
    } catch (loadError) {
      setError(getFriendlyErrorMessage(loadError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <WizardProgress
        current={1}
        onStepClick={(index) => index === 0 && router.push(journeyHref(journey, travelers))}
        className="mx-auto"
      />
      <WizardStep
        wide
        title="Which train suits you?"
        description={`${trips.length} ${trips.length === 1 ? "train" : "trains"} on this route`}
        chips={[
          {
            label: journeySummaryLabel,
            onClick: () => router.push("/"),
            ariaLabel: "Change journey details",
          },
        ]}
        footer={<WizardBackButton onClick={() => router.push("/")} />}
      >
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <TripList
          trips={trips}
          selectedTrip={null}
          onSelect={(trip) => router.push(seatsHref(trip, journey, travelers))}
          onLoadEarlier={() => loadMoreTrips("earlier")}
          onLoadLater={() => loadMoreTrips("later")}
          earlierLoading={earlierLoading}
          laterLoading={laterLoading}
          earlierExhausted={earlierExhausted}
          laterExhausted={laterExhausted}
        />
      </WizardStep>
    </>
  );
}
