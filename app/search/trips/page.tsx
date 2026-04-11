"use client";

import React, { useEffect, useState } from "react";
import type { Trip } from "@/lib/domain/types";
import { buildSeatChainOutput } from "@/lib/domain/seat-chain";
import { buildTravelerViews } from "@/lib/domain/instructions";
import { extractBlockedSeats } from "@/lib/domain/blocked-seats";
import { generateStaticReportHtml } from "@/lib/report/generate";
import type { TripSummary } from "@/lib/report/types";
import { buildSegments } from "@/lib/services/segments";
import type { RunResponse } from "@/lib/services/run";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TripList } from "@/components/trip-list";
import { AlertCircle } from "lucide-react";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { ResultsView } from "@/components/results";
import { useRouter } from "next/navigation";
import { loadSearchData, clearSearchData } from "@/app/search/page";

interface StoredSearchData {
  fromStation: { name: string };
  toStation: { name: string };
  date: string;
  time: string;
  trips: Trip[];
}

export default function SearchTripsPage() {
  const router = useRouter();
  const [travelers, setTravelers] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const [searchData, setSearchData] = useState<StoredSearchData | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const data = loadSearchData();
    if (!data) {
      router.replace("/search");
      return;
    }
    setSearchData(data);
    setReady(true);
  }, [router]);

  async function handleSelectTrip(trip: Trip): Promise<void> {
    setSelectedTrip(trip);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const segmentsData = await buildSegments({ segmentRequest: trip.segmentRequest });

      const seatChain = buildSeatChainOutput(segmentsData, travelers);
      const travelerViews = buildTravelerViews(seatChain);
      const blockedSeats = extractBlockedSeats(segmentsData);

      const tripSummary: TripSummary = {
        trainName: trip.trainName,
        trainNumber: trip.trainNumber,
        carrierId: trip.carrierId,
        departureStation: trip.departure.stationName,
        arrivalStation: trip.arrival.stationName,
        departureTime: trip.departure.dateTime,
        arrivalTime: trip.arrival.dateTime,
        duration: trip.duration,
      };
      const reportHtml = generateStaticReportHtml(seatChain, travelerViews, tripSummary);

      setResult({
        seatChain,
        travelerViews,
        reportHtml,
        sourceHarName: `${trip.trainName} (${trip.departure.stationName} → ${trip.arrival.stationName})`,
        blockedSeats,
        tripInfo: {
          trainName: trip.trainName,
          carrierId: trip.carrierId,
          departureStation: trip.departure.stationName,
          arrivalStation: trip.arrival.stationName,
          departureTime: trip.departure.dateTime,
          arrivalTime: trip.arrival.dateTime,
          duration: trip.duration,
        },
      });
    } catch (buildError) {
      setError(getFriendlyErrorMessage(buildError));
    } finally {
      setLoading(false);
    }
  }

  function resetSearch() {
    clearSearchData();
    router.push("/search");
  }

  if (!ready) {
    return null;
  }

  if (!searchData) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-6">
      {!result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {searchData.fromStation.name} → {searchData.toStation.name}
                </CardTitle>
                <CardDescription>
                  {searchData.date} at {searchData.time} &bull; {searchData.trips.length} trips found
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={resetSearch}>
                New Search
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="py-4">
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <TripList
                trips={searchData.trips}
                selectedTrip={selectedTrip}
                onSelect={handleSelectTrip}
                disabled={loading}
              />
            )}

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <ResultsView
          result={result}
          travelers={travelers}
          onTravelersChange={setTravelers}
          showNewSearchButton={true}
          onNewSearch={resetSearch}
          canRecalculate={!!selectedTrip}
          onRecalculate={() => selectedTrip && handleSelectTrip(selectedTrip)}
          isRecalculating={loading}
        />
      )}
    </div>
  );
}