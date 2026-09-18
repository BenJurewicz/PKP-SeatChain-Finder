"use client";

import React, { FormEvent, useMemo, useState } from "react";
import type { TravelerView } from "@/lib/instructions";
import { isMultiChainOutput, type SeatChainOutput } from "@/lib/seat-chain";
import type { Station, Trip, SeatRelease, SegmentsOutput, SpecialSeatProperty, SpecialSeatFilters } from "@/lib/types";
import type { TripSummary } from "@/lib/report";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { FileUpload } from "@/components/file-upload";
import { StationInput } from "@/components/station-input";
import { DateTimeInput } from "@/components/date-time-input";
import { TripList } from "@/components/trip-list";
import { SeatTimeline } from "@/components/seat-timeline";
import { SeatReleasesSection } from "@/components/seat-releases-section";
import { ModeSwitch } from "@/components/mode-switch";
import { TripHeaderCard } from "@/components/trip-header-card";
import { ResultsSummary } from "@/components/results-summary";
import { DetailedSegmentsCard } from "@/components/detailed-segments-card";
import { HarInstructions } from "@/components/har-instructions";
import { Train, Loader2, AlertCircle, Search, ArrowRight } from "lucide-react";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { toPolishIsoString } from "@/lib/formatting";
import { detectSpecialSeatProperties } from "@/lib/seat-chain";

type RunResponse = {
    seatChain: SeatChainOutput;
    travelerViews: TravelerView[];
    reportHtml: string;
    sourceHarName: string;
    segmentsData?: SegmentsOutput;
    detectedSpecialProperties?: SpecialSeatProperty[];
    seatReleases?: SeatRelease[];
    tripInfo?: {
        trainName: string;
        carrierId: string;
        departureStation: string;
        arrivalStation: string;
        departureTime: string;
        arrivalTime: string;
        duration: number;
    };
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
    // Warsaw-local "now", not UTC — toISOString/toTimeString ignore Europe/Warsaw.
    const polish = toPolishIsoString(new Date());
    const [date, time] = polish.split("T");
    return { date, time: time.slice(0, 5) };
}

