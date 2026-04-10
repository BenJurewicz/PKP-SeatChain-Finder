"use client";

import React, { useMemo, useState } from "react";
import type { Trip } from "@/lib/domain/types";
import { buildSeatChainOutput, isMultiChainOutput } from "@/lib/domain/seat-chain";
import { buildTravelerViews } from "@/lib/domain/instructions";
import { extractBlockedSeats } from "@/lib/domain/blocked-seats";
import { generateStaticReportHtml } from "@/lib/report";
import type { TripSummary } from "@/lib/report";
import { searchTrips } from "@/lib/services/trips";
import { buildSegments } from "@/lib/services/segments";
import type { RunResponse } from "@/lib/services/run";
import type { Station } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { StationInput } from "@/components/station-input";
import { DateTimeInput } from "@/components/date-time-input";
import { TripList } from "@/components/trip-list";
import { Loader2, Search, AlertCircle } from "lucide-react";
import { downloadReportHtml } from "@/lib/utils/download";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { toPolishIsoString } from "@/lib/formatting";
import { TripSummaryCard } from "@/components/results/TripSummaryCard";
import { CollisionAlert } from "@/components/results/CollisionAlert";
import { StatsCards } from "@/components/results/StatsCards";
import { TravelerTimelines } from "@/components/results/TravelerTimelines";
import { BlockedSeatsSection } from "@/components/blocked-seats-section";
import { DetailedSegmentTable } from "@/components/results/DetailedSegmentTable";

function getDefaultDateTime(): { date: string; time: string } {
  const now = new Date();
  const polishStr = toPolishIsoString(now);
  return {
    date: polishStr.split("T")[0],
    time: polishStr.split("T")[1].slice(0, 5),
  };
}

export default function SearchPage() {
  const [travelers, setTravelers] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);

  const [fromStation, setFromStation] = useState<Station | null>(null);
  const [toStation, setToStation] = useState<Station | null>(null);
  const [tripDate, setTripDate] = useState<string>(() => getDefaultDateTime().date);
  const [tripTime, setTripTime] = useState<string>(() => getDefaultDateTime().time);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [searchStep, setSearchStep] = useState<"stations" | "trips" | "results">("stations");

  const hasCollisions = useMemo(() => {
    if (!result) return false;
    if (isMultiChainOutput(result.seatChain)) {
      return result.seatChain.perSegmentTravelerAssignment.some((seg) => !seg.collisionFree);
    }
    return false;
  }, [result]);

  const resetSearch = () => {
    setTrips([]);
    setSelectedTrip(null);
    setResult(null);
    setError(null);
    setSearchStep("stations");
  };

  async function handleSearchTrips(): Promise<void> {
    if (!fromStation || !toStation) {
      setError("Please select both departure and destination stations.");
      return;
    }
    if (!tripDate || !tripTime) {
      setError("Please select date and time.");
      return;
    }

    setLoading(true);
    setError(null);
    setTrips([]);
    setSelectedTrip(null);
    setResult(null);

    try {
      const results = await searchTrips({
        fromStation,
        toStation,
        date: tripDate,
        time: tripTime,
      });
      setTrips(results);
      setSearchStep("trips");
    } catch (searchError) {
      setError(getFriendlyErrorMessage(searchError));
    } finally {
      setLoading(false);
    }
  }

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
      setSearchStep("results");
    } catch (buildError) {
      setError(getFriendlyErrorMessage(buildError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:px-6">
      {searchStep === "stations" && (
        <Card>
          <CardHeader>
            <CardTitle>Search Train Connections</CardTitle>
            <CardDescription>Find optimal seat arrangements for your journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Departure Station</label>
                  <StationInput
                    value={fromStation}
                    onChange={setFromStation}
                    placeholder="Enter departure station..."
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Destination Station</label>
                  <StationInput
                    value={toStation}
                    onChange={setToStation}
                    placeholder="Enter destination station..."
                    disabled={loading}
                  />
                </div>
              </div>

              <DateTimeInput
                date={tripDate}
                time={tripTime}
                onDateChange={setTripDate}
                onTimeChange={setTripTime}
                disabled={loading}
              />

              <Button
                type="button"
                onClick={handleSearchTrips}
                disabled={loading || !fromStation || !toStation}
                className="w-full md:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Trips
                  </>
                )}
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {searchStep === "trips" && !result && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {fromStation?.name} → {toStation?.name}
                </CardTitle>
                <CardDescription>
                  {tripDate} at {tripTime} &bull; {trips.length} trips found
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
                trips={trips}
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
        <>
          <TripSummaryCard
            tripInfo={result.tripInfo}
            sourceHarName={result.sourceHarName}
            showNewSearchButton={true}
            onNewSearch={resetSearch}
            onDownload={() => downloadReportHtml(result.reportHtml)}
          />

          {hasCollisions && <CollisionAlert />}

          <StatsCards
            seatChain={result.seatChain}
            travelers={travelers}
            onTravelersChange={setTravelers}
            canRecalculate={!!selectedTrip}
            onRecalculate={() => selectedTrip && handleSelectTrip(selectedTrip)}
            isRecalculating={loading}
          />

          <TravelerTimelines travelerViews={result.travelerViews} />

          {result.blockedSeats && result.blockedSeats.length > 0 && (
            <BlockedSeatsSection blockedSeats={result.blockedSeats} />
          )}

          <DetailedSegmentTable seatChain={result.seatChain} />
        </>
      )}
    </div>
  );
}