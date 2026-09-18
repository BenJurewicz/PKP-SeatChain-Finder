import type { SegmentsOutput, SeatRelease } from "./types";
import { asObject } from "@/lib/parsing";

function parsePropertyReason(property: string): string {
  const normalized = property.toUpperCase();
  const reasonMap: Record<string, string> = {
    POLITICIAN: "Politician",
    PERSON_WITH_CHILD: "Person with child",
    HANDICAPPED_WITHOUT_WHEELCHAIR: "Handicapped (no wheelchair)",
    HANDICAPPED_WITH_WHEELCHAIR: "Wheelchair user",
    HANDICAPPED_GUARDIAN: "Guardian of handicapped person",
    BIKE: "Bike",
    FOR_DISABLED: "Disabled",
    FOR_FAMILIES: "Families",
    FOR_GROUP: "Group",
    EMPLOYEE: "Employee",
  };
  if (reasonMap[normalized]) {
    return reasonMap[normalized];
  }
  return property
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SpecialRestriction {
  property: string;
  validTo: string;
}

/**
 * Picks the specialProperties entry with the latest validTo: the seat only
 * frees up once ALL of its restrictions have expired.
 */
function pickLatestRestriction(specialProperties: unknown[]): SpecialRestriction | null {
  let latest: SpecialRestriction | null = null;
  for (const raw of specialProperties) {
    const entry = asObject(raw);
    if (!entry) continue;
    const property = entry.property;
    const validTo = entry.validTo;
    if (typeof property !== "string" || typeof validTo !== "string") continue;
    const time = new Date(validTo).getTime();
    if (Number.isNaN(time)) continue;
    if (!latest || time > new Date(latest.validTo).getTime()) {
      latest = { property, validTo };
    }
  }
  return latest;
}

/**
 * True when the seat frees up before (or exactly when) the journey departs.
 * `validTo` and `journeyDepartureTime` are Warsaw-local ISO strings, so plain
 * Date comparison is consistent for both.
 */
function isAvailableBeforeDeparture(validTo: string, journeyDepartureTime?: string): boolean {
  const releaseTime = new Date(validTo).getTime();
  if (Number.isNaN(releaseTime)) return false;
  if (!journeyDepartureTime) return false;
  const departureTime = new Date(journeyDepartureTime).getTime();
  if (Number.isNaN(departureTime)) return false;
  return releaseTime <= departureTime;
}

/**
 * Extracts seats that will become available: spots with status RESERVED or
 * BLOCKED carrying specialProperties with a validTo, aggregated across all
 * segments of the journey. A seat's effective validTo is the minimum across
 * segments (the seat is bookable from that moment for the whole trip).
 */
export function extractReleasingSeats(data: SegmentsOutput): SeatRelease[] {
  const seatMap = new Map<string, SeatRelease>();
  const journeyDepartureTime = data.segments.find((s) => typeof s.departureTime === "string")
    ?.departureTime;

  for (const segment of data.segments) {
    const response = asObject(segment.response);
    if (!response) continue;

    const carriages = response.carriages;
    if (!Array.isArray(carriages)) continue;

    for (const rawCarriage of carriages) {
      const carriage = asObject(rawCarriage);
      if (!carriage) continue;

      const carriageNumber = carriage.carriageNumber;
      const spots = carriage.spots;
      if (typeof carriageNumber !== "number" || !Array.isArray(spots)) continue;

      for (const rawSpot of spots) {
        const spot = asObject(rawSpot);
        if (!spot) continue;

        const status = spot.status;
        const spotNumber = spot.number;
        const properties = spot.properties;
        const specialProperties = spot.specialProperties;

        // Only seats that are NOT currently bookable can "become available".
        // AVAILABLE spots with static special props (BIKE etc.) are already
        // bookable and are handled by the seat-chain filters instead.
        if (status !== "RESERVED" && status !== "BLOCKED") continue;
        if (typeof spotNumber !== "number" || !Array.isArray(properties)) continue;
        if (!Array.isArray(specialProperties) || specialProperties.length === 0) continue;

        const restriction = pickLatestRestriction(specialProperties);
        if (!restriction) continue;
        if (typeof restriction.validTo !== "string" || typeof restriction.property !== "string") continue;

        const trainClass = properties.includes("CLASS_1") ? "CLASS_1" : "CLASS_2";
        const position = properties.find((p: string) =>
          ["AISLE", "MIDDLE", "WINDOW"].includes(p)
        ) as "AISLE" | "MIDDLE" | "WINDOW" | undefined;

        if (!position) continue;

        const reason = parsePropertyReason(restriction.property);
        const key = `${carriageNumber}:${spotNumber}`;

        const existing = seatMap.get(key);
        if (existing) {
          if (new Date(restriction.validTo) < new Date(existing.validTo)) {
            existing.validTo = restriction.validTo;
            existing.reason = reason;
            existing.specialProperty = restriction.property;
            existing.status = status;
          }
          existing.lastSegmentIndex = segment.segmentIndex;
          existing.lastStationName = segment.stationToName;
          existing.lastArrivalTime = segment.arrivalTime;
        } else {
          seatMap.set(key, {
            seatNumber: spotNumber,
            carriageNumber,
            trainClass,
            position,
            reason,
            specialProperty: restriction.property,
            status,
            validTo: restriction.validTo,
            availableBeforeDeparture: isAvailableBeforeDeparture(
              restriction.validTo,
              journeyDepartureTime
            ),
            firstSegmentIndex: segment.segmentIndex,
            lastSegmentIndex: segment.segmentIndex,
            firstStationName: segment.stationFromName,
            lastStationName: segment.stationToName,
            firstDepartureTime: segment.departureTime,
            lastArrivalTime: segment.arrivalTime,
          });
        }
      }
    }
  }

  const seats = Array.from(seatMap.values());
  for (const seat of seats) {
    seat.availableBeforeDeparture = isAvailableBeforeDeparture(
      seat.validTo,
      journeyDepartureTime
    );
  }

  seats.sort((a, b) => {
    const timeCompare = new Date(a.validTo).getTime() - new Date(b.validTo).getTime();
    if (timeCompare !== 0) return timeCompare;

    if (a.carriageNumber !== b.carriageNumber) {
      return a.carriageNumber - b.carriageNumber;
    }

    return a.seatNumber - b.seatNumber;
  });

  return seats;
}
