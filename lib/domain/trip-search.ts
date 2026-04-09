import { getText } from "../http";
import { BILKOM_TRIP_SEARCH_URL, DEFAULT_SEARCH_HEADERS } from "../utils/constants";
import type { Station, Trip } from "./types";

interface BilkomTripStop {
  stationId: string;
  stationName: string;
  arrivalDate: string | null;
  departureDate: string | null;
  platform?: string;
  track?: string;
}

interface BilkomTrip {
  tripIndex: number;
  trainName: string;
  trainNumber: string;
  carrierId: string;
  departure: {
    stationId: string;
    stationName: string;
    dateTime: string;
  };
  arrival: {
    stationId: string;
    stationName: string;
    dateTime: string;
  };
  duration: number;
  stops: BilkomTripStop[];
  segmentRequest: {
    stationFrom: number;
    stationTo: number;
    stationNumberingSystem: string;
    vehicleNumber: number;
    departureDate: string;
    arrivalDate: string;
    type: string;
  };
}

function extractCarrierId(trainName: string): string {
  if (!trainName) return "";
  const parts = trainName.trim().split(/\s+/);
  return parts[0] || "";
}

function timestampToIso(tsMs: number): string {
  const date = new Date(tsMs);
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

function parseTimestamp(ts: number | null | undefined): string | null {
  if (ts == null) return null;
  return timestampToIso(ts);
}

function parseTripDataJson(jsonStr: string): Record<string, unknown> | null {
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return null;
  }
}

interface MatchResult {
  tripIndex: number;
  tripId: string;
  tripData: Record<string, unknown> | null;
  trainName: string;
}

function extractTripMatches(html: string): MatchResult[] {
  const matches: MatchResult[] = [];
  const tripPattern = /<li[^>]*class="el"[^>]*data-trip="(\d+)"[^>]*data-trip-id="([^"]+)"/g;

  let match: RegExpExecArray | null;
  while ((match = tripPattern.exec(html)) !== null) {
    const tripIndex = parseInt(match[1], 10);
    const tripId = decodeHTMLEntities(match[2]);

    const searchStart = match.index + match[0].length;
    const searchEnd = Math.min(searchStart + 50000, html.length);
    const searchArea = html.substring(searchStart, searchEnd);

    const tripDataPattern = /data-partoftripobj="([^"]+(?:\\&quot;[^"]*)*)"/;
    const tripDataMatch = tripDataPattern.exec(searchArea);

    let tripData: Record<string, unknown> | null = null;
    if (tripDataMatch) {
      const jsonStr = decodeHTMLEntities(tripDataMatch[1]);
      tripData = parseTripDataJson(jsonStr);
    }

    const carrierPattern = /<div class="hidden main-carrier">([^<]+)<\/div>/;
    const carrierMatch = carrierPattern.exec(searchArea);
    const trainName = carrierMatch ? carrierMatch[1].trim() : "";

    matches.push({
      tripIndex,
      tripId,
      tripData,
      trainName,
    });
  }

  return matches;
}

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/");
}

function extractStopsFromTripData(
  tripData: Record<string, unknown> | null
): BilkomTripStop[] {
  if (!tripData) return [];

  const stops = tripData.stops;
  if (!Array.isArray(stops)) return [];

  return stops.map((stop: unknown) => {
    const s = stop as Record<string, unknown>;
    return {
      stationId: String(s.extId ?? ""),
      stationName: String(s.name ?? ""),
      arrivalDate: parseTimestamp(s.arrivalDate as number | null | undefined),
      departureDate: parseTimestamp(s.departureDate as number | null | undefined),
      platform: s.platform ? String(s.platform) : undefined,
      track: s.track ? String(s.track) : undefined,
    };
  });
}

function isValidTrip(trip: Partial<BilkomTrip>): trip is BilkomTrip {
  if (!trip.departure?.stationId || !trip.arrival?.stationId) return false;
  if (!trip.trainNumber || !trip.departure?.dateTime || !trip.arrival?.dateTime) return false;
  if (!trip.stops || trip.stops.length < 2) return false;
  return true;
}

export async function findTrips(
  fromStation: Station,
  toStation: Station,
  dateTime: Date
): Promise<Trip[]> {
  const formattedDate = dateTime.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = dateTime.toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const dataParam = dateTime
    .toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/\//g, "");

  const params = new URLSearchParams({
    basketKey: "",
    carrierKeys: "PZ,P2,P3,P1,P5,P7,P9,P0,O1,P4",
    trainGroupKeys: "G.EXPRESS_TRAINS,G.FAST_TRAINS,G.REGIONAL_TRAINS",
    returnForOrderKey: "",
    fromStation: fromStation.name,
    poczatkowa: fromStation.id,
    toStation: toStation.name,
    docelowa: toStation.id,
    middleStation1: "",
    posrednia1: "",
    posrednia1czas: "",
    middleStation2: "",
    posrednia2: "",
    posrednia2czas: "",
    data: dataParam,
    date: formattedDate,
    time: formattedTime,
    przyjazd: "false",
    bilkomAvailOnly: "on",
    directOnly: "on",
    _csrf: "",
  });

  const url = `${BILKOM_TRIP_SEARCH_URL}?${params.toString()}`;
  const html = await getText(url, DEFAULT_SEARCH_HEADERS);

  const matches = extractTripMatches(html);
  const trips: Trip[] = [];

  for (const match of matches) {
    if (!match.tripData) continue;

    const stops = extractStopsFromTripData(match.tripData);
    if (stops.length < 2) continue;

    const num = match.tripData.num;
    const startDate = match.tripData.startDate as number | undefined;
    const stopDate = match.tripData.stopDate as number | undefined;
    const totalTime = match.tripData.totalTime as number | undefined;

    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];

    const bilkomTrip: Partial<BilkomTrip> = {
      tripIndex: match.tripIndex,
      trainName: match.trainName,
      trainNumber: num != null ? String(num) : "",
      carrierId: extractCarrierId(match.trainName),
      departure: {
        stationId: firstStop.stationId,
        stationName: firstStop.stationName,
        dateTime: firstStop.departureDate ?? "",
      },
      arrival: {
        stationId: lastStop.stationId,
        stationName: lastStop.stationName,
        dateTime: lastStop.arrivalDate ?? "",
      },
      duration: totalTime ?? 0,
      stops,
      segmentRequest: {
        stationFrom: parseInt(firstStop.stationId, 10),
        stationTo: parseInt(lastStop.stationId, 10),
        stationNumberingSystem: "HAFAS",
        vehicleNumber: num != null ? parseInt(String(num), 10) : 0,
        departureDate: firstStop.departureDate ?? "",
        arrivalDate: lastStop.arrivalDate ?? "",
        type: "CARRIAGE",
      },
    };

    if (isValidTrip(bilkomTrip)) {
      // Convert BilkomTrip to Trip
      const trip: Trip = {
        tripIndex: bilkomTrip.tripIndex,
        trainName: bilkomTrip.trainName,
        trainNumber: bilkomTrip.trainNumber,
        carrierId: bilkomTrip.carrierId,
        departure: bilkomTrip.departure,
        arrival: bilkomTrip.arrival,
        duration: bilkomTrip.duration,
        stops: bilkomTrip.stops,
        segmentRequest: bilkomTrip.segmentRequest as unknown as Trip["segmentRequest"],
      };
      trips.push(trip);
    }
  }

  return trips;
}