"use client";

import React, { FormEvent, useMemo, useState } from "react";
import type { TravelerView } from "@/lib/instructions";
import { isMultiChainOutput, type SeatChainOutput } from "@/lib/seat-chain";
import type { Station, Trip } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUpload } from "@/components/file-upload";
import { StationInput } from "@/components/station-input";
import { DateTimeInput } from "@/components/date-time-input";
import { TripList } from "@/components/trip-list";
import { CoverageProgress } from "@/components/coverage-progress";
import { SeatTimeline } from "@/components/seat-timeline";
import { Loader2, Download, AlertCircle, CheckCircle2, XCircle, Train, Users, Search, Upload, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { parseSeat } from "@/lib/utils";

type RunResponse = {
  seatChain: SeatChainOutput;
  travelerViews: TravelerView[];
  reportHtml: string;
  sourceHarName: string;
};

function downloadReportHtml(html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "seat-chain-report.html";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getDefaultDateTime(): { date: string; time: string } {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().slice(0, 5);
  return { date, time };
}

export default function Home() {
  const [mode, setMode] = useState<"search" | "har">("search");
  const [travelers, setTravelers] = useState(1);
  const [harFile, setHarFile] = useState<File | null>(null);
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
  const [showDetailedView, setShowDetailedView] = useState(false);

  const hasCollisions = useMemo(() => {
    if (!result) return false;
    if (isMultiChainOutput(result.seatChain)) {
      return result.seatChain.perSegmentTravelerAssignment.some((seg) => !seg.collisionFree);
    }
    return false;
  }, [result]);

  const coverageData = useMemo(() => {
    if (!result) return null;
    if (isMultiChainOutput(result.seatChain)) {
      return {
        covered: result.seatChain.summary.coveredTravelerSegments,
        total: result.seatChain.summary.totalTravelerSegments,
      };
    }
    return {
      covered: result.seatChain.summary.coveredSegments,
      total: result.seatChain.summary.totalSegments,
    };
  }, [result]);

  const seatChangesCount = useMemo(() => {
    if (!result) return 0;
    if (isMultiChainOutput(result.seatChain)) {
      return result.seatChain.summary.totalSeatChanges;
    }
    return result.seatChain.summary.seatChanges;
  }, [result]);

  const resetSearch = () => {
    setTrips([]);
    setSelectedTrip(null);
    setResult(null);
    setError(null);
    setSearchStep("stations");
    setShowDetailedView(false);
  };

  async function handleHarSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!harFile) {
      setError("Please select a HAR file.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.set("harFile", harFile);
      formData.set("travelers", String(travelers));

      const response = await fetch("/api/run", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as Partial<RunResponse> & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Pipeline failed");
      }
      if (!data.seatChain || !data.travelerViews || !data.reportHtml || !data.sourceHarName) {
        throw new Error("Invalid API response");
      }
      setResult({
        seatChain: data.seatChain,
        travelerViews: data.travelerViews,
        reportHtml: data.reportHtml,
        sourceHarName: data.sourceHarName,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

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
      const response = await fetch("/api/trips/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromStation,
          toStation,
          date: tripDate,
          time: tripTime,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to search trips");
      }
      setTrips(data.trips || []);
      setSearchStep("trips");
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Unknown error");
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
      const segmentRequest = trip.segmentRequest;

      const response = await fetch("/api/segments/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segmentRequest }),
      });
      const segmentsData = await response.json();
      if (!response.ok) {
        throw new Error(segmentsData.error ?? "Failed to build segments");
      }

      const { buildSeatChainOutput } = await import("@/lib/seat-chain");
      const { buildTravelerViews } = await import("@/lib/instructions");
      const { generateStaticReportHtml } = await import("@/lib/report");

      const seatChain = buildSeatChainOutput(segmentsData, travelers);
      const travelerViews = buildTravelerViews(seatChain);
      const reportHtml = generateStaticReportHtml(seatChain, travelerViews);

      setResult({
        seatChain,
        travelerViews,
        reportHtml,
        sourceHarName: `${trip.trainName} (${trip.departure.stationName} → ${trip.arrival.stationName})`,
      });
      setSearchStep("results");
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 md:px-6">
      <div className="text-center mb-2">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Train className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Seat Chain Builder</h1>
        </div>
        <p className="text-muted-foreground">Find optimal seat arrangements for your train journey</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setMode("search");
                resetSearch();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                mode === "search"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <Search className="h-4 w-4" />
              Search Connections
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("har");
                setResult(null);
                setError(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                mode === "har"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <Upload className="h-4 w-4" />
              Upload HAR File
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {mode === "har" ? (
            <form className="grid gap-4" onSubmit={handleHarSubmit}>
              <FileUpload
                onChange={setHarFile}
                accept=".har,application/json"
                disabled={loading}
              />
              <div className="grid gap-4 md:grid-cols-[160px_auto]">
                <div className="space-y-2">
                  <label htmlFor="travelers" className="text-sm font-medium flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    Travelers
                  </label>
                  <Input
                    id="travelers"
                    type="number"
                    min={1}
                    max={20}
                    value={travelers}
                    onChange={(event) => setTravelers(Number(event.target.value))}
                    disabled={loading}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={loading} className="w-full md:w-auto">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      "Build seat chains"
                    )}
                  </Button>
                </div>
              </div>
              {error ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </form>
          ) : (
            <div className="grid gap-6">
              {searchStep === "stations" && (
                <>
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

                  <div className="grid gap-4 md:grid-cols-[160px_auto]">
                    <div className="space-y-2">
                      <label htmlFor="travelers-search" className="text-sm font-medium flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        Travelers
                      </label>
                      <Input
                        id="travelers-search"
                        type="number"
                        min={1}
                        max={20}
                        value={travelers}
                        onChange={(event) => setTravelers(Number(event.target.value))}
                        disabled={loading}
                      />
                    </div>
                    <div className="flex items-end">
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
                    </div>
                  </div>

                  {error ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}
                </>
              )}

              {searchStep === "trips" && !result && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">
                        {fromStation?.name} → {toStation?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tripDate} at {tripTime} • {trips.length} trips found
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetSearch}>
                      New Search
                    </Button>
                  </div>

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

                  {error ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {loading && !result && mode === "har" ? (
        <>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-48" />
            </CardContent>
          </Card>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="py-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="py-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </>
      ) : null}

      {result ? (
        <>
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold">Results ready</span>
                  <span className="text-sm text-muted-foreground">— {result.sourceHarName}</span>
                </div>
                <div className="flex gap-2">
                  {mode === "search" && searchStep === "results" && (
                    <Button variant="outline" size="sm" onClick={resetSearch}>
                      New Search
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => downloadReportHtml(result.reportHtml)}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {hasCollisions && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Attention:</strong> Seat collision detected. You will need to change seats during your journey.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Travelers</span>
                </div>
                <div className="text-3xl font-bold">
                  {isMultiChainOutput(result.seatChain) ? result.seatChain.summary.travelers : travelers}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                {coverageData && (
                  <CoverageProgress covered={coverageData.covered} total={coverageData.total} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-muted-foreground">Seat Changes</span>
                </div>
                <div className="text-3xl font-bold">{seatChangesCount}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {seatChangesCount === 0 ? "You'll stay in the same seat" : "Changes required during journey"}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Seat Assignments</h2>
            <p className="text-sm text-muted-foreground">
              Your seat plan for each traveler. Changes are highlighted.
            </p>

            {result.travelerViews.map((traveler) => (
              <SeatTimeline
                key={traveler.travelerIndex}
                travelerIndex={traveler.travelerIndex}
                changeSteps={traveler.changeSteps}
              />
            ))}
          </div>

          <Card>
            <CardHeader className="cursor-pointer" onClick={() => setShowDetailedView(!showDetailedView)}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Detailed Segment View</CardTitle>
                  <CardDescription>Per-segment breakdown of seat assignments</CardDescription>
                </div>
                {showDetailedView ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
            {showDetailedView && (
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  {isMultiChainOutput(result.seatChain) ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead rowSpan={2}>Segment</TableHead>
                          <TableHead rowSpan={2}>From</TableHead>
                          <TableHead rowSpan={2}>To</TableHead>
                          {result.seatChain.travelerChains.map((tc) => (
                            <TableHead key={tc.travelerIndex} colSpan={2} className="text-center">
                              Traveler {tc.travelerIndex}
                            </TableHead>
                          ))}
                          <TableHead rowSpan={2}>Status</TableHead>
                        </TableRow>
                        <TableRow>
                          {result.seatChain.travelerChains.map((tc) => (
                            <React.Fragment key={`sub-${tc.travelerIndex}`}>
                              <TableHead>Car</TableHead>
                              <TableHead>Seat</TableHead>
                            </React.Fragment>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.seatChain.perSegmentTravelerAssignment.map((seg) => {
                          const parsedSeats = seg.assignedSeats.map(parseSeat);
                          return (
                            <TableRow key={seg.segmentIndex}>
                              <TableCell>{seg.segmentIndex}</TableCell>
                              <TableCell>{seg.stationFromName ?? seg.stationFrom}</TableCell>
                              <TableCell>{seg.stationToName ?? seg.stationTo}</TableCell>
                              {parsedSeats.map((parsed, idx) => (
                                <React.Fragment key={idx}>
                                  <TableCell>{parsed.carriage ?? "—"}</TableCell>
                                  <TableCell>{parsed.seat ?? "—"}</TableCell>
                                </React.Fragment>
                              ))}
                              <TableCell>
                                {seg.collisionFree ? (
                                  <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle2 className="h-3 w-3" />
                                    OK
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="gap-1">
                                    <XCircle className="h-3 w-3" />
                                    Collision
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Segment</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Carriage</TableHead>
                          <TableHead>Seat</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.seatChain.perSegmentAssignment.map((seg) => {
                          const parsed = parseSeat(seg.assignedSeat);
                          return (
                            <TableRow key={seg.segmentIndex}>
                              <TableCell>{seg.segmentIndex}</TableCell>
                              <TableCell>{seg.stationFromName ?? seg.stationFrom}</TableCell>
                              <TableCell>{seg.stationToName ?? seg.stationTo}</TableCell>
                              <TableCell>{parsed.carriage ?? "—"}</TableCell>
                              <TableCell>{parsed.seat ?? "—"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}