import { describe, it, expect } from "vitest";
import { buildSeatChainOutput, detectSpecialSeatProperties, isMultiChainOutput } from "@/lib/seat-chain";
import type { SegmentsOutput } from "@/lib/types";

function spot(
  number: number,
  status: string,
  properties: string[] = ["CLASS_2"],
  specialProperties?: unknown[],
): Record<string, unknown> {
  const spot: Record<string, unknown> = { number, status, properties };
  if (specialProperties) spot.specialProperties = specialProperties;
  return spot;
}

function carriage(number: number, spots: Record<string, unknown>[]): Record<string, unknown> {
  return { carriageNumber: number, spots };
}

function carriageResponse(carriages: Record<string, unknown>[]): Record<string, unknown> {
  return { carriages };
}

/** Two segments; seg1 has seat 41 available, seg2 has 41 and 42. */
function twoSegments(): SegmentsOutput {
  return {
    stations: { "101": "Ełk", "102": "Giżycko", "103": "Olsztyn" },
    segments: [
      {
        segmentIndex: 1,
        stationFromName: "Ełk",
        stationToName: "Giżycko",
        departureTime: "2026-04-06T09:00:00",
        arrivalTime: "2026-04-06T09:40:00",
        request: { stationFrom: 101, stationTo: 102 },
        response: carriageResponse([carriage(10, [spot(41, "AVAILABLE"), spot(42, "RESERVED")])]),
      },
      {
        segmentIndex: 2,
        stationFromName: "Giżycko",
        stationToName: "Olsztyn",
        departureTime: "2026-04-06T09:40:00",
        arrivalTime: "2026-04-06T10:20:00",
        request: { stationFrom: 102, stationTo: 103 },
        response: carriageResponse([
          carriage(10, [spot(41, "AVAILABLE"), spot(42, "AVAILABLE")]),
        ]),
      },
    ],
  };
}

describe("buildSeatChainOutput", () => {
  it("assigns a single seat covering both segments when available", () => {
    const output = buildSeatChainOutput(twoSegments(), 1);
    expect(isMultiChainOutput(output)).toBe(false);
    if (isMultiChainOutput(output)) return;
    expect(output.perSegmentAssignment.map((a) => a.assignedSeat)).toEqual(["10:41", "10:41"]);
    expect(output.summary.seatChanges).toBe(0);
    expect(output.summary.coveredSegments).toBe(2);
  });

  it("counts a change when the seat must switch mid-journey", () => {
    const data = twoSegments();
    // Remove 41 from the second segment so the chain must switch to 42.
    const seg2 = data.segments[1].response as Record<string, unknown>;
    const carriages = seg2.carriages as Record<string, unknown>[];
    const spots = carriages[0].spots as Record<string, unknown>[];
    spots[0].status = "RESERVED";

    const output = buildSeatChainOutput(data, 1);
    if (isMultiChainOutput(output)) throw new Error("expected single chain");
    expect(output.perSegmentAssignment.map((a) => a.assignedSeat)).toEqual(["10:41", "10:42"]);
    expect(output.summary.seatChanges).toBe(1);
  });

  it("allocates disjoint seats for two travelers", () => {
    const output = buildSeatChainOutput(twoSegments(), 2);
    expect(isMultiChainOutput(output)).toBe(true);
    if (!isMultiChainOutput(output)) return;
    expect(output.summary.travelers).toBe(2);
    expect(output.summary.collisionFree).toBe(true);
    // Traveler 1 gets 41; traveler 2 can only take 42 on the second segment.
    const t1 = output.travelerChains[0];
    const t2 = output.travelerChains[1];
    expect(t1.perSegmentAssignment.map((a) => a.assignedSeat)).toEqual(["10:41", "10:41"]);
    expect(t2.perSegmentAssignment.map((a) => a.assignedSeat)).toEqual([null, "10:42"]);
  });

  it("respects special-seat filters (default: excluded)", () => {
    const data = twoSegments();
    const seg1 = data.segments[0].response as Record<string, unknown>;
    const carriages = seg1.carriages as Record<string, unknown>[];
    const spots = carriages[0].spots as Record<string, unknown>[];
    spots[0].properties = ["CLASS_2", "BIKE"];

    const detected = detectSpecialSeatProperties(data);
    expect(detected.has("BIKE")).toBe(true);

    // With BIKE excluded (the default), segment 1 has no seat at all.
    const excluded = buildSeatChainOutput(data, 1, { BIKE: false });
    if (isMultiChainOutput(excluded)) throw new Error("expected single chain");
    expect(excluded.perSegmentAssignment[0].assignedSeat).toBeNull();

    // With BIKE included, the seat is offered again.
    const included = buildSeatChainOutput(data, 1, { BIKE: true });
    if (isMultiChainOutput(included)) throw new Error("expected single chain");
    expect(included.perSegmentAssignment[0].assignedSeat).toBe("10:41");
  });

  it("ignores non-CLASS_2 seats", () => {
    const data = twoSegments();
    const seg1 = data.segments[0].response as Record<string, unknown>;
    const carriages = seg1.carriages as Record<string, unknown>[];
    const spots = carriages[0].spots as Record<string, unknown>[];
    spots[0].properties = ["CLASS_1"];

    const output = buildSeatChainOutput(data, 1);
    if (isMultiChainOutput(output)) throw new Error("expected single chain");
    expect(output.perSegmentAssignment[0].assignedSeat).toBeNull();
  });

  it("throws on empty segment list", () => {
    expect(() =>
      buildSeatChainOutput({ stations: {}, segments: [] }, 1),
    ).toThrow();
  });
});
