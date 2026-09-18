"use client";

import { useState } from "react";
import { Clock, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeatRelease } from "@/lib/types";
import { formatTime, formatDate } from "@/lib/formatting";

interface SeatReleasesSectionProps {
  seatReleases: SeatRelease[];
}

function PositionBadge({ position }: { position: SeatRelease["position"] }) {
  const label =
    position === "WINDOW" ? "Window" : position === "AISLE" ? "Aisle" : "Middle";
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}

export function SeatReleasesSection({ seatReleases }: SeatReleasesSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (seatReleases.length === 0) return null;

  const beforeDepartureCount = seatReleases.filter((s) => s.availableBeforeDeparture).length;

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
      >
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">Seats becoming available</span>
          <span className="text-sm text-muted-foreground">
            ({seatReleases.length} {seatReleases.length === 1 ? "seat" : "seats"})
          </span>
          {beforeDepartureCount > 0 && (
            <span className="hidden items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 sm:inline-flex dark:text-emerald-400">
              <Sparkles className="h-3 w-3" />
              {beforeDepartureCount} free before departure
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="grid gap-3 border-t p-4 sm:grid-cols-2 xl:grid-cols-3">
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
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    seat.trainClass === "CLASS_1"
                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-300"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  )}
                >
                  {seat.trainClass === "CLASS_1" ? "1st class" : "2nd class"}
                </span>
                <PositionBadge position={seat.position} />
                {seat.availableBeforeDeparture && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-3 w-3" />
                    Free before departure
                  </span>
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
      )}
    </section>
  );
}
