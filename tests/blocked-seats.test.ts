import { describe, it, expect } from "vitest";
import { extractReleasingSeats } from "@/lib/blocked-seats";
import type { SegmentsOutput } from "@/lib/types";

function segment(
  index: number,
  carriages: Record<string, unknown>[],
  times?: { departure?: string; arrival?: string; from?: string; to?: string },
): SegmentsOutput["segments"][number] {
  return {
    segmentIndex: index,
    stationFromName: times?.from,
    stationToName: times?.to,
    departureTime: times?.departure,
    arrivalTime: times?.arrival,
    request: {},
    response: { carriages },
  };
}

describe("extractReleasingSeats", () => {
  it("finds blocked seats whose restriction expires before departure", () => {
    const data: SegmentsOutput = {
      stations: {},
      segments: [
        segment(1, [
          {
            carriageNumber: 10,
            spots: [
              {
                number: 42,
                status: "BLOCKED",
                properties: ["CLASS_2", "WINDOW"],
                specialProperties: [
                  { property: "POLITICIAN", validTo: "2026-04-06T08:00:00" },
                ],
              },
            ],
          },
        ], {
          departure: "2026-04-06T09:00:00",
          arrival: "2026-04-06T09:40:00",
          from: "Ełk",
          to: "Giżycko",
        }),
      ],
    };
    const releases = extractReleasingSeats(data);
    expect(releases).toHaveLength(1);
    expect(releases[0]).toMatchObject({
      carriageNumber: 10,
      seatNumber: 42,
      status: "BLOCKED",
      reason: "Politician",
      validTo: "2026-04-06T08:00:00",
      availableBeforeDeparture: true,
      position: "WINDOW",
    });
  });

  it("uses the earliest validTo across segments and only counts RESERVED/BLOCKED", () => {
    const data: SegmentsOutput = {
      stations: {},
      segments: [
        segment(1, [
          {
            carriageNumber: 5,
            spots: [
              {
                number: 7,
                status: "RESERVED",
                properties: ["CLASS_2", "AISLE"],
                specialProperties: [{ property: "BIKE", validTo: "2026-04-06T12:00:00" }],
              },
            ],
          },
        ], { departure: "2026-04-06T09:00:00", arrival: "2026-04-06T09:40:00" }),
        segment(2, [
          {
            carriageNumber: 5,
            spots: [
              {
                number: 7,
                status: "RESERVED",
                properties: ["CLASS_2", "AISLE"],
                specialProperties: [{ property: "BIKE", validTo: "2026-04-06T08:30:00" }],
              },
            ],
          },
        ], { departure: "2026-04-06T09:40:00", arrival: "2026-04-06T10:20:00" }),
        segment(3, [
          {
            carriageNumber: 5,
            spots: [{ number: 8, status: "AVAILABLE", properties: ["CLASS_2"] }],
          },
        ], { departure: "2026-04-06T10:20:00", arrival: "2026-04-06T11:00:00" }),
      ],
    };
    const releases = extractReleasingSeats(data);
    expect(releases).toHaveLength(1);
    expect(releases[0].validTo).toBe("2026-04-06T08:30:00");
    expect(releases[0].availableBeforeDeparture).toBe(true);
  });
});
