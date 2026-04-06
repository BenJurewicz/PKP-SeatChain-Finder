import type { SegmentsOutput, BlockedSeat } from "./types";

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parsePropertyReason(property: string): string {
  const normalized = property.toUpperCase();
  const reasonMap: Record<string, string> = {
    POLITICIAN: "Politician",
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

export function extractBlockedSeats(data: SegmentsOutput): BlockedSeat[] {
  const seatMap = new Map<string, BlockedSeat>();

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

        if (status !== "BLOCKED") continue;
        if (typeof spotNumber !== "number" || !Array.isArray(properties)) continue;
        if (!Array.isArray(specialProperties) || specialProperties.length === 0) continue;

        const specialProp = asObject(specialProperties[0]);
        if (!specialProp) continue;

        const validTo = specialProp.validTo;
        const property = specialProp.property;
        if (typeof validTo !== "string" || typeof property !== "string") continue;

        const trainClass = properties.includes("CLASS_1") ? "CLASS_1" : "CLASS_2";
        const position = properties.find((p: string) =>
          ["AISLE", "MIDDLE", "WINDOW"].includes(p)
        ) as "AISLE" | "MIDDLE" | "WINDOW" | undefined;

        if (!position) continue;

        const reason = parsePropertyReason(property);
        const key = `${carriageNumber}:${spotNumber}`;

        const existing = seatMap.get(key);
        if (existing) {
          if (new Date(validTo) < new Date(existing.validTo)) {
            existing.validTo = validTo;
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
            validTo,
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
