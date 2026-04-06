"use client";

import { useState } from "react";
import { Clock, Train } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlockedSeat } from "@/lib/types";

interface BlockedSeatsSectionProps {
  blockedSeats: BlockedSeat[];
}

function formatDateTime(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString("pl-PL", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Warsaw",
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string | undefined): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Warsaw",
    });
  } catch {
    return "";
  }
}

export function BlockedSeatsSection({ blockedSeats }: BlockedSeatsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (blockedSeats.length === 0) return null;

  return (
    <div className="mt-4">
      <details className="group" open={isOpen}>
        <summary
          className="cursor-pointer p-4 bg-muted rounded-lg font-medium flex items-center justify-between list-none marker:content-['']"
          onClick={(e) => {
            e.preventDefault();
            setIsOpen(!isOpen);
          }}
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Upcoming Available Seats</span>
            <span className="text-sm font-normal text-muted-foreground">
              ({blockedSeats.length} {blockedSeats.length === 1 ? "seat" : "seats"})
            </span>
          </span>
          <span className="text-muted-foreground">
            {isOpen ? "−" : "+"}
          </span>
        </summary>

        <div className="mt-4 space-y-2">
          {blockedSeats.map((seat, index) => {
            const showJourney = seat.firstStationName !== seat.lastStationName;
            
            return (
              <div
                key={`${seat.carriageNumber}-${seat.seatNumber}-${index}`}
                className="p-3 bg-card border rounded-lg"
              >
                <div className="flex items-center gap-2 font-medium flex-wrap">
                  <Train className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>
                    Carriage {seat.carriageNumber}, Seat {seat.seatNumber}
                  </span>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      seat.trainClass === "CLASS_1"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    )}
                  >
                    {seat.trainClass === "CLASS_1" ? "1st Class" : "2nd Class"}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {seat.position}
                  </span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  <span>Blocked for: {seat.reason}</span>
                  <span className="mx-2">•</span>
                  <span>Available: {formatDateTime(seat.validTo)}</span>
                </div>
                {seat.firstStationName && seat.lastStationName && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {showJourney ? (
                      <>
                        Journey: {seat.firstStationName} → {seat.lastStationName}
                        {seat.firstDepartureTime && seat.lastArrivalTime && (
                          <> ({formatTime(seat.firstDepartureTime)} - {formatTime(seat.lastArrivalTime)})</>
                        )}
                      </>
                    ) : (
                      <>
                        Segment: {seat.firstStationName}
                        {seat.firstDepartureTime && <> ({formatTime(seat.firstDepartureTime)})</>}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}