function ResultsLoadingSkeleton() {
    return (
        <>
            <Card className="py-0">
                <CardContent className="py-6">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="mt-3 h-4 w-64" />
                </CardContent>
            </Card>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="py-0">
                        <CardContent className="py-6">
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card className="py-0">
                <CardContent className="py-6">
                    <Skeleton className="h-48 w-full" />
                </CardContent>
            </Card>
        </>
    );
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
    const [harInstructionsOpen, setHarInstructionsOpen] = useState(false);

    const [segmentsData, setSegmentsData] = useState<SegmentsOutput | null>(null);
    const [detectedProperties, setDetectedProperties] = useState<SpecialSeatProperty[]>([]);
    const [specialFilters, setSpecialFilters] = useState<SpecialSeatFilters>({});
    const [initialFilters, setInitialFilters] = useState<SpecialSeatFilters>({});

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

    const filtersChanged = useMemo(() => {
        return JSON.stringify(specialFilters) !== JSON.stringify(initialFilters);
    }, [specialFilters, initialFilters]);

    const resetSearch = () => {
        setTrips([]);
        setSelectedTrip(null);
        setResult(null);
        setError(null);
        setSearchStep("stations");
        setShowDetailedView(false);
        setSegmentsData(null);
        setDetectedProperties([]);
        setSpecialFilters({});
        setInitialFilters({});
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
                segmentsData: data.segmentsData,
                detectedSpecialProperties: data.detectedSpecialProperties,
                tripInfo: data.tripInfo,
                seatReleases: data.seatReleases,
            });

            if (data.segmentsData) {
                const detected = data.detectedSpecialProperties ?? Array.from(detectSpecialSeatProperties(data.segmentsData));
                setSegmentsData(data.segmentsData);
                setDetectedProperties(detected);
                const initialFilterState: SpecialSeatFilters = {};
                for (const prop of detected) {
                    initialFilterState[prop] = false;
                }
                setSpecialFilters(initialFilterState);
                setInitialFilters(initialFilterState);
            }
        } catch (submitError) {
            setError(getFriendlyErrorMessage(submitError));
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
            setError(getFriendlyErrorMessage(searchError));
        } finally {
            setLoading(false);
        }
    }

    async function handleSelectTrip(trip: Trip): Promise<void> {
        if (loading) return; // ignore rapid double-clicks on a trip card
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
            const { extractReleasingSeats } = await import("@/lib/blocked-seats");

            // Apply the initial special-seat filter state (all excluded) to the
            // very first calculation too — otherwise seats carrying special
            // properties (e.g. wheelchair/handicapped spots) would appear in the
            // chain here but vanish the moment any recalculation applies the
            // filters, making seats the user saw assigned suddenly disappear.
            const detected = Array.from(detectSpecialSeatProperties(segmentsData));
            const initialFilterState: SpecialSeatFilters = {};
            for (const prop of detected) {
                initialFilterState[prop] = false;
            }

            const seatChain = buildSeatChainOutput(segmentsData, travelers, initialFilterState);
            const travelerViews = buildTravelerViews(seatChain);
            const seatReleases = extractReleasingSeats(segmentsData);

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
                segmentsData,
                detectedSpecialProperties: detected,
                seatReleases,
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

            setSegmentsData(segmentsData);
            setDetectedProperties(detected);
            setSpecialFilters(initialFilterState);
            setInitialFilters(initialFilterState);
            setSearchStep("results");
        } catch (buildError) {
            setError(getFriendlyErrorMessage(buildError));
        } finally {
            setLoading(false);
        }
    }

    async function handleRecalculate(): Promise<void> {
        if (!segmentsData) return;

        setLoading(true);
        setError(null);

        try {
            const { buildSeatChainOutput } = await import("@/lib/seat-chain");
            const { buildTravelerViews } = await import("@/lib/instructions");

            const seatChain = buildSeatChainOutput(segmentsData, travelers, specialFilters);
            const travelerViews = buildTravelerViews(seatChain);

            setResult(prev => prev ? {
                ...prev,
                seatChain,
                travelerViews,
            } : null);

            setInitialFilters(specialFilters);
        } catch (recalcError) {
            setError(getFriendlyErrorMessage(recalcError));
        } finally {
            setLoading(false);
        }
    }

    const multiChain = result ? isMultiChainOutput(result.seatChain) : false;
    const stepperTravelers = result
        ? (isMultiChainOutput(result.seatChain)
              ? result.seatChain.summary.travelers
              : travelers)
        : travelers;

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
            <header className="text-center">
                <div className="mb-2 flex items-center justify-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                        <Train className="h-6 w-6" />
                    </span>
                    <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                        Seat Finder
                    </h1>
                </div>
                <p className="text-muted-foreground">
                    Get a seat on PKP trains — even when none are bookable outright.
                </p>
            </header>

            <Card className="py-0">
                <CardContent className="grid gap-5 py-6">
                    <ModeSwitch
                        mode={mode}
                        onChange={(next) => {
                            setMode(next);
                            resetSearch();
                        }}
                        disabled={loading}
                    />

                    {mode === "har" ? (
                        <form className="grid gap-4" onSubmit={handleHarSubmit}>
                            <HarInstructions
                                open={harInstructionsOpen}
                                onOpenChange={setHarInstructionsOpen}
                            />
                            <FileUpload
                                onChange={setHarFile}
                                accept=".har,application/json"
                                disabled={loading}
                            />
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto sm:justify-self-start"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Running…
                                    </>
                                ) : (
                                    "Build seat chains"
                                )}
                            </Button>
                            {error ? (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            ) : null}
                        </form>
                    ) : (
                        <div className="grid gap-6">
                            {searchStep === "stations" && (
                                <>
                                    <div className="grid items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="from-station"
                                                className="text-sm font-medium"
                                            >
                                                From
                                            </label>
                                            <StationInput
                                                value={fromStation}
                                                onChange={setFromStation}
                                                placeholder="Departure station…"
                                                disabled={loading}
                                            />
                                        </div>
                                        <ArrowRight
                                            className="hidden mx-auto h-4 w-4 text-muted-foreground md:mb-2.5 md:block"
                                            aria-hidden="true"
                                        />
                                        <div className="space-y-2">
                                            <label
                                                htmlFor="to-station"
                                                className="text-sm font-medium"
                                            >
                                                To
                                            </label>
                                            <StationInput
                                                value={toStation}
                                                onChange={setToStation}
                                                placeholder="Destination station…"
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
                                        className="w-full sm:w-auto sm:justify-self-start"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Searching…
                                            </>
                                        ) : (
                                            <>
                                                <Search className="mr-2 h-4 w-4" />
                                                Search trips
                                            </>
                                        )}
                                    </Button>

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
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-lg font-semibold">
                                                {fromStation?.name} → {toStation?.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {tripDate} at {tripTime} ·{" "}
                                                {loading
                                                    ? "Searching…"
                                                    : `${trips.length} ${trips.length === 1 ? "trip" : "trips"} found`}
                                            </p>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={resetSearch}>
                                            New search
                                        </Button>
                                    </div>

                                    {loading ? (
                                        <div className="space-y-3">
                                            {[1, 2, 3].map((i) => (
                                                <Card key={i} className="py-0">
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

            {loading && !result && mode === "har" ? <ResultsLoadingSkeleton /> : null}

            {result && coverageData ? (
                <div className="flex flex-col gap-6">
                    <TripHeaderCard
                        tripInfo={result.tripInfo}
                        sourceHarName={result.sourceHarName}
                        onDownload={() => downloadReportHtml(result.reportHtml)}
                        onNewSearch={
                            mode === "search" && searchStep === "results"
                                ? resetSearch
                                : undefined
                        }
                    />

                    {hasCollisions && (
                        <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Attention:</strong> Seat collision detected. You will
                                need to change seats during your journey.
                            </AlertDescription>
                        </Alert>
                    )}

                    <ResultsSummary
                        travelers={stepperTravelers}
                        onTravelersChange={setTravelers}
                        travelersLocked={multiChain}
                        showRecalculate={Boolean(selectedTrip) && !multiChain}
                        onRecalculate={handleRecalculate}
                        loading={loading}
                        coverage={coverageData}
                        seatChanges={seatChangesCount}
                        detectedProperties={detectedProperties}
                        specialFilters={specialFilters}
                        onSpecialFiltersChange={setSpecialFilters}
                        filtersChanged={filtersChanged}
                    />

                    <section aria-labelledby="seat-assignments-heading" className="space-y-3">
                        <div>
                            <h2
                                id="seat-assignments-heading"
                                className="text-xl font-semibold tracking-tight"
                            >
                                Seat assignments
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Your seat plan for each traveler, top to bottom.
                            </p>
                        </div>
                        {result.travelerViews.map((traveler) => (
                            <SeatTimeline
                                key={traveler.travelerIndex}
                                travelerIndex={traveler.travelerIndex}
                                changeSteps={traveler.changeSteps}
                                totalSegments={traveler.assignments.length}
                                assignments={traveler.assignments}
                            />
                        ))}
                    </section>

                    {result.seatReleases && result.seatReleases.length > 0 && (
                        <SeatReleasesSection seatReleases={result.seatReleases} />
                    )}

                    <DetailedSegmentsCard
                        seatChain={result.seatChain}
                        open={showDetailedView}
                        onToggle={() => setShowDetailedView(!showDetailedView)}
                    />
                </div>
            ) : null}
        </div>
    );
}
