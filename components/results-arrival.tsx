"use client";

import { Train, Download, Repeat2, Users, RotateCcw, ListChecks } from "lucide-react";
import { TrainCarrierIcon } from "@/components/train-carrier-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NumberStepper } from "@/components/number-stepper";
import { CoverageProgress } from "@/components/coverage-progress";
import type { CoverageStats } from "@/lib/view-model";
import { formatTime, formatDate, formatDuration } from "@/lib/formatting";

export interface TripInfo {
    trainName: string;
    carrierId: string;
    departureStation: string;
    arrivalStation: string;
    departureTime: string;
    arrivalTime: string;
    duration: number;
}

interface ResultsArrivalProps {
    tripInfo: TripInfo | undefined;
    sourceHarName: string;
    coverage: CoverageStats;
    seatChanges: number;
    travelers: number;
    travelersLocked: boolean;
    onTravelersChange: (value: number) => void;
    onRecalculate?: () => void;
    recalcLoading?: boolean;
    onDownload: () => void;
    /** Back to the train choice (live search only). */
    onChangeTrip?: () => void;
    /** Full restart of the flow. */
    onNewSearch: () => void;
}

export function ResultsArrival({
    tripInfo,
    sourceHarName,
    coverage,
    seatChanges,
    travelers,
    travelersLocked,
    onTravelersChange,
    onRecalculate,
    recalcLoading = false,
    onDownload,
    onChangeTrip,
    onNewSearch,
}: ResultsArrivalProps) {
    const isUnknownTrip = !tripInfo || tripInfo.trainName === "Unknown Train";
    const arrived = coverage.percentage === 100;

    return (
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            {/* Arrival banner */}
            <div className="wizard-rail-track border-b bg-primary/[0.04] px-6 py-6 md:px-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium text-primary">
                            <ListChecks className="h-4 w-4" />
                            You&apos;ve arrived — here are your seats
                        </p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                            {arrived
                                ? "A seat for every segment"
                                : coverage.percentage >= 80
                                  ? "Seats found for most of the journey"
                                  : "Partial seat coverage found"}
                        </h1>
                        <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-muted-foreground">
                            {tripInfo && !isUnknownTrip ? (
                                <>
                                    <TrainCarrierIcon
                                        carrierId={tripInfo.carrierId}
                                    />
                                    <span className="font-semibold text-foreground">
                                        {tripInfo.trainName}
                                    </span>
                                    <span aria-hidden="true">·</span>
                                    <span>
                                        {tripInfo.departureStation} → {tripInfo.arrivalStation}
                                    </span>
                                    <Badge variant="secondary" className="gap-1">
                                        {formatDuration(tripInfo.duration)}
                                    </Badge>
                                    <span aria-hidden="true">·</span>
                                    <span className="tabular-nums">
                                        {formatTime(tripInfo.departureTime)} →{" "}
                                        {formatTime(tripInfo.arrivalTime)}
                                    </span>
                                    <span>({formatDate(tripInfo.departureTime)})</span>
                                </>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Train className="h-4 w-4" />
                                    {sourceHarName}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                        {onChangeTrip ? (
                            <Button variant="outline" size="sm" onClick={onChangeTrip}>
                                Change train
                            </Button>
                        ) : null}
                        <Button variant="outline" size="sm" onClick={onDownload}>
                            <Download className="mr-1.5 h-4 w-4" />
                            Report
                        </Button>
                        <Button variant="outline" size="sm" onClick={onNewSearch}>
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            Start over
                        </Button>
                    </div>
                </div>
            </div>

            {/* Key numbers */}
            <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="flex items-center justify-center p-5">
                    <CoverageProgress covered={coverage.covered} total={coverage.total} />
                </div>
                <div className="flex flex-col items-start justify-center gap-1 p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Repeat2 className="h-4 w-4" />
                        <span>Seat changes</span>
                    </div>
                    <div className="text-3xl font-bold tabular-nums">{seatChanges}</div>
                    <div className="text-xs text-muted-foreground">
                        {seatChanges === 0
                            ? "You'll stay in the same seat"
                            : "Moves required during the journey"}
                    </div>
                </div>
                <div className="flex flex-col items-start justify-center gap-2 p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Travelers</span>
                    </div>
                    <NumberStepper
                        value={travelers}
                        onChange={onTravelersChange}
                        min={1}
                        max={20}
                        disabled={recalcLoading || travelersLocked}
                        className="scale-90 origin-left"
                    />
                    {travelersLocked ? (
                        <p className="text-xs text-muted-foreground">
                            Traveler count is fixed for this capture.
                        </p>
                    ) : onRecalculate ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={onRecalculate}
                            disabled={recalcLoading}
                            className="mt-1"
                        >
                            {recalcLoading ? "Recalculating…" : "Recalculate seats"}
                        </Button>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
