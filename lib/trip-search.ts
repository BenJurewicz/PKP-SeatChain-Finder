import { getTextAndHeaders } from "./http";
import {
  BILKOM_HOME_URL,
  BILKOM_TRIP_SEARCH_URL,
  DEFAULT_SEARCH_HEADERS,
} from "./constants";
import type { Station, Trip, TripStop } from "./types";

interface JourneyLegStop {
  type?: string;
  id?: string;
  name?: string;
  arrivalDate?: number | null;
  departureDate?: number | null;
  platform?: string | null;
  track?: string | null;
  extId?: string;
}

interface JourneyLeg {
  num?: string | null;
  trainCommercialName?: string | null;
  routeType?: string | null;
  totalTime?: number | null;
  stops?: JourneyLegStop[];
}

/** Session cookie cache for bilkom.pl (the podroz search requires a SESSION cookie). */
let sessionCookie: string | null = null;
let sessionCookieFetchedAt = 0;
const SESSION_COOKIE_TTL_MS = 10 * 60 * 1000;

async function fetchSessionCookie(): Promise<string | null> {
  const { headers } = await getTextAndHeaders(BILKOM_HOME_URL, DEFAULT_SEARCH_HEADERS);
  const setCookie = headers["set-cookie"];
  if (!setCookie) return null;
  const match = /SESSION=([^;,]+)/.exec(setCookie);
  return match ? `SESSION=${match[1]}` : null;
}

async function getSessionCookie(): Promise<string | null> {
  const now = Date.now();
  if (sessionCookie && now - sessionCookieFetchedAt < SESSION_COOKIE_TTL_MS) {
    return sessionCookie;
  }
  sessionCookie = await fetchSessionCookie();
  sessionCookieFetchedAt = now;
  return sessionCookie;
}

function invalidateSessionCookie(): void {
  sessionCookie = null;
  sessionCookieFetchedAt = 0;
}

function extractCarrierId(trainName: string): string {
  if (!trainName) return "";
  const parts = trainName.trim().split(/\s+/);
  const carrier = parts[0] || "";
  return isPlaceholderName(carrier) ? "" : carrier;
}

/** True when the server rendered a literal "null"/"undefined" placeholder
 * instead of a real name (it string-concatenates null trip fields, e.g.
 * `<div class="hidden main-carrier">null null</div>` for mixed trips). */
function isPlaceholderName(name: string): boolean {
  return /^(null|undefined|nan)([\s-]|$)/i.test(name);
}

