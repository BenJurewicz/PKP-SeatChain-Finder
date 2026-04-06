"use client";

import { parseSeat } from "@/lib/utils";
import type { InstructionStep } from "@/lib/instructions";
import { MapPin } from "lucide-react";

interface SeatChangeStep {
  station: string;
  carriage: string | null;
  seat: string | null;
  type: "start" | "change" | "resume" | "gap";
  segmentStart: number;
  segmentEnd: number;
  arrivalTime?: string;
}

interface SeatTimelineProps {
  travelerIndex: number;
  changeSteps: InstructionStep[];
  totalSegments: number;
}

function formatTime(isoString: string | undefined): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  });
}

function groupConsecutiveSteps(steps: InstructionStep[]): SeatChangeStep[] {
  const groups: SeatChangeStep[] = [];
  let currentGroup: SeatChangeStep | null = null;

  steps.forEach((step, idx) => {
    const parsed = step.seat ? parseSeat(step.seat) : { carriage: null, seat: null };

    if (!currentGroup) {
      currentGroup = {
        station: step.station,
        carriage: parsed.carriage,
        seat: parsed.seat,
        type: step.type,
        segmentStart: idx + 1,
        segmentEnd: idx + 1,
        arrivalTime: step.arrivalTime,
      };
    } else if (
      currentGroup.carriage === parsed.carriage &&
      currentGroup.seat === parsed.seat
    ) {
      currentGroup.segmentEnd = idx + 1;
    } else {
      groups.push(currentGroup);
      currentGroup = {
        station: step.station,
        carriage: parsed.carriage,
        seat: parsed.seat,
        type: step.type,
        segmentStart: idx + 1,
        segmentEnd: idx + 1,
        arrivalTime: step.arrivalTime,
      };
    }
  });

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

export function SeatTimeline({ travelerIndex, changeSteps, totalSegments }: SeatTimelineProps) {
  const groups = groupConsecutiveSteps(changeSteps);

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold">Traveler {travelerIndex}</h3>
      </div>

      {/* Desktop: Horizontal timeline */}
      <div className="hidden md:block overflow-x-auto p-4">
        <div className="flex items-stretch gap-0 min-w-max">
          {groups.map((group, idx) => {
            const segmentCount = group.segmentEnd - group.segmentStart + 1;
            const percentage = Math.round((segmentCount / totalSegments) * 100);
            const timeStr = formatTime(group.arrivalTime);
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
                    <span className="font-medium">Carriage</span> {group.carriage ?? "—"}, <span className="font-medium">Seat</span> {group.seat ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {segmentCount} {segmentCount === 1 ? "segment" : "segments"} ({percentage}%)
                  </div>
                </div>
                {idx < groups.length - 1 && (
                  <div className="flex items-center px-1">
                    <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12H19M19 12L12 5M19 12L12 19" strokeLinecap="round" strokeLinejoin="round"/>
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
          const segmentCount = group.segmentEnd - group.segmentStart + 1;
          const percentage = Math.round((segmentCount / totalSegments) * 100);
          const timeStr = formatTime(group.arrivalTime);
          const isFirst = idx === 0;

          return (
            <div key={idx} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
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
                <div className="text-xs text-muted-foreground">
                  {segmentCount} {segmentCount === 1 ? "segment" : "segments"}
                </div>
              </div>
              <div className="text-sm">
                <span className="font-medium">Carriage</span> {group.carriage ?? "—"}, <span className="font-medium">Seat</span> {group.seat ?? "—"}
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}