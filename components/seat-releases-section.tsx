"use client";

import { useState } from "react";
import { Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapsibleCard } from "@/components/collapsible-card";
import { Pill } from "@/components/pill";
import type { SeatRelease } from "@/lib/types";
import { formatTime, formatDate } from "@/lib/formatting";

interface SeatReleasesSectionProps {
  seatReleases: SeatRelease[];
}

function PositionBadge({ position }: { position: SeatRelease["position"] }) {
  const label =
    position === "WINDOW" ? "Window" : position === "AISLE" ? "Aisle" : "Middle";
  return <Pill tone="neutral">{label}</Pill>;
}

export function SeatReleasesSection({ seatReleases }: SeatReleasesSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (seatReleases.length === 0) return null;

  const beforeDepartureCount = seatReleases.filter((s) => s.availableBeforeDeparture).length;

  return (
    <CollapsibleCard
      icon={<Clock className="size-4 text-muted-foreground" />}
      title="Seats becoming available"
      meta={
        <>
          <span className="text-sm font-normal text-muted-foreground">
            ({seatReleases.length} {seatReleases.length === 1 ? "seat" : "seats"})
          </span>
          {beforeDepartureCount > 0 && (
            <Pill tone="emerald" className="hidden sm:inline-flex">
              <Sparkles className="h-3 w-3" />
              {beforeDepartureCount} free before departure
            </Pill>
          )}
        </>
      }
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {seatReleases.map((seat, index) => (
          <article
            key={`${seat.carriageNumber}-${seat.seatNumber}-${index}`}
            className={cn(
              "flex flex-col gap-3 rounded-lg border p-4",
              seat.availableBeforeDeparture
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "bg-background"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Carriage {seat.carriageNumber}
                </div>
                <div className="text-2xl font-bold leading-tight tabular-nums">
                  Seat {seat.seatNumber}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Free at</div>
                <div className="text-lg font-semibold tabular-nums">
                  {formatTime(seat.validTo)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(seat.validTo)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Pill tone={seat.trainClass === "CLASS_1" ? "blue" : "emerald"}>
                {seat.trainClass === "CLASS_1" ? "1st class" : "2nd class"}
              </Pill>
              <PositionBadge position={seat.position} />
              {seat.availableBeforeDeparture && (
                <Pill tone="emerald">
                  <Sparkles className="h-3 w-3" />
                  Free before departure
                </Pill>
              )}
            </div>

            {seat.firstStationName && seat.lastStationName && (
              <div className="text-sm text-muted-foreground">
                {seat.firstStationName} → {seat.lastStationName}
                {seat.firstDepartureTime && seat.lastArrivalTime && (
                  <span className="tabular-nums">
                    {" "}
                    ({formatTime(seat.firstDepartureTime)} – {formatTime(seat.lastArrivalTime)})
                  </span>
                )}
              </div>
            )}

            <p className="mt-auto text-xs text-muted-foreground">
              {seat.status === "BLOCKED" ? "Blocked" : "Reserved"} for {seat.reason} until{" "}
              {formatTime(seat.validTo)}.
            </p>
          </article>
        ))}
      </div>
    </CollapsibleCard>
  );
}
