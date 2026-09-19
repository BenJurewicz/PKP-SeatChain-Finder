"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Spinner } from "@/components/loading";
import { TripCard } from "@/components/trip-card";
import type { Trip } from "@/lib/types";


interface TripListProps {
  trips: Trip[];
  selectedTrip: Trip | null;
  onSelect: (trip: Trip) => void;
  disabled?: boolean;
  onLoadEarlier?: () => void;
  onLoadLater?: () => void;
  earlierLoading?: boolean;
  laterLoading?: boolean;
  earlierExhausted?: boolean;
  laterExhausted?: boolean;
}

export function TripList({
  trips,
  selectedTrip,
  onSelect,
  disabled,
  onLoadEarlier,
  onLoadLater,
  earlierLoading = false,
  laterLoading = false,
  earlierExhausted = false,
  laterExhausted = false,
}: TripListProps) {
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
    <div className="space-y-3">
      {onLoadEarlier ? (
        <TripWindowButton
          label={earlierExhausted ? "No earlier trains" : "See earlier trains"}
          icon={<ChevronUp className="h-4 w-4" />}
          loading={earlierLoading}
          exhausted={earlierExhausted}
          disabled={disabled}
          onClick={onLoadEarlier}
        />
      ) : null}
      {trips.map((trip) => (
        <TripCard
          key={trip.tripIndex}
          trip={trip}
          isSelected={selectedTrip?.tripIndex === trip.tripIndex}
          onSelect={() => !disabled && onSelect(trip)}
          disabled={disabled}
        />
      ))}
      {onLoadLater ? (
        <TripWindowButton
          label={laterExhausted ? "No later trains" : "See later trains"}
          icon={<ChevronDown className="h-4 w-4" />}
          loading={laterLoading}
          exhausted={laterExhausted}
          disabled={disabled}
          onClick={onLoadLater}
        />
      ) : null}
    </div>
  );
}

interface TripWindowButtonProps {
  label: string;
  icon: React.ReactNode;
  loading: boolean;
  exhausted: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function TripWindowButton({ label, icon, loading, exhausted, disabled, onClick }: TripWindowButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={onClick}
      disabled={disabled || loading || exhausted}
    >
      {loading ? <Spinner className="h-4 w-4" /> : icon}
      {label}
    </Button>
  );
}
