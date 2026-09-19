"use client";

import React, { FormEvent, useMemo, useState } from "react";
import type { TravelerView } from "@/lib/instructions";
import type { SeatChainOutput } from "@/lib/seat-chain";
import type {
    Station,
    Trip,
    TripInfo,
    SeatRelease,
    SegmentsOutput,
    SpecialSeatProperty,
    SpecialSeatFilters,
} from "@/lib/types";
import type { TripSummary } from "@/lib/report";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/form-field";
import { LoadingButtonLabel, Spinner } from "@/components/loading";
import { ResultsSkeleton, TripListSkeleton } from "@/components/skeletons";
import { FileUpload } from "@/components/file-upload";
import { StationInput } from "@/components/station-input";
import { DateTimePicker } from "@/components/date-time-picker";
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
import { nowPolish } from "@/lib/formatting";
import { searchTrips, buildSegments, runHarFile, initialSpecialFilters } from "@/lib/api";
import { downloadReportHtml } from "@/lib/report-download";
import {
    EARLIER_WINDOW_MINUTES,
    stableTripKey,
    sortTrips,
    withSequentialIndices,
    shiftWallClock,
} from "@/lib/trip-utils";
import { detectSpecialSeatProperties } from "@/lib/seat-chain";
import {
    getCoverage,
    getSeatChanges,
    hasSeatCollisions,
    getTravelers,
} from "@/lib/view-model";

type FlowStep = "details" | "train" | "travelers" | "har" | "results";
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

