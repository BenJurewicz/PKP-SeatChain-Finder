"use client";

import { Users, Repeat2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { NumberStepper } from "@/components/number-stepper";
import { CoverageProgress } from "@/components/coverage-progress";
import { SpecialSeatsFilter } from "@/components/special-seats-filter";
import type { SpecialSeatProperty, SpecialSeatFilters } from "@/lib/types";

interface ResultsSummaryProps {
    travelers: number;
    onTravelersChange: (value: number) => void;
    travelersLocked: boolean;
    showRecalculate: boolean;
    onRecalculate: () => void;
    loading: boolean;
    coverage: { covered: number; total: number };
    seatChanges: number;
    detectedProperties: SpecialSeatProperty[];
    specialFilters: SpecialSeatFilters;
    onSpecialFiltersChange: (filters: SpecialSeatFilters) => void;
    filtersChanged: boolean;
}

export function ResultsSummary({
    travelers,
    onTravelersChange,
    travelersLocked,
    showRecalculate,
    onRecalculate,
    loading,
    coverage,
    seatChanges,
    detectedProperties,
    specialFilters,
    onSpecialFiltersChange,
    filtersChanged,
}: ResultsSummaryProps) {
    const hasSpecialSeats = detectedProperties.length > 0;

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="py-0">
                <CardContent className="flex h-full flex-col gap-3 py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Travelers</span>
                    </div>
                    <div className="flex justify-center">
                        <NumberStepper
                            value={travelers}
                            onChange={onTravelersChange}
                            min={1}
                            max={20}
                            disabled={loading || travelersLocked}
                        />
                    </div>
                    {showRecalculate && (
                        <button
                            type="button"
                            onClick={onRecalculate}
                            disabled={loading}
                            className="text-xs font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
                        >
                            Recalculate seats
                        </button>
                    )}
                </CardContent>
            </Card>

            {hasSpecialSeats && (
                <Card className="py-0">
                    <CardContent className="py-4">
                        <SpecialSeatsFilter
                            detectedProperties={detectedProperties}
                            filters={specialFilters}
                            onFiltersChange={onSpecialFiltersChange}
                            onRecalculate={onRecalculate}
                            disabled={loading}
                            filtersChanged={filtersChanged}
                        />
                    </CardContent>
                </Card>
            )}

            <Card className="py-0">
                <CardContent className="flex h-full flex-col justify-center gap-3 py-4">
                    <CoverageProgress covered={coverage.covered} total={coverage.total} />
                </CardContent>
            </Card>

            <Card className="py-0">
                <CardContent className="flex h-full flex-col gap-1 py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Repeat2 className="h-4 w-4" />
                        <span>Seat changes</span>
                    </div>
                    <div className="text-3xl font-bold tabular-nums">{seatChanges}</div>
                    <div className="text-xs text-muted-foreground">
                        {seatChanges === 0
                            ? "You'll stay in the same seat"
                            : "Changes required during the journey"}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
