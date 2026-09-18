"use client";

import React, { FormEvent, useMemo, useState } from "react";
import type { TravelerView } from "@/lib/instructions";
import type { SeatChainOutput } from "@/lib/seat-chain";
import type {
    Station,
    Trip,
    SeatRelease,
    SegmentsOutput,
    SpecialSeatProperty,
    SpecialSeatFilters,
} from "@/lib/types";
import type { TripSummary } from "@/lib/report";
import type { TripInfo } from "@/components/results-arrival";
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
import { DetailedSegmentsCard } from "@/components/detailed-segments-card";
import { SpecialSeatsFilter } from "@/components/special-seats-filter";
import { HarInstructions } from "@/components/har-instructions";
import { NumberStepper } from "@/components/number-stepper";
import { ResultsArrival } from "@/components/results-arrival";
import { TrainCarrierIcon } from "@/components/train-carrier-icon";
import {
    WizardProgress,
    WIZARD_STEPS,
    RESULTS_STEP_INDEX,
} from "@/components/wizard/wizard-progress";
import { WizardStep, WizardBackButton } from "@/components/wizard/wizard-step";
import {
    Train,
    Loader2,
    AlertCircle,
    Search,
    Armchair,
    FileInput,
    ArrowRight,
} from "lucide-react";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { toPolishIsoString } from "@/lib/formatting";
import { detectSpecialSeatProperties } from "@/lib/seat-chain";
import {
    getCoverage,
    getSeatChanges,
    hasSeatCollisions,
    getTravelers,
} from "@/lib/view-model";

type FlowStep = "from" | "to" | "when" | "train" | "travelers" | "har" | "results";
type ResultSource = "search" | "har";

type RunResponse = {
    seatChain: SeatChainOutput;
    travelerViews: TravelerView[];
    reportHtml: string;
    sourceHarName: string;
    segmentsData?: SegmentsOutput;
    detectedSpecialProperties?: SpecialSeatProperty[];
    seatReleases?: SeatRelease[];
    tripInfo?: TripInfo;
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
        <div className="mx-auto w-full max-w-3xl space-y-4">
            <Card>
                <CardContent className="py-6">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="mt-3 h-4 w-64" />
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
        </div>
    );
}

