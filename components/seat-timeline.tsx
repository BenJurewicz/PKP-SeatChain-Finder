"use client";

import type { InstructionStep } from "@/lib/instructions";
import type { PerSegmentAssignment } from "@/lib/seat-chain";
import { MapPin, ArrowRight, Armchair } from "lucide-react";
import { formatTime } from "@/lib/formatting";
import { groupConsecutiveSteps } from "@/lib/domain/group-steps";
import { cn } from "@/lib/utils";

interface SeatTimelineProps {
  travelerIndex: number;
  changeSteps: InstructionStep[];
  totalSegments: number;
  assignments: PerSegmentAssignment[];
}

function seatLabel(carriage: string | null, seat: string | null) {
  if (seat === null) return null;
  if (carriage === null) return `Seat ${seat}`;
  return `Carriage ${carriage}, Seat ${seat}`;
}

export function SeatTimeline({
  travelerIndex,
  changeSteps,
  totalSegments,
  assignments,
}: SeatTimelineProps) {
  const groups = groupConsecutiveSteps(changeSteps, assignments);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {travelerIndex}
          </span>
          Traveler {travelerIndex}
        </h3>
        <span className="text-xs text-muted-foreground">
          {assignments.length} {assignments.length === 1 ? "segment" : "segments"}
        </span>
      </div>

      {/* Desktop: horizontal timeline */}
      <div className="hidden overflow-x-auto p-4 md:block">
        <ol className="flex min-w-max items-stretch">
          {groups.map((group, idx) => {
            const percentage = Math.round((group.segmentCount / totalSegments) * 100);
            const timeStr = group.arrivalTime ? formatTime(group.arrivalTime) : null;
            const isFirst = idx === 0;
            const noSeat = group.seat === null;

            return (
              <li key={idx} className="flex items-stretch">
                <div
                  className={cn(
                    "flex w-[170px] flex-col rounded-lg border p-3",
                    noSeat ? "border-dashed bg-muted/40" : "bg-background"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate" title={group.station}>
                      {group.station}
                    </span>
                  </div>
                  {timeStr && (
                    <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {isFirst ? "Dep" : "Arr"} {timeStr}
                    </div>
                  )}
                  <div
                    className={cn(
                      "mt-2 flex items-start gap-1.5 text-sm font-medium",
                      noSeat && "text-muted-foreground"
                    )}
                  >
                    {noSeat ? (
                      <span className="flex items-center gap-1.5 italic">
                        <Armchair className="h-3.5 w-3.5 flex-shrink-0" />
                        No seat
                      </span>
                    ) : (
                      <Armchair className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    )}
                    <span>{seatLabel(group.carriage, group.seat)}</span>
                  </div>
                  <div className="mt-auto pt-2 text-xs text-muted-foreground">
                    {group.segmentCount} {group.segmentCount === 1 ? "segment" : "segments"}{" "}
                    ({percentage}%)
                  </div>
                </div>
                {idx < groups.length - 1 && (
                  <div className="flex items-center px-1.5 text-muted-foreground" aria-hidden="true">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Mobile: vertical cards */}
      <ol className="relative divide-y md:hidden">
        {groups.map((group, idx) => {
          const percentage = Math.round((group.segmentCount / totalSegments) * 100);
          const timeStr = group.arrivalTime ? formatTime(group.arrivalTime) : null;
          const isFirst = idx === 0;
          const noSeat = group.seat === null;

          return (
            <li key={idx} className="flex gap-3 p-4">
              <div className="flex flex-col items-center pt-1" aria-hidden="true">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    noSeat ? "border border-muted-foreground bg-transparent" : "bg-primary"
                  )}
                />
                {idx < groups.length - 1 && (
                  <span className="mt-1 w-px flex-1 bg-border" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{group.station}</span>
                  {timeStr && (
                    <span className="flex-shrink-0 text-xs tabular-nums text-muted-foreground">
                      {isFirst ? "Dep" : "Arr"} {timeStr}
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    "mt-1 text-sm font-medium",
                    noSeat && "font-normal italic text-muted-foreground"
                  )}
                >
                  {noSeat ? "No seat available" : seatLabel(group.carriage, group.seat)}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {group.segmentCount} {group.segmentCount === 1 ? "segment" : "segments"} (
                  {percentage}%)
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