export default function Home() {
    const [flowStep, setFlowStep] = useState<FlowStep>("details");
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
    const [tripDate, setTripDate] = useState<string>(() => nowPolish().date);
    const [tripTime, setTripTime] = useState<string>(() => nowPolish().time);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [tripsSearched, setTripsSearched] = useState(false);
    const [earlierLoading, setEarlierLoading] = useState(false);
    const [laterLoading, setLaterLoading] = useState(false);
    const [earlierExhausted, setEarlierExhausted] = useState(false);
    const [laterExhausted, setLaterExhausted] = useState(false);
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

    /** Clear all downstream choices (trips, train, seat plans). */
    function invalidateAfterJourney() {
        setTrips([]);
        setTripsSearched(false);
        setEarlierLoading(false);
        setLaterLoading(false);
        setEarlierExhausted(false);
        setLaterExhausted(false);
        setSelectedTrip(null);
        setSegmentsData(null);
        setResult(null);
        setShowDetailedView(false);
        setDetectedProperties([]);
        setSpecialFilters({});
        setInitialFilters({});
    }

    function resetAll() {
        setFlowStep("details");
        setResultSource("search");
        invalidateAfterJourney();
        setError(null);
    }

    function handleProgressClick(index: number) {
        if (loading || tripsLoading || segmentsLoading) return;
        if (index >= 1 && !tripsSearched) return;
        if (index >= 2 && !(selectedTrip && segmentsData)) return;
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
        setEarlierExhausted(false);
        setLaterExhausted(false);
        setSelectedTrip(null);
        setResult(null);
        setFlowStep("train");

        try {
            const fresh = await searchTrips(fromStation, toStation, tripDate, tripTime);
            setTrips(withSequentialIndices(sortTrips(fresh)));
            setTripsSearched(true);
        } catch (searchError) {
            setError(getFriendlyErrorMessage(searchError));
        } finally {
            setTripsLoading(false);
        }
    }

    /** Load the window of trains before/after the currently listed ones and
     * merge it into the list. Marks the direction exhausted when the new
     * window contains no unseen trains. */
    async function loadMoreTrips(direction: "earlier" | "later"): Promise<void> {
        if (!fromStation || !toStation || trips.length === 0) return;
        if (loading || tripsLoading || segmentsLoading) return;
        if (direction === "earlier") {
            if (earlierLoading || earlierExhausted) return;
        } else {
            if (laterLoading || laterExhausted) return;
        }

        const setBusy = direction === "earlier" ? setEarlierLoading : setLaterLoading;
        const setExhausted = direction === "earlier" ? setEarlierExhausted : setLaterExhausted;
        const boundary = direction === "earlier" ? trips[0] : trips[trips.length - 1];
        const anchor =
            direction === "earlier"
                ? shiftWallClock(boundary.departure.dateTime, -EARLIER_WINDOW_MINUTES)
                : shiftWallClock(boundary.departure.dateTime, 1);

        setBusy(true);
        setError(null);
        try {
            const incoming = await searchTrips(fromStation, toStation, anchor.date, anchor.time);
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
            const merged = withSequentialIndices(sortTrips([...trips, ...fresh]));
            setTrips(merged);
            // Keep the selected train selected even when its index shifts.
            const selectedKey = selectedTrip ? stableTripKey(selectedTrip) : null;
            if (selectedKey) {
                const kept = merged.find((trip) => stableTripKey(trip) === selectedKey);
                if (kept && kept !== selectedTrip) {
                    setSelectedTrip(kept);
                }
            }
        } catch (loadError) {
            setError(getFriendlyErrorMessage(loadError));
        } finally {
            setBusy(false);
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
            const segmentsData = await buildSegments(trip.segmentRequest);

            // Apply the initial special-seat filter state (all excluded) to the
            // very first calculation too — otherwise seats carrying special
            // properties (e.g. wheelchair/handicapped spots) would appear in the
            // chain here but vanish the moment any recalculation applies the
            // filters, making seats the user saw assigned suddenly disappear.
            const detected = Array.from(detectSpecialSeatProperties(segmentsData));
            const initialFilterState = initialSpecialFilters(detected);

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
                tripInfo: tripSummary,
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
            const data = await runHarFile(harFile, travelers);

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
                const initialFilterState = initialSpecialFilters(detected);
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

    const journeySummaryLabel =
        fromStation && toStation
            ? `${fromStation.name} → ${toStation.name} · ${tripDate} ${tripTime}`
            : fromStation
              ? `From: ${fromStation.name}`
              : toStation
                ? `To: ${toStation.name}`
                : "Journey details";

    const journeyChip = { label: journeySummaryLabel, onClick: () => goToStep("details") };

    // Wizard shell for all pre-results steps.

    let stepContent: React.ReactNode;

    if (flowStep === "details") {
        stepContent = (
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
                            type="button"
                            onClick={handleSearchTrips}
                            disabled={
                                tripsLoading || !fromStation || !toStation || !tripDate || !tripTime
                            }
                            className="min-w-40"
                        >
                            <LoadingButtonLabel
                                loading={tripsLoading}
                                loadingText="Finding trains…"
                                text="Find trains"
                                icon={<Search className="mr-2 h-4 w-4" />}
                            />
                        </Button>
                    </>
                }
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSearchTrips();
                    }}
                >
                    <div className="grid items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
                        <Field label="From" htmlFor="from-station">
                            <StationInput
                                key="wizard-from"
                                value={fromStation}
                                onChange={(station) => {
                                    setFromStation(station);
                                    if (station) invalidateAfterJourney();
                                }}
                                placeholder="Departure station…"
                                disabled={tripsLoading || segmentsLoading}
                            />
                        </Field>
                        <ArrowRight
                            aria-hidden="true"
                            className="mx-auto mt-9 hidden h-4 w-4 text-muted-foreground md:block"
                        />
                        <Field label="To" htmlFor="to-station">
                            <StationInput
                                key="wizard-to"
                                value={toStation}
                                onChange={(station) => {
                                    setToStation(station);
                                    if (station) invalidateAfterJourney();
                                }}
                                placeholder="Destination station…"
                                disabled={tripsLoading || segmentsLoading}
                            />
                        </Field>
                    </div>
                    <div className="mt-4">
                        <DateTimePicker
                            date={tripDate}
                            time={tripTime}
                            onDateChange={(date) => {
                                setTripDate(date);
                                invalidateAfterJourney();
                            }}
                            onTimeChange={(time) => {
                                setTripTime(time);
                                invalidateAfterJourney();
                            }}
                            disabled={tripsLoading || segmentsLoading}
                        />
                    </div>
                    <div className="mt-6 flex justify-center">
                        <button
                            type="button"
                            onClick={() => {
                                invalidateAfterJourney();
                                setFlowStep("har");
                            }}
                            disabled={tripsLoading || segmentsLoading}
                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                            <FileInput className="h-4 w-4" />
                            Have a captured HAR file? Import it instead
                        </button>
                    </div>
                </form>
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
                chips={[journeyChip]}
                footer={<WizardBackButton onClick={() => goToStep("details")} />}
            >
                {error ? (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                ) : null}
                {tripsLoading ? <TripListSkeleton /> : (
                    <TripList
                        trips={trips}
                        selectedTrip={selectedTrip}
                        onSelect={handleSelectTrip}
                        onLoadEarlier={() => loadMoreTrips("earlier")}
                        onLoadLater={() => loadMoreTrips("later")}
                        earlierLoading={earlierLoading}
                        laterLoading={laterLoading}
                        earlierExhausted={earlierExhausted}
                        laterExhausted={laterExhausted}
                    />
                )}
            </WizardStep>
        );
    } else if (flowStep === "travelers") {
        stepContent = (
            <WizardStep
                title="How many travelers?"
                description="Each traveler gets their own seat plan with as few seat changes as possible."
                chips={[
                    journeyChip,
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
                            <LoadingButtonLabel
                                loading={loading || segmentsLoading}
                                loadingText={
                                    loading ? "Assigning seats…" : "Fetching seat map…"
                                }
                                text="Find my seats"
                                icon={<Armchair className="mr-2 h-4 w-4" />}
                            />
                        </Button>
                    </>
                }
            >
                {selectedTrip ? (
                    <div className="flex items-center gap-4 rounded-2xl border bg-muted/40 p-4">
                        <TrainCarrierIcon
                            carrierId={selectedTrip.carrierId}
                            className="flex-none"
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
                            <Spinner className="h-4 w-4" />
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
                chips={[{ label: "Use live search instead", onClick: () => goToStep("details") }]}
                footer={<WizardBackButton onClick={() => goToStep("details")} label="Live search" />}
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
                        <LoadingButtonLabel
                            loading={loading}
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
                    {error && currentProgressIndex === 0 ? (
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
                            <ResultsSkeleton />
                        </div>
                    ) : null}
                </div>
            )}
        </main>
    );
}
