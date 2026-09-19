import { format, parse } from "date-fns";
import type { Station, Trip, TripSegmentRequest } from "@/lib/types";

/**
 * URL <-> state encoding for the multi-page flow. Every route derives its
 * state from search params, so any view can be linked or refreshed.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Journey leg as chosen on the home page; feeds /trains. */
export interface JourneyQuery {
  from: Station;
  to: Station;
  /** Warsaw-local calendar date, "YYYY-MM-DD". */
  date: string;
  /** Warsaw-local time of day, "HH:MM" (24h). */
  time: string;
}

/** Trip selected from /trains, plus the journey it came from; feeds /seats. */
export interface SeatsQuery {
  segmentRequest: TripSegmentRequest;
  trainName: string;
  trainNumber: string;
  carrierId: string;
  /** Seconds, as reported by the podroz endpoint. */
  duration: number;
  departureStationName: string;
  arrivalStationName: string;
  journey?: JourneyQuery;
}

function isValidStation(station: unknown): station is Station {
  if (!station || typeof station !== "object") return false;
  const s = station as Station;
  return (
    typeof s.name === "string" &&
    s.name.length > 0 &&
    typeof s.id === "string" &&
    s.id.length > 0 &&
    typeof s.extId === "string" &&
    s.extId.length > 0
  );
}

function isValidSegmentRequest(value: unknown): value is TripSegmentRequest {
  if (!value || typeof value !== "object") return false;
  const r = value as TripSegmentRequest;
  return (
    typeof r.stationFrom === "number" &&
    typeof r.stationTo === "number" &&
    typeof r.vehicleNumber === "number" &&
    typeof r.departureDate === "string" &&
    typeof r.arrivalDate === "string" &&
    r.vehicleNumber > 0
  );
}

/** Shape check plus a round-trip so impossible dates ("2026-02-30") are
 * rejected instead of silently rolling over to the next month. */
function isValidDateParam(value: string): boolean {
  const parsed = parse(value, "yyyy-MM-dd", new Date(0));
  return !Number.isNaN(parsed.getTime()) && format(parsed, "yyyy-MM-dd") === value;
}

function isValidJourney(value: unknown): value is JourneyQuery {
  if (!value || typeof value !== "object") return false;
  const j = value as JourneyQuery;
  return (
    isValidStation(j.from) &&
    isValidStation(j.to) &&
    typeof j.date === "string" &&
    DATE_PATTERN.test(j.date) &&
    isValidDateParam(j.date) &&
    typeof j.time === "string" &&
    TIME_PATTERN.test(j.time)
  );
}

function isValidSeatsQuery(value: unknown): value is SeatsQuery {
  if (!value || typeof value !== "object") return false;
  const q = value as SeatsQuery;
  return (
    isValidSegmentRequest(q.segmentRequest) &&
    typeof q.trainNumber === "string" &&
    typeof q.departureStationName === "string" &&
    typeof q.arrivalStationName === "string" &&
    (q.journey === undefined || isValidJourney(q.journey))
  );
}

/** Build the /trains href for a journey. Passing travelers keeps the count
 * alive across the trains -> seats -> trains round trip. */
export function journeyHref(journey: JourneyQuery, travelers?: number): string {
  const travelersParam = travelers && travelers > 1 ? `&travelers=${travelers}` : "";
  return `/trains?j=${encodeURIComponent(JSON.stringify(journey))}${travelersParam}`;
}

/** Build the /seats href for a selected trip (keeps the journey for back-links). */
export function seatsHref(trip: Trip, journey: JourneyQuery, travelers: number): string {
  const query: SeatsQuery = {
    segmentRequest: trip.segmentRequest,
    trainName: trip.trainName,
    trainNumber: trip.trainNumber,
    carrierId: trip.carrierId,
    duration: trip.duration,
    departureStationName: trip.departure.stationName,
    arrivalStationName: trip.arrival.stationName,
    journey,
  };
  return `/seats?t=${encodeURIComponent(JSON.stringify(query))}&travelers=${travelers}`;
}

/** Parse a single JSON search param into typed data, or null when missing/invalid. */
function decodeParam<T>(raw: string | undefined, validate: (v: unknown) => v is T): T | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Decode the /trains search param, or null for an invalid link. */
export function decodeJourneyQuery(searchParams: Record<string, string | string[] | undefined>): JourneyQuery | null {
  return decodeParam(typeof searchParams.j === "string" ? searchParams.j : undefined, isValidJourney);
}

/** Parse the /seats search param, or null for an invalid link. */
export function decodeSeatsQuery(searchParams: Record<string, string | string[] | undefined>): SeatsQuery | null {
  return decodeParam(typeof searchParams.t === "string" ? searchParams.t : undefined, isValidSeatsQuery);
}

/** Travelers count from the /seats search param, clamped to 1..20. */
export function decodeTravelers(searchParams: Record<string, string | string[] | undefined>): number {
  const raw = typeof searchParams.travelers === "string" ? Number(searchParams.travelers) : NaN;
  return Number.isInteger(raw) && raw >= 1 && raw <= 20 ? raw : 1;
}

/** Build a SeatsQuery from a trip, for pages that already hold the Trip object. */
export function seatsQueryFromTrip(trip: Trip, journey: JourneyQuery): SeatsQuery {
  return {
    segmentRequest: trip.segmentRequest,
    trainName: trip.trainName,
    trainNumber: trip.trainNumber,
    carrierId: trip.carrierId,
    duration: trip.duration,
    departureStationName: trip.departure.stationName,
    arrivalStationName: trip.arrival.stationName,
    journey,
  };
}

/** TripSummary/TripInfo view of a SeatsQuery (for the report + arrival card). */
export function seatsQueryTripInfo(query: SeatsQuery): {
  trainName: string;
  trainNumber: string;
  carrierId: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
} {
  return {
    trainName: query.trainName,
    trainNumber: query.trainNumber,
    carrierId: query.carrierId,
    departureStation: query.departureStationName,
    arrivalStation: query.arrivalStationName,
    departureTime: query.segmentRequest.departureDate,
    arrivalTime: query.segmentRequest.arrivalDate,
    duration: query.duration,
  };
}

/** Rebuild a /seats href from an already-decoded query (e.g. to update the
 * travelers count in the address bar). */
export function seatsHrefFromQuery(query: SeatsQuery, travelers: number): string {
  return `/seats?t=${encodeURIComponent(JSON.stringify(query))}&travelers=${travelers}`;
}
