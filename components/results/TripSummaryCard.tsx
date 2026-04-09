"use client";

import { Train, Download } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrainCarrierIcon } from "@/components/train-carrier-icon";
import type { TripInfo } from "@/lib/services/run";
import { formatTime, formatDate, formatDuration } from "@/lib/formatting";

interface TripSummaryCardProps {
  tripInfo: TripInfo | undefined;
  sourceHarName: string;
  showNewSearchButton: boolean;
  onNewSearch: () => void;
  onDownload: () => void;
}

export function TripSummaryCard({
  tripInfo,
  sourceHarName,
  showNewSearchButton,
  onNewSearch,
  onDownload,
}: TripSummaryCardProps) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            {tripInfo ? (
              <TrainCarrierIcon carrierId={tripInfo.carrierId} className="h-8 w-auto" />
            ) : (
              <Train className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <div className="font-bold text-lg">
                {tripInfo?.trainName ?? "Unknown Train"}
              </div>
              <div className="text-sm text-muted-foreground">
                {tripInfo?.departureStation ?? "Unknown"} → {tripInfo?.arrivalStation ?? "Unknown"}
              </div>
              {tripInfo && (
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDuration(tripInfo.duration)}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-6">
            {tripInfo && (
              <>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatTime(tripInfo.departureTime)}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(tripInfo.departureTime)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{formatTime(tripInfo.arrivalTime)}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(tripInfo.arrivalTime)}</div>
                </div>
              </>
            )}
            <div className="flex gap-2">
              {showNewSearchButton && (
                <Button variant="outline" size="sm" onClick={onNewSearch}>
                  New Search
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
          {!tripInfo && (
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Results ready</span>
              <span>—</span>
              <span>{sourceHarName}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}