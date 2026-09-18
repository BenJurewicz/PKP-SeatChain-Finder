"use client";

import { Train, Clock } from "lucide-react";
import { TrainCarrierIcon } from "@/components/train-carrier-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface TripHeaderCardProps {
    tripInfo: TripInfo | undefined;
    sourceHarName: string;
    onDownload: () => void;
    onNewSearch?: () => void;
}

export function TripHeaderCard({
    tripInfo,
    sourceHarName,
    onDownload,
    onNewSearch,
}: TripHeaderCardProps) {
    return (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-muted">
                        {tripInfo ? (
                            <TrainCarrierIcon
                                carrierId={tripInfo.carrierId}
                                className="h-7 w-auto"
                            />
                        ) : (
                            <Train className="h-6 w-6 text-muted-foreground" />
                        )}
                    </span>
                    <div className="min-w-0">
                        <div className="truncate text-lg font-bold leading-tight">
                            {tripInfo?.trainName ?? "Unknown train"}
                        </div>
                        <div className="mt-0.5 truncate text-sm text-muted-foreground">
                            {tripInfo
                                ? `${tripInfo.departureStation} → ${tripInfo.arrivalStation}`
                                : sourceHarName}
                        </div>
                        {tripInfo && (
                            <Badge variant="secondary" className="mt-2 gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(tripInfo.duration)}
                            </Badge>
                        )}
                    </div>
                </div>

                {tripInfo && (
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                Departs
                            </div>
                            <div className="text-lg font-semibold tabular-nums">
                                {formatTime(tripInfo.departureTime)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {formatDate(tripInfo.departureTime)}
                            </div>
                        </div>
                        <div
                            aria-hidden="true"
                            className="hidden h-10 w-px bg-border sm:block"
                        />
                        <div className="text-right">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                Arrives
                            </div>
                            <div className="text-lg font-semibold tabular-nums">
                                {formatTime(tripInfo.arrivalTime)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {formatDate(tripInfo.arrivalTime)}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-shrink-0 gap-2 sm:flex-col">
                    {onNewSearch && (
                        <Button variant="outline" size="sm" onClick={onNewSearch}>
                            New search
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={onDownload}>
                        Download
                    </Button>
                </div>
            </div>
        </div>
    );
}
