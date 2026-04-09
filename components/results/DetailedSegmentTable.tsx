"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseSeat } from "@/lib/utils/parse-seat";
import { formatTime } from "@/lib/formatting";
import {
  isMultiChainOutput,
  type SeatChainOutput,
  type MultiChainOutput,
  type SingleChainOutput,
} from "@/lib/domain/seat-chain";

interface DetailedSegmentTableProps {
  seatChain: SeatChainOutput;
}

export function DetailedSegmentTable({ seatChain }: DetailedSegmentTableProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Detailed Segment View</CardTitle>
            <CardDescription>Per-segment breakdown of seat assignments</CardDescription>
          </div>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            {isMultiChainOutput(seatChain) ? (
              <MultiSegmentTable seatChain={seatChain as MultiChainOutput & { stations: Record<string, string> }} />
            ) : (
              <SingleSegmentTable seatChain={seatChain as SingleChainOutput & { stations: Record<string, string> }} />
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function MultiSegmentTable({ seatChain }: { seatChain: MultiChainOutput & { stations: Record<string, string> } }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead rowSpan={2}>Seg</TableHead>
          <TableHead rowSpan={2}>From</TableHead>
          <TableHead rowSpan={2}>To</TableHead>
          <TableHead rowSpan={2}>Time</TableHead>
          {seatChain.travelerChains.map((tc) => (
            <TableHead key={tc.travelerIndex} colSpan={2} className="text-center">
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
              <TableCell className="text-xs">{formatTime(seg.departureTime)}</TableCell>
              {parsedSeats.map((parsed, idx) => (
                <React.Fragment key={idx}>
                  <TableCell>{parsed.carriage ?? "—"}</TableCell>
                  <TableCell>{parsed.seat ?? "—"}</TableCell>
                </React.Fragment>
              ))}
              <TableCell>
                {seg.collisionFree ? (
                  <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3" />
                    OK
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Collision
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function SingleSegmentTable({ seatChain }: { seatChain: SingleChainOutput & { stations: Record<string, string> } }) {
  return (
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
              <TableCell className="text-xs">{formatTime(seg.departureTime)}</TableCell>
              <TableCell>{parsed.carriage ?? "—"}</TableCell>
              <TableCell>{parsed.seat ?? "—"}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}