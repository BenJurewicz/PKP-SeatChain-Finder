"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlockedSeat } from "@/lib/domain/types";
import { formatTime, formatDate } from "@/lib/formatting";

interface BlockedSeatsSectionProps {
  blockedSeats: BlockedSeat[];
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

        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {blockedSeats.map((seat, index) => {
            return (
              <div
                key={`${seat.carriageNumber}-${seat.seatNumber}-${index}`}
                className="w-68 p-4 bg-card border rounded-lg flex flex-col"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <div className="text-lg font-semibold">
                      Carriage {seat.carriageNumber}
                    </div>
                    <div className="text-lg font-semibold">
                      Seat {seat.seatNumber}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <div className="text-xs text-muted-foreground">
                      Available at
                    </div>
                    <div className="text-xl font-medium">
                      {formatTime(seat.validTo)}
                    </div>
                    <div className="text-base">
                      {formatDate(seat.validTo)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-3">
                  <span
                    className={cn(
                      "text-sm px-2 py-0.5 rounded-full",
                      seat.trainClass === "CLASS_1"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    )}
                  >
                    {seat.trainClass === "CLASS_1" ? "1st" : "2nd"}
                  </span>
                  <span className="text-sm px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                    {seat.position}
                  </span>
                </div>
                
                {seat.firstStationName && seat.lastStationName && (
                  <div className="text-sm text-muted-foreground mt-2">
                    {seat.firstStationName} → {seat.lastStationName}
                    {seat.firstDepartureTime && seat.lastArrivalTime && (
                      <span> ({formatTime(seat.firstDepartureTime)} - {formatTime(seat.lastArrivalTime)})</span>
                    )}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mt-2">
                  Blocked: {seat.reason}
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}