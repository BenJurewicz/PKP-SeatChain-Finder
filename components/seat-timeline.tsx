"use client";

import type { InstructionStep } from "@/lib/domain/instructions";
import type { PerSegmentAssignment } from "@/lib/domain/seat-chain";
import { MapPin } from "lucide-react";
import { formatTime } from "@/lib/formatting";
import { groupConsecutiveSteps } from "@/lib/domain/group-steps";

interface SeatTimelineProps {
  travelerIndex: number;
  changeSteps: InstructionStep[];
  totalSegments: number;
  assignments: PerSegmentAssignment[];
}

export function SeatTimeline({
  travelerIndex,
  changeSteps,
  totalSegments,
  assignments,
}: SeatTimelineProps) {
  const groups = groupConsecutiveSteps(changeSteps, assignments);

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold">Traveler {travelerIndex}</h3>
      </div>

      {/* Desktop: Horizontal timeline */}
      <div className="hidden md:block overflow-x-auto p-4">
        <div className="flex items-stretch gap-0 min-w-max">
          {groups.map((group, idx) => {
            const segmentCount = group.segmentCount;
            const percentage = Math.round((segmentCount / totalSegments) * 100);
            const timeStr = group.arrivalTime ? formatTime(group.arrivalTime) : null;
            const isFirst = idx === 0;

            return (
              <div key={idx} className="flex items-stretch">
                <div className="flex flex-col rounded-lg border p-3 min-w-[140px] bg-card">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{group.station}</span>
                  </div>
                  {timeStr && (
                    <div className="text-xs text-muted-foreground mb-1">
                      {isFirst ? "Dep:" : "Arr:"} {timeStr}
                    </div>
                  )}
                  <div className="text-sm">
                  {group.seat === null ? (
                    <span className="text-muted-foreground">No seat available</span>
                  ) : (
                    <>
                      <span className="font-medium">Carriage</span>{" "}
                      {group.carriage}, <span className="font-medium">Seat</span>{" "}
                      {group.seat}
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {segmentCount} {segmentCount === 1 ? "segment" : "segments"} ({percentage}
                  %)
                </div>
                </div>
                {idx < groups.length - 1 && (
                  <div className="flex items-center px-1">
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M5 12H19M19 12L12 5M19 12L12 19"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Vertical cards */}
      <div className="md:hidden divide-y">
        {groups.map((group, idx) => {
          const segmentCount = group.segmentCount;
          const percentage = Math.round((segmentCount / totalSegments) * 100);
          const timeStr = group.arrivalTime ? formatTime(group.arrivalTime) : null;
          const isFirst = idx === 0;

          return (
            <div key={idx} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="font-medium">{group.station}</span>
                  </div>
                  {timeStr && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {isFirst ? "Dep:" : "Arr:"} {timeStr}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-xs text-muted-foreground">
                    {segmentCount} {segmentCount === 1 ? "segment" : "segments"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {percentage}%
                  </div>
                </div>
              </div>
              <div className="text-sm">
                {group.seat === null ? (
                  <span className="text-muted-foreground">No seat available</span>
                ) : (
                  <>
                    <span className="font-medium">Carriage</span>{" "}
                    {group.carriage}, <span className="font-medium">Seat</span>{" "}
                    {group.seat}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}