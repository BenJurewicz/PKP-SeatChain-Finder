"use client";

import { Users, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoverageProgress } from "@/components/coverage-progress";
import { NumberStepper } from "@/components/number-stepper";
import { isMultiChainOutput, type SeatChainOutput } from "@/lib/domain/seat-chain";

interface StatsCardsProps {
  seatChain: SeatChainOutput;
  travelers: number;
  onTravelersChange: (value: number) => void;
  canRecalculate: boolean;
  onRecalculate: () => void;
  isRecalculating: boolean;
}

export function StatsCards({
  seatChain,
  travelers,
  onTravelersChange,
  canRecalculate,
  onRecalculate,
  isRecalculating,
}: StatsCardsProps) {
  const isMulti = isMultiChainOutput(seatChain);

  const coverageData = isMulti
    ? {
        covered: seatChain.summary.coveredTravelerSegments,
        total: seatChain.summary.totalTravelerSegments,
      }
    : {
        covered: seatChain.summary.coveredSegments,
        total: seatChain.summary.totalSegments,
      };

  const seatChangesCount = isMulti
    ? seatChain.summary.totalSeatChanges
    : seatChain.summary.seatChanges;

  const displayedTravelers = isMulti ? seatChain.summary.travelers : travelers;
  const isDisabled = isMulti || isRecalculating;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Travelers</span>
          </div>
          <div className="flex justify-center">
            <NumberStepper
              value={displayedTravelers}
              onChange={onTravelersChange}
              min={1}
              max={20}
              disabled={isDisabled}
            />
          </div>
          {canRecalculate && !isMulti && (
            <Button
              size="sm"
              onClick={onRecalculate}
              disabled={isRecalculating}
              className="mt-2 w-full"
            >
              {isRecalculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recalculating...
                </>
              ) : (
                "Recalculate"
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <CoverageProgress covered={coverageData.covered} total={coverageData.total} />
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
  );
}