export default function Home() {
    const [flowStep, setFlowStep] = useState<FlowStep>("from");
    const [resultSource, setResultSource] = useState<ResultSource>("search");

    const [travelers, setTravelers] = useState(1);
    const [harFile, setHarFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [tripsLoading, setTripsLoading] = useState(false);
    const [segmentsLoading, setSegmentsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<RunResponse | null>(null);

    const [fromStation, setFromStation] = useState<Station | null>(null);
    const [toStation, setToStation] = useState<Station | null>(null);
    const [tripDate, setTripDate] = useState<string>(() => getDefaultDateTime().date);
    const [tripTime, setTripTime] = useState<string>(() => getDefaultDateTime().time);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [tripsSearched, setTripsSearched] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [showDetailedView, setShowDetailedView] = useState(false);
    const [harInstructionsOpen, setHarInstructionsOpen] = useState(false);

    const [segmentsData, setSegmentsData] = useState<SegmentsOutput | null>(null);
    const [detectedProperties, setDetectedProperties] = useState<SpecialSeatProperty[]>([]);
    const [specialFilters, setSpecialFilters] = useState<SpecialSeatFilters>({});
    const [initialFilters, setInitialFilters] = useState<SpecialSeatFilters>({});

    const coverageData = useMemo(
        () => (result ? getCoverage(result.seatChain) : null),
        [result],
    );
    const seatChangesCount = useMemo(
        () => (result ? getSeatChanges(result.seatChain) : 0),
        [result],
    );
    const hasCollisions = useMemo(
        () => (result ? hasSeatCollisions(result.seatChain) : false),
        [result],
    );
    const stepperTravelers = result ? getTravelers(result.seatChain) : travelers;

    const filtersChanged = useMemo(() => {
        return JSON.stringify(specialFilters) !== JSON.stringify(initialFilters);
    }, [specialFilters, initialFilters]);

    const canRecalculate = segmentsData !== null;

    /** Clear everything downstream of a changed answer. */
    function invalidateAfter(level: "from" | "to" | "when") {
        if (level !== "when") {
            setTrips([]);
            setTripsSearched(false);
            setSegmentsData(null);
        }
        setTripsSearched(false);
        setSelectedTrip(null);
        setSegmentsData(null);
        setResult(null);
        setShowDetailedView(false);
        setDetectedProperties([]);
        setSpecialFilters({});
        setInitialFilters({});
    }

    function resetAll() {
        setFlowStep("from");
        setResultSource("search");
        invalidateAfter("from");
        setError(null);
    }

    function handleProgressClick(index: number) {
        if (loading || tripsLoading || segmentsLoading) return;
        if (index >= 1 && !fromStation) return;
        if (index >= 2 && !toStation) return;
        if (index >= 3 && !tripsSearched) return;
        if (index >= 4 && !(selectedTrip && segmentsData)) return;
        setError(null);
        setFlowStep(WIZARD_STEPS[index].key);
    }

    function goToStep(step: FlowStep) {
        setError(null);
        setFlowStep(step);
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

        setTripsLoading(true);
        setError(null);
        setTrips([]);
        setSelectedTrip(null);
        setResult(null);
        setFlowStep("train");

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
            setTripsSearched(true);
        } catch (searchError) {
            setError(getFriendlyErrorMessage(searchError));
        } finally {
            setTripsLoading(false);
        }
    }

    async function handleSelectTrip(trip: Trip): Promise<void> {
        if (segmentsLoading || loading) return;
        setSelectedTrip(trip);
        setResult(null);
        setShowDetailedView(false);
        setFlowStep("travelers");
        setSegmentsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/segments/build", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ segmentRequest: trip.segmentRequest }),
            });
            const segmentsData = await response.json();
            if (!response.ok) {
                throw new Error(segmentsData.error ?? "Failed to build segments");
            }

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

            setSegmentsData(segmentsData);
            setDetectedProperties(detected);
            setSpecialFilters(initialFilterState);
            setInitialFilters(initialFilterState);
        } catch (buildError) {
            setError(getFriendlyErrorMessage(buildError));
            setFlowStep("train");
            setSelectedTrip(null);
        } finally {
            setSegmentsLoading(false);
        }
    }

    async function handleFindSeats(): Promise<void> {
        if (!segmentsData || !selectedTrip) return;

        setLoading(true);
        setError(null);

        try {
            const { buildSeatChainOutput } = await import("@/lib/seat-chain");
            const { buildTravelerViews } = await import("@/lib/instructions");
            const { generateStaticReportHtml } = await import("@/lib/report");
            const { extractReleasingSeats } = await import("@/lib/blocked-seats");

            const seatChain = buildSeatChainOutput(segmentsData, travelers, specialFilters);
            const travelerViews = buildTravelerViews(seatChain);
            const seatReleases = extractReleasingSeats(segmentsData);

            const tripSummary: TripSummary = {
                trainName: selectedTrip.trainName,
                trainNumber: selectedTrip.trainNumber,
                carrierId: selectedTrip.carrierId,
                departureStation: selectedTrip.departure.stationName,
                arrivalStation: selectedTrip.arrival.stationName,
                departureTime: selectedTrip.departure.dateTime,
                arrivalTime: selectedTrip.arrival.dateTime,
                duration: selectedTrip.duration,
            };
            const reportHtml = generateStaticReportHtml(seatChain, travelerViews, tripSummary);

            setResult({
                seatChain,
                travelerViews,
                reportHtml,
                sourceHarName: `${selectedTrip.trainName} (${selectedTrip.departure.stationName} → ${selectedTrip.arrival.stationName})`,
                segmentsData,
                detectedSpecialProperties: detectedProperties,
                seatReleases,
                tripInfo: {
                    trainName: selectedTrip.trainName,
                    carrierId: selectedTrip.carrierId,
                    departureStation: selectedTrip.departure.stationName,
                    arrivalStation: selectedTrip.arrival.stationName,
                    departureTime: selectedTrip.departure.dateTime,
                    arrivalTime: selectedTrip.arrival.dateTime,
                    duration: selectedTrip.duration,
                },
            });
            setResultSource("search");
            setFlowStep("results");
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

            setResult((prev) =>
                prev ? { ...prev, seatChain, travelerViews } : null,
            );

            setInitialFilters(specialFilters);
        } catch (recalcError) {
            setError(getFriendlyErrorMessage(recalcError));
        } finally {
            setLoading(false);
        }
    }

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
                const detected =
                    data.detectedSpecialProperties ??
                    Array.from(detectSpecialSeatProperties(data.segmentsData));
                setSegmentsData(data.segmentsData);
                setDetectedProperties(detected);
                const initialFilterState: SpecialSeatFilters = {};
                for (const prop of detected) {
                    initialFilterState[prop] = false;
                }
                setSpecialFilters(initialFilterState);
                setInitialFilters(initialFilterState);
            }

            setResultSource("har");
            setFlowStep("results");
        } catch (submitError) {
            setError(getFriendlyErrorMessage(submitError));
        } finally {
            setLoading(false);
        }
    }

    const hasSpecialSeats = detectedProperties.length > 0;

    // ---------------------------------------------------------------- header

    const appHeader = (
        <header className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                    <Train className="h-6 w-6" />
                </span>
                <span className="text-3xl font-bold tracking-tight">Seatway</span>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
                Your seats on PKP trains, one question at a time — even when none are
                bookable outright.
            </p>
        </header>
    );

    // ----------------------------------------------------------------- steps

    if (flowStep === "results" && result && coverageData) {
        return (
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
                {appHeader}
                <WizardProgress current={RESULTS_STEP_INDEX} className="mx-auto" />

                <div className="flex flex-col gap-6">
                    <ResultsArrival
                        tripInfo={result.tripInfo}
                        sourceHarName={result.sourceHarName}
                        coverage={coverageData}
                        seatChanges={seatChangesCount}
                        travelers={stepperTravelers}
                        travelersLocked={!segmentsData}
                        onTravelersChange={setTravelers}
                        onRecalculate={canRecalculate ? handleRecalculate : undefined}
                        recalcLoading={loading}
                        onDownload={() => downloadReportHtml(result.reportHtml)}
                        onChangeTrip={
                            resultSource === "search" && tripsSearched
                                ? () => goToStep("train")
                                : undefined
                        }
                        onNewSearch={resetAll}
                    />

                    {hasCollisions && (
                        <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Attention:</strong> Seat collision detected. You will
                                need to change seats during your journey.
                            </AlertDescription>
                        </Alert>
                    )}

                    {error ? (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : null}

                    {hasSpecialSeats ? (
                        <Card>
                            <CardContent className="py-5">
                                <SpecialSeatsFilter
                                    detectedProperties={detectedProperties}
                                    filters={specialFilters}
                                    onFiltersChange={setSpecialFilters}
                                    onRecalculate={handleRecalculate}
                                    disabled={loading}
                                    filtersChanged={filtersChanged}
                                />
                            </CardContent>
                        </Card>
                    ) : null}

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
            </main>
        );
    }

    // Wizard shell for all pre-results steps.

    let stepContent: React.ReactNode;

    if (flowStep === "from") {
        stepContent = (
            <WizardStep
                title="Where are you starting?"
                description="Type the name of your departure station."
                footer={
                    <>
                        <span className="text-xs text-muted-foreground">
                            Tip: press Enter to continue
                        </span>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (fromStation) setFlowStep("to");
                            }}
                            className="contents"
                        >
                            <Button type="submit" disabled={!fromStation} className="min-w-36">
                                Next: destination
                                <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Button>
                        </form>
                    </>
                }
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (fromStation) setFlowStep("to");
                    }}
                >
                    <StationInput
                        key="wizard-from"
                        value={fromStation}
                        onChange={(station) => {
                            setFromStation(station);
                            if (station) {
                                invalidateAfter("from");
                                setFlowStep("to");
                            }
                        }}
                        placeholder="Departure station…"
                        disabled={tripsLoading || segmentsLoading}
                        large
                    />
                </form>
                <div className="mt-6 flex justify-center">
                    <button
                        type="button"
                        onClick={() => {
                            invalidateAfter("from");
                            setFlowStep("har");
                        }}
                        disabled={tripsLoading || segmentsLoading}
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                        <FileInput className="h-4 w-4" />
                        Have a captured HAR file? Import it instead
                    </button>
                </div>
            </WizardStep>
        );
    } else if (flowStep === "to") {
        stepContent = (
            <WizardStep
                title="Where are you headed?"
                description="Type the name of your destination station."
                chips={
                    fromStation
                        ? [{ label: `From: ${fromStation.name}`, onClick: () => goToStep("from") }]
                        : undefined
                }
                footer={
                    <>
                        <WizardBackButton onClick={() => goToStep("from")} />
                        <Button type="submit" disabled={!toStation} className="min-w-36">
                            Next: travel date
                            <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                    </>
                }
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (toStation) setFlowStep("when");
                    }}
                >
                    <StationInput
                        key="wizard-to"
                        value={toStation}
                        onChange={(station) => {
                            setToStation(station);
                            if (station) {
                                invalidateAfter("to");
                                setFlowStep("when");
                            }
                        }}
                        placeholder="Destination station…"
                        disabled={tripsLoading || segmentsLoading}
                        large
                    />
                </form>
            </WizardStep>
        );
    } else if (flowStep === "when") {
        stepContent = (
            <WizardStep
                title="When do you travel?"
                description="Pick a date and the earliest departure time — times are in the Polish timezone."
                chips={[
                    ...(fromStation
                        ? [{ label: `From: ${fromStation.name}`, onClick: () => goToStep("from") }]
                        : []),
                    ...(toStation
                        ? [{ label: `To: ${toStation.name}`, onClick: () => goToStep("to") }]
                        : []),
                ]}
                footer={
                    <>
                        <WizardBackButton onClick={() => goToStep("to")} />
                        <Button
                            type="button"
                            onClick={handleSearchTrips}
                            disabled={tripsLoading || !tripDate || !tripTime}
                            className="min-w-40"
                        >
                            {tripsLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Finding trains…
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Find trains
                                </>
                            )}
                        </Button>
                    </>
                }
            >
                <DateTimeInput
                    date={tripDate}
                    time={tripTime}
                    onDateChange={(date) => {
                        setTripDate(date);
                        invalidateAfter("when");
                    }}
                    onTimeChange={(time) => {
                        setTripTime(time);
                        invalidateAfter("when");
                    }}
                    disabled={tripsLoading || segmentsLoading}
                    large
                />
            </WizardStep>
        );
    } else if (flowStep === "train") {
        stepContent = (
            <WizardStep
                wide
                title="Which train suits you?"
                description={
                    tripsLoading
                        ? "Searching for trains…"
                        : `${trips.length} ${trips.length === 1 ? "train" : "trains"} on this route`
                }
                chips={[
                    ...(fromStation
                        ? [{ label: `From: ${fromStation.name}`, onClick: () => goToStep("from") }]
                        : []),
                    ...(toStation
                        ? [{ label: `To: ${toStation.name}`, onClick: () => goToStep("to") }]
                        : []),
                    {
                        label: `${tripDate} at ${tripTime}`,
                        onClick: () => goToStep("when"),
                    },
                ]}
                footer={<WizardBackButton onClick={() => goToStep("when")} />}
            >
                {error ? (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ) : null}
                {tripsLoading ? (
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
                    <TripList trips={trips} selectedTrip={selectedTrip} onSelect={handleSelectTrip} />
                )}
            </WizardStep>
        );
    } else if (flowStep === "travelers") {
        stepContent = (
            <WizardStep
                title="How many travelers?"
                description="Each traveler gets their own seat plan with as few seat changes as possible."
                chips={[
                    ...(fromStation
                        ? [{ label: `From: ${fromStation.name}`, onClick: () => goToStep("from") }]
                        : []),
                    ...(toStation
                        ? [{ label: `To: ${toStation.name}`, onClick: () => goToStep("to") }]
                        : []),
                    { label: `${tripDate} at ${tripTime}`, onClick: () => goToStep("when") },
                    ...(selectedTrip
                        ? [
                              {
                                  label: `Train: ${selectedTrip.trainName}`,
                                  onClick: () => goToStep("train"),
                              },
                          ]
                        : []),
                ]}
                footer={
                    <>
                        <WizardBackButton onClick={() => goToStep("train")} />
                        <Button
                            type="button"
                            onClick={handleFindSeats}
                            disabled={loading || segmentsLoading || !segmentsData}
                            className="min-w-40"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Assigning seats…
                                </>
                            ) : segmentsLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Fetching seat map…
                                </>
                            ) : (
                                <>
                                    <Armchair className="mr-2 h-4 w-4" />
                                    Find my seats
                                </>
                            )}
                        </Button>
                    </>
                }
            >
                {selectedTrip ? (
                    <div className="flex items-center gap-4 rounded-2xl border bg-muted/40 p-4">
                        <TrainCarrierIcon
                            carrierId={selectedTrip.carrierId}
                            className="h-7 w-auto flex-none"
                        />
                        <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold">{selectedTrip.trainName}</div>
                            <div className="truncate text-sm text-muted-foreground">
                                {selectedTrip.departure.stationName} →{" "}
                                {selectedTrip.arrival.stationName}
                            </div>
                        </div>
                        <div className="flex-none text-right text-sm tabular-nums text-muted-foreground">
                            {selectedTrip.departure.dateTime.slice(11, 16)} →{" "}
                            {selectedTrip.arrival.dateTime.slice(11, 16)}
                        </div>
                    </div>
                ) : null}
                <div className="mt-8 flex flex-col items-center gap-2">
                    <NumberStepper
                        value={travelers}
                        onChange={setTravelers}
                        min={1}
                        max={20}
                        disabled={loading || segmentsLoading}
                    />
                    <p className="text-xs text-muted-foreground">Between 1 and 20 travelers</p>
                    {segmentsLoading ? (
                        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Fetching the live seat map for this train…
                        </p>
                    ) : null}
                </div>
            </WizardStep>
        );
    } else {
        // flowStep === "har"
        stepContent = (
            <WizardStep
                title="Import a captured request"
                description="Replay a browser capture (HAR file) through the same seat-finding pipeline."
                chips={[{ label: "Use live search instead", onClick: () => goToStep("from") }]}
                footer={<WizardBackButton onClick={() => goToStep("from")} label="Live search" />}
            >
                <form className="grid gap-5" onSubmit={handleHarSubmit}>
                    <HarInstructions
                        open={harInstructionsOpen}
                        onOpenChange={setHarInstructionsOpen}
                    />
                    <FileUpload
                        onChange={setHarFile}
                        accept=".har,application/json"
                        disabled={loading}
                    />
                    <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">Travelers</span>
                            <NumberStepper
                                value={travelers}
                                onChange={setTravelers}
                                min={1}
                                max={20}
                                disabled={loading}
                                className="scale-90 origin-left"
                            />
                        </div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full sm:w-56">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Building seat chains…
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
            </WizardStep>
        );
    }

    const inWizardFlow = flowStep !== "har";
    const currentProgressIndex = WIZARD_STEPS.findIndex((s) => s.key === flowStep);

    return (
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
            {appHeader}

            {inWizardFlow ? (
                <>
                    <WizardProgress
                        current={Math.max(currentProgressIndex, 0)}
                        onStepClick={handleProgressClick}
                        className="mx-auto"
                    />
                    {error && currentProgressIndex < 3 ? (
                        <Alert variant="destructive" className="mx-auto w-full max-w-2xl">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : null}
                    {stepContent}
                </>
            ) : (
                <div className="mx-auto w-full max-w-2xl">
                    <p className="mb-6 text-center text-sm font-medium text-muted-foreground">
                        Advanced mode — replay a captured request
                    </p>
                    {stepContent}
                    {loading && flowStep === "har" && !result ? (
                        <div className="mt-6">
                            <ResultsLoadingSkeleton />
                        </div>
                    ) : null}
                </div>
            )}
        </main>
    );
}
