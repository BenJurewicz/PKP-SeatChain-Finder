"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, Train } from "lucide-react";
import type { Trip } from "@/lib/types";

interface TripListProps {
  trips: Trip[];
  selectedTrip: Trip | null;
  onSelect: (trip: Trip) => void;
  disabled?: boolean;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatDateTime(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleString("pl-PL", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TripList({ trips, selectedTrip, onSelect, disabled }: TripListProps) {
  if (trips.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No trips found for the selected route and date.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {trips.map((trip) => {
        const isSelected = selectedTrip?.tripIndex === trip.tripIndex;
        return (
          <Card
            key={trip.tripIndex}
            className={cn(
              "cursor-pointer transition-colors hover:border-primary",
              isSelected && "border-primary bg-primary/5"
            )}
            onClick={() => !disabled && onSelect(trip)}
          >
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Train className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{trip.trainName}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-medium">{trip.departure.stationName}</span>
                      <span className="text-muted-foreground mx-2">→</span>
                      <span className="font-medium">{trip.arrival.stationName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDuration(trip.duration)}</span>
                    </div>
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground">
                    <span>{formatDateTime(trip.departure.dateTime)}</span>
                    <span className="mx-2">—</span>
                    <span>{formatDateTime(trip.arrival.dateTime)}</span>
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground">
                    {trip.stops.length} stops
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}