function formatDateTimeParts(dateTime: Date): { year: string; month: string; day: string; hour: string; minute: string } {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(dateTime);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

function formatDateWarsaw(dateTime: Date, separator: string): string {
  const p = formatDateTimeParts(dateTime);
  return `${p.day}${separator}${p.month}${separator}${p.year}`;
}

function formatTimeWarsaw(dateTime: Date): string {
  const p = formatDateTimeParts(dateTime);
  return `${p.hour}:${p.minute}`;
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
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
}

function parseTimestamp(ts: number | null | undefined): string | null {
  if (ts == null) return null;
  return timestampToIso(ts);
}

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/")
    .replace(/&#47;/g, "/");
}

interface MatchResult {
  tripIndex: number;
  legs: JourneyLeg[];
  trainName: string;
}

function extractTripMatches(html: string): MatchResult[] {
  const matches: MatchResult[] = [];
  const tripPattern = /<li[^>]*class="el"[^>]*data-trip="(\d+)"[^>]*data-trip-id="([^"]+)"/g;

  const starts: Array<{ index: number; tripIndex: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = tripPattern.exec(html)) !== null) {
    starts.push({ index: match.index, tripIndex: parseInt(match[1], 10) });
  }

  for (let i = 0; i < starts.length; i += 1) {
    const tripIndex = starts[i].tripIndex;
    const searchStart = starts[i].index;
    // Cap the search area at the start of the next trip element so carrier/
    // jsonPath lookups never bleed into the following trip.
    const searchEnd = i + 1 < starts.length ? starts[i + 1].index : Math.min(searchStart + 200000, html.length);
    const searchArea = html.substring(searchStart, searchEnd);

    const jsonPathPattern = /<input[^>]*class="jsonPath"[^>]*>/;
    const jsonPathMatch = jsonPathPattern.exec(searchArea);
    if (!jsonPathMatch) continue;

    const valueMatch = /value="([^"]*)"/.exec(jsonPathMatch[0]);
    if (!valueMatch) continue;

    let legs: JourneyLeg[];
    try {
      const parsed: unknown = JSON.parse(decodeHTMLEntities(valueMatch[1]));
      if (!Array.isArray(parsed)) continue;
      legs = parsed as JourneyLeg[];
    } catch {
      continue;
    }

    const carrierPattern = /<div class="hidden main-carrier">([^<]+)<\/div>/;
    const carrierMatch = carrierPattern.exec(searchArea);
    const rawTrainName = carrierMatch ? carrierMatch[1].trim() : "";
    let trainName = isPlaceholderName(rawTrainName) ? "" : rawTrainName;

    // The site renders the hidden main-carrier div as a literal "null null"
    // for some queries (e.g. from stations without a rendered commercial
    // carrier header), even though the same train shows its type elsewhere.
    // Its own carrier badge ("carrier-metadata") always carries the real
    // carrier type and train number as data attributes — use those as the
    // fallback so the train name ("IC 8114") and carrier pill stay correct
    // regardless of the departure station.
    if (!trainName) {
      const trainNums = new Set(
        legs
          .filter((leg) => leg.routeType === "TRAIN" && typeof leg.num === "string" && leg.num.length > 0)
          .map((leg) => leg.num as string),
      );
      const metaPattern = /<div[^>]*carrier-metadata[^>]*>/g;
      let metaMatch: RegExpExecArray | null;
      while ((metaMatch = metaPattern.exec(searchArea)) !== null) {
        const attrs = metaMatch[0];
        const carrierId = /data-carrierId="([^"]*)"/.exec(attrs)?.[1]?.trim() ?? "";
        const number = /data-number="([^"]*)"/.exec(attrs)?.[1]?.trim() ?? "";
        if (
          carrierId &&
          carrierId !== "HAFAS_NO_TRAIN" &&
          !isPlaceholderName(carrierId) &&
          number &&
          trainNums.has(number)
        ) {
          trainName = `${carrierId} ${number}`;
          break;
        }
      }
    }

    matches.push({
      tripIndex,
      legs,
      trainName,
    });
  }

  return matches;
}

function extractStopsFromLeg(leg: JourneyLeg): TripStop[] {
  const stops = leg.stops;
  if (!Array.isArray(stops)) return [];

  return stops.map((stop) => {
    return {
      stationId: String(stop.extId ?? ""),
      stationName: String(stop.name ?? ""),
      arrivalDate: parseTimestamp(stop.arrivalDate),
      departureDate: parseTimestamp(stop.departureDate),
      platform: stop.platform ? String(stop.platform) : undefined,
      track: stop.track ? String(stop.track) : undefined,
    };
  });
}

function isTrainLeg(leg: JourneyLeg): boolean {
  return leg.routeType === "TRAIN" && typeof leg.num === "string" && leg.num.length > 0;
}

function isValidTrip(trip: Partial<Trip>): trip is Trip {
  if (!trip.departure?.stationId || !trip.arrival?.stationId) return false;
  if (!trip.trainNumber || !trip.departure?.dateTime || !trip.arrival?.dateTime) return false;
  if (!trip.stops || trip.stops.length < 2) return false;
  return true;
}

