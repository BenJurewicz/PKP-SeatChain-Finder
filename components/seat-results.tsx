"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ResultsArrival } from "@/components/results-arrival";
import { SeatTimeline } from "@/components/seat-timeline";
import { SeatReleasesSection } from "@/components/seat-releases-section";
import { DetailedSegmentsCard } from "@/components/detailed-segments-card";
import { SpecialSeatsFilter } from "@/components/special-seats-filter";
import { downloadReportHtml } from "@/lib/report-download";
import type { SeatPipeline } from "@/components/hooks/use-seat-pipeline";
import type { CoverageStats } from "@/lib/view-model";
import {
    getCoverage,
    getSeatChanges,
    hasSeatCollisions,
} from "@/lib/view-model";

interface SeatResultsProps {
  pipeline: SeatPipeline;
  /** Shown when no trip info exists (HAR capture without trip metadata). */
  sourceHarName: string;
  /** Traveler stepper + recalculation disabled when segments can't be refetched. */
  canRecalculate: boolean;
  /** Optional wrapper around the travelers change (e.g. to sync the URL). */
  onTravelersChange?: (value: number) => void;
  /** Back to the train choice (live search only). */
  onChangeTrip?: () => void;
  /** Full restart of the flow. */
  onNewSearch: () => void;
}

/** Full results view for one seat-chain run: arrival banner, key numbers,
 * special-seat filters, per-traveler timelines, releasing seats, details. */
export function SeatResults({
  pipeline,
  sourceHarName,
  canRecalculate,
  onTravelersChange,
  onChangeTrip,
  onNewSearch,
}: SeatResultsProps) {
  const [showDetailedView, setShowDetailedView] = useState(false);

  const output = pipeline.output;
  if (!output) return null;

  const coverage: CoverageStats = getCoverage(output.seatChain);
  const seatChanges = getSeatChanges(output.seatChain);
  const hasCollisions = hasSeatCollisions(output.seatChain);
  const hasSpecialSeats = pipeline.detectedProperties.length > 0;
  const recalcBusy = pipeline.building;

  return (
    <div className="flex flex-col gap-6">
      <ResultsArrival
        tripInfo={pipeline.tripInfo ?? undefined}
        sourceHarName={sourceHarName}
        coverage={coverage}
        seatChanges={seatChanges}
        travelers={pipeline.travelers}
        travelersLocked={!canRecalculate}
        onTravelersChange={onTravelersChange ?? pipeline.setTravelers}
        onRecalculate={canRecalculate ? pipeline.recalculate : undefined}
        recalcLoading={recalcBusy}
        onDownload={
          output.reportHtml
            ? () => downloadReportHtml(output.reportHtml)
            : undefined
        }
        onChangeTrip={onChangeTrip}
        onNewSearch={onNewSearch}
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

      {pipeline.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{pipeline.error}</AlertDescription>
        </Alert>
      ) : null}

      {hasSpecialSeats ? (
        <Card>
          <CardContent className="py-5">
            <SpecialSeatsFilter
              detectedProperties={pipeline.detectedProperties}
              filters={pipeline.specialFilters}
              onFiltersChange={pipeline.setSpecialFilters}
              onRecalculate={pipeline.recalculate}
              disabled={recalcBusy}
              filtersChanged={pipeline.filtersChanged}
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
        {output.travelerViews.map((traveler) => (
          <SeatTimeline
            key={traveler.travelerIndex}
            travelerIndex={traveler.travelerIndex}
            changeSteps={traveler.changeSteps}
            totalSegments={traveler.assignments.length}
            assignments={traveler.assignments}
          />
        ))}
      </section>

      {output.seatReleases.length > 0 && (
        <SeatReleasesSection seatReleases={output.seatReleases} />
      )}

      <DetailedSegmentsCard
        seatChain={output.seatChain}
        open={showDetailedView}
        onToggle={() => setShowDetailedView(!showDetailedView)}
      />
    </div>
  );
}
