"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { parseSeat } from "@/lib/utils";
import { formatTime } from "@/lib/formatting";
import { isMultiChainOutput, type SeatChainOutput } from "@/lib/seat-chain";
import { cn } from "@/lib/utils";

interface DetailedSegmentsCardProps {
  seatChain: SeatChainOutput;
  open: boolean;
  onToggle: () => void;
}

function StatusBadge({ collisionFree }: { collisionFree: boolean }) {
  return collisionFree ? (
    <Badge
      variant="outline"
      className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    >
      <CheckCircle2 className="h-3 w-3" />
      OK
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      Collision
    </Badge>
  );
}

export function DetailedSegmentsCard({ seatChain, open, onToggle }: DetailedSegmentsCardProps) {
  return (
    <Card className="py-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-6 text-left"
      >
        <span>
          <CardTitle className="text-base">Detailed segment view</CardTitle>
          <CardDescription className="mt-1">
            Per-segment breakdown of seat assignments
          </CardDescription>
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 flex-shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border">
            {isMultiChainOutput(seatChain) ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead rowSpan={2}>Seg</TableHead>
                    <TableHead rowSpan={2}>From</TableHead>
                    <TableHead rowSpan={2}>To</TableHead>
                    <TableHead rowSpan={2}>Time</TableHead>
                    {seatChain.travelerChains.map((tc) => (
                      <TableHead
                        key={tc.travelerIndex}
                        colSpan={2}
                        className="text-center"
                      >
                        Traveler {tc.travelerIndex}
                      </TableHead>
                    ))}
                    <TableHead rowSpan={2}>Status</TableHead>
                  </TableRow>
                  <TableRow>
                    {seatChain.travelerChains.map((tc) => (
                      <React.Fragment key={`sub-${tc.travelerIndex}`}>
                        <TableHead>Car</TableHead>
                        <TableHead>Seat</TableHead>
                      </React.Fragment>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seatChain.perSegmentTravelerAssignment.map((seg) => {
                    const parsedSeats = seg.assignedSeats.map(parseSeat);
                    return (
                      <TableRow key={seg.segmentIndex}>
                        <TableCell>{seg.segmentIndex}</TableCell>
                        <TableCell>{seg.stationFromName ?? seg.stationFrom}</TableCell>
                        <TableCell>{seg.stationToName ?? seg.stationTo}</TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {formatTime(seg.departureTime)}
                        </TableCell>
                        {parsedSeats.map((parsed, idx) => (
                          <React.Fragment key={idx}>
                            <TableCell className="tabular-nums">
                              {parsed.carriage ?? "—"}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {parsed.seat ?? "—"}
                            </TableCell>
                          </React.Fragment>
                        ))}
                        <TableCell>
                          <StatusBadge collisionFree={seg.collisionFree} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seg</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Carriage</TableHead>
                    <TableHead>Seat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seatChain.perSegmentAssignment.map((seg) => {
                    const parsed = parseSeat(seg.assignedSeat);
                    return (
                      <TableRow key={seg.segmentIndex}>
                        <TableCell>{seg.segmentIndex}</TableCell>
                        <TableCell>{seg.stationFromName ?? seg.stationFrom}</TableCell>
                        <TableCell>{seg.stationToName ?? seg.stationTo}</TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {formatTime(seg.departureTime)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {parsed.carriage ?? "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">{parsed.seat ?? "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