function buildTripFromMatch(match: MatchResult): Trip | null {
  // The GRM seat-map pipeline only supports a single train, so only trips made
  // up of exactly one TRAIN leg are usable (direct connections).
  const trainLegs = match.legs.filter(isTrainLeg);
  if (trainLegs.length !== 1) return null;
  const leg = trainLegs[0];

  const stops = extractStopsFromLeg(leg);
  if (stops.length < 2) return null;

  const num = typeof leg.num === "string" ? leg.num : "";
  const vehicleNumber = parseInt(num, 10);
  if (!Number.isFinite(vehicleNumber) || vehicleNumber <= 0) return null;

  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];

  let trainName = match.trainName;
  if (!trainName) {
    trainName = `${num}${leg.trainCommercialName ? ` "${leg.trainCommercialName}"` : ""}`;
  }

  const trip: Partial<Trip> = {
    tripIndex: match.tripIndex,
    trainName,
    trainNumber: num,
    carrierId: extractCarrierId(trainName),
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
    duration: leg.totalTime ?? 0,
    stops,
    segmentRequest: {
      stationFrom: parseInt(firstStop.stationId, 10),
      stationTo: parseInt(lastStop.stationId, 10),
      stationNumberingSystem: "HAFAS",
      vehicleNumber,
      departureDate: firstStop.departureDate ?? "",
      arrivalDate: lastStop.arrivalDate ?? "",
      type: "CARRIAGE",
    },
  };

  if (!isValidTrip(trip)) return null;
  return trip;
}

/** True when the podroz page rendered its "no connections found" template. */
function isEmptySearchResponse(html: string): boolean {
  return html.includes("id=\"empty-results\"") || html.includes("Nie znaleziono");
}

async function fetchTripHtml(
  params: URLSearchParams,
): Promise<{ html: string; cookieWasUsed: boolean }> {
  const cookie = await getSessionCookie();
  const headers: Record<string, string> = { ...DEFAULT_SEARCH_HEADERS };
  if (cookie) {
    headers["Cookie"] = cookie;
  }

  const url = `${BILKOM_TRIP_SEARCH_URL}?${params.toString()}`;
  const { text, headers: responseHeaders } = await getTextAndHeaders(url, headers);

  // Keep the session cookie warm if the server refreshed it.
  const refreshed = responseHeaders["set-cookie"];
  if (refreshed) {
    const match = /SESSION=([^;,]+)/.exec(refreshed);
    if (match) {
      sessionCookie = `SESSION=${match[1]}`;
      sessionCookieFetchedAt = Date.now();
    }
  }

  return { html: text, cookieWasUsed: Boolean(cookie) };
}

export async function findTrips(
  fromStation: Station,
  toStation: Station,
  dateTime: Date
): Promise<Trip[]> {
  const formattedDate = formatDateWarsaw(dateTime, ".");
  const formattedTime = formatTimeWarsaw(dateTime);

  // Bilkom trip search expects DDMMYYYYHHMM (e.g. 200920260900).
  const dataParam = formatDateWarsaw(dateTime, "") + formattedTime.replace(":", "");

  const params = new URLSearchParams({
    basketKey: "",
    carrierKeys: "PZ,P2,P3,P1,P5,P7,P9,P0,O1,P4,P6",
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
    _csrf: "",
  });

  // The `directOnly` query param makes the current podroz endpoint return no
  // results at all (it broke server-side); direct connections are filtered
  // after parsing instead (see buildTripFromMatch).
  let html = (await fetchTripHtml(params)).html;
  let matches = extractTripMatches(html);

  if (matches.length === 0 && isEmptySearchResponse(html)) {
    // The no-results page is also what a missing/expired session cookie
    // produces — refresh the cookie once and retry.
    invalidateSessionCookie();
    const retry = await fetchTripHtml(params);
    html = retry.html;
    matches = extractTripMatches(html);
  }

  const trips: Trip[] = [];
  for (const match of matches) {
    const trip = buildTripFromMatch(match);
    if (trip) {
      trips.push(trip);
    }
  }

  return trips;
}
