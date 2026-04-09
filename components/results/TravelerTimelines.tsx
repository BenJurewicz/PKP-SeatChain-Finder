"use client";

import { SeatTimeline } from "@/components/seat-timeline";
import type { TravelerView } from "@/lib/domain/instructions";

interface TravelerTimelinesProps {
  travelerViews: TravelerView[];
}

export function TravelerTimelines({ travelerViews }: TravelerTimelinesProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Seat Assignments</h2>
      <p className="text-sm text-muted-foreground">
        Your seat plan for each traveler.
      </p>
      {travelerViews.map((traveler) => (
        <SeatTimeline
          key={traveler.travelerIndex}
          travelerIndex={traveler.travelerIndex}
          changeSteps={traveler.changeSteps}
          totalSegments={traveler.assignments.length}
          assignments={traveler.assignments}
        />
      ))}
    </div>
  );
}