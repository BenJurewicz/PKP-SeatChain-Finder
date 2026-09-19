"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle } from "lucide-react";
import { CollapsibleCard } from "@/components/collapsible-card";
import { Pill } from "@/components/pill";
import { parseSeat } from "@/lib/utils";
import { formatTime } from "@/lib/formatting";
import { isMultiChainOutput, type SeatChainOutput } from "@/lib/seat-chain";

interface DetailedSegmentsCardProps {
  seatChain: SeatChainOutput;
  open: boolean;
  onToggle: () => void;
}

function StatusBadge({ collisionFree }: { collisionFree: boolean }) {
  return collisionFree ? (
    <Pill tone="emerald">
      <CheckCircle2 className="h-3 w-3" />
      OK
    </Pill>
  ) : (
    <Pill tone="red">
      <XCircle className="h-3 w-3" />
      Collision
    </Pill>
  );
}

export function DetailedSegmentsCard({ seatChain, open, onToggle }: DetailedSegmentsCardProps) {
  return (
    <CollapsibleCard
      title="Detailed segment view"
      meta={
        <span className="hidden text-sm font-normal text-muted-foreground sm:inline">
          Per-segment breakdown of seat assignments
        </span>
      }
      open={open}
      onOpenChange={() => onToggle()}
    >
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
    </CollapsibleCard>
  );
}
