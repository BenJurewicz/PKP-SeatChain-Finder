import type { Trip } from "@/lib/types";

/** How far back the "See earlier trains" window reaches, in minutes.
 * The podroz endpoint has no pagination, so earlier/later loading re-runs
 * the search anchored outside the currently listed window. */
export const EARLIER_WINDOW_MINUTES = 120;

/** Identity that survives re-indexing across windowed searches. */
export function stableTripKey(trip: Trip): string {
  return `${trip.trainNumber}|${trip.departure.dateTime}|${trip.arrival.dateTime}`;
}

export function sortTrips(list: Trip[]): Trip[] {
  return [...list].sort(
    (a, b) =>
      a.departure.dateTime.localeCompare(b.departure.dateTime) ||
      a.arrival.dateTime.localeCompare(b.arrival.dateTime) ||
      a.trainNumber.localeCompare(b.trainNumber),
  );
}

/** tripIndex is per-search in the parser; make it sequential after merging
 * windows so React keys and selection comparisons stay unique. */
export function withSequentialIndices(list: Trip[]): Trip[] {
  return list.map((trip, index) =>
    trip.tripIndex === index + 1 ? trip : { ...trip, tripIndex: index + 1 },
  );
}

/** Shift a Warsaw wall-clock ISO string ("YYYY-MM-DDTHH:MM:SS") by whole
 * minutes while keeping the same wall-clock reading (DST-agnostic:
 * arithmetic happens on the displayed time, not on an absolute instant). */
export function shiftWallClock(
  iso: string,
  minutes: number,
): { date: string; time: string } {
  const [datePart, timePart] = iso.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day, hour, minute + minutes));
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  };
}
