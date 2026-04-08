"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import { TrainCarrierIcon } from "@/components/train-carrier-icon";
import type { Trip } from "@/lib/types";
import { formatDuration, formatTime, formatDate } from "@/lib/formatting";

interface TripListProps {
  trips: Trip[];
  selectedTrip: Trip | null;
  onSelect: (trip: Trip) => void;
  disabled?: boolean;
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
    <div className="space-y-3">{trips.map((trip) => (
        <TripCard
          key={trip.tripIndex}
          trip={trip}
          isSelected={selectedTrip?.tripIndex === trip.tripIndex}
          onSelect={() => !disabled && onSelect(trip)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

interface TripCardProps {
  trip: Trip;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function TripCard({ trip, isSelected, onSelect, disabled }: TripCardProps) {
  const [showStops, setShowStops] = useState(false);

  const firstStop = trip.stops[0];
  const lastStop = trip.stops[trip.stops.length - 1];
  const intermediateStops = trip.stops.slice(1, -1);
  const stopsToShow = showStops ? intermediateStops : intermediateStops.slice(0, 2);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-primary hover:shadow-sm",
        isSelected && "border-primary bg-primary/5 shadow-sm",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={onSelect}
    >
      <CardContent className="py-4 px-5">
        {/* Header: Carrier + Duration */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrainCarrierIcon carrierId={trip.carrierId} />
            <span className="text-lg font-bold">{trip.trainName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-base font-medium">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatDuration(trip.duration)}</span>
          </div>
        </div>

        {/* Timeline: Departure → Arrival */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex flex-col items-start">
            <div className="text-base font-semibold">{formatTime(trip.departure.dateTime)}</div>
            <div className="text-xs text-muted-foreground">{formatDate(trip.departure.dateTime)}</div>
          </div>
          <div className="flex-1 border-t-2 border-dashed border-muted mt-2" />
          <div className="flex flex-col items-end">
            <div className="text-base font-semibold">{formatTime(trip.arrival.dateTime)}</div>
            <div className="text-xs text-muted-foreground">{formatDate(trip.arrival.dateTime)}</div>
          </div>
        </div>

        {/* Stations */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm">
            <div className="font-medium">{trip.departure.stationName}</div>
            {firstStop?.platform && (
              <div className="text-xs text-muted-foreground">Platform {firstStop.platform}</div>
            )}
          </div>
          <Arrow className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm text-right">
            <div className="font-medium">{trip.arrival.stationName}</div>
            {lastStop?.platform && (
              <div className="text-xs text-muted-foreground">Platform {lastStop.platform}</div>
            )}
          </div>
        </div>

        {/* Stops */}
        {intermediateStops.length > 0 && (
          <div className="pt-2 border-t">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowStops(!showStops);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <span>
                {intermediateStops.length} stop{intermediateStops.length !== 1 ? "s" : ""}:
              </span>
              <span className="flex-1 truncate">
                {stopsToShow.map((s) => s.stationName).join(", ")}
                {!showStops && intermediateStops.length > 2 && "..."}
              </span>
              {showStops ? (
                <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
              )}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Arrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}