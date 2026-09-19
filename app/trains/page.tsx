import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findTrips } from "@/lib/trip-search";
import { decodeJourneyQuery, decodeTravelers } from "@/lib/journey-params";
import { TrainsView } from "@/components/trains/trains-view";

export const metadata: Metadata = {
  title: "Seatway — trains on your route",
};

/** Train list for a journey encoded in the URL. Fetching happens on the
 * server, so the list renders for anyone opening a shared link. */
export default async function TrainsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const journey = decodeJourneyQuery(params);
  if (!journey) notFound();

  const dateTime = new Date(`${journey.date}T${journey.time}:00`);
  const trips = await findTrips(journey.from, journey.to, dateTime);

  return (
    <TrainsView journey={journey} initialTrips={trips} travelers={decodeTravelers(params)} />
  );
}
