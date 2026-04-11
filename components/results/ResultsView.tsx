"use client";

import React, { useMemo } from "react";
import type { RunResponse } from "@/lib/services/run";
import { isMultiChainOutput } from "@/lib/domain/seat-chain";
import { downloadReportHtml } from "@/lib/utils/download";
import { TripSummaryCard } from "./TripSummaryCard";
import { CollisionAlert } from "./CollisionAlert";
import { StatsCards } from "./StatsCards";
import { TravelerTimelines } from "./TravelerTimelines";
import { BlockedSeatsSection } from "@/components/blocked-seats-section";
import { DetailedSegmentTable } from "./DetailedSegmentTable";

interface ResultsViewProps {
  result: RunResponse;
  travelers: number;
  onTravelersChange: (value: number) => void;
  showNewSearchButton: boolean;
  onNewSearch: () => void;
  canRecalculate: boolean;
  onRecalculate: () => void;
  isRecalculating: boolean;
}

export function ResultsView({
  result,
  travelers,
  onTravelersChange,
  showNewSearchButton,
  onNewSearch,
  canRecalculate,
  onRecalculate,
  isRecalculating,
}: ResultsViewProps) {
  const hasCollisions = useMemo(() => {
    if (isMultiChainOutput(result.seatChain)) {
      return result.seatChain.perSegmentTravelerAssignment.some(
        (seg) => !seg.collisionFree
      );
    }
    return false;
  }, [result]);

  return (
    <>
      <TripSummaryCard
        tripInfo={result.tripInfo}
        sourceHarName={result.sourceHarName}
        showNewSearchButton={showNewSearchButton}
        onNewSearch={onNewSearch}
        onDownload={() => downloadReportHtml(result.reportHtml)}
      />

      {hasCollisions && <CollisionAlert />}

      <StatsCards
        seatChain={result.seatChain}
        travelers={
          isMultiChainOutput(result.seatChain)
            ? result.seatChain.summary.travelers
            : travelers
        }
        onTravelersChange={onTravelersChange}
        canRecalculate={canRecalculate}
        onRecalculate={onRecalculate}
        isRecalculating={isRecalculating}
      />

      <TravelerTimelines travelerViews={result.travelerViews} />

      {result.blockedSeats && result.blockedSeats.length > 0 && (
        <BlockedSeatsSection blockedSeats={result.blockedSeats} />
      )}

      <DetailedSegmentTable seatChain={result.seatChain} />
    </>
  );
}