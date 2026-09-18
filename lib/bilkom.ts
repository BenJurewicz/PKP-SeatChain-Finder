import { HttpError, postJson, postText } from "@/lib/http";
import type { HarRequestConfig, JsonObject, SegmentsOutput, SegmentOutputItem } from "@/lib/types";
import { requireObject } from "@/lib/parsing";

interface GrmStop {
  stationNumber: number;
  epaDepartureDate: string;
  epaArrivalDate: string;
}

function parseJourneyStops(journeyResponse: JsonObject): GrmStop[] {
  const stopsRaw = journeyResponse.stops;
  if (!Array.isArray(stopsRaw)) {
    throw new Error("Journey response does not contain a valid 'stops' array");
  }
  if (stopsRaw.length < 2) {
    throw new Error("Need at least 2 stops to build segment requests");
  }

  const stops: GrmStop[] = [];
  for (let i = 0; i < stopsRaw.length; i += 1) {
    const stop = requireObject(stopsRaw[i], `stops[${i}]`);
    const stationNumber = stop.stationNumber;
    const epaDepartureDate = stop.epaDepartureDate;
    const epaArrivalDate = stop.epaArrivalDate;
    if (typeof stationNumber !== "number") {
      throw new Error(`Invalid stationNumber type in stops[${i}]`);
    }
    if (typeof epaDepartureDate !== "string" || typeof epaArrivalDate !== "string") {
      throw new Error(`Invalid epa date type in stops[${i}]`);
    }
    stops.push({ stationNumber, epaDepartureDate, epaArrivalDate });
  }
  return stops;
}

/**
 * Resolve an EPA stop number from a GRM response (e.g. 5100136) to a station
 * name. The GRM response stops use EPA numbering; the EPA id is the number
 * with the leading "51" and zero padding stripped (5100136 -> 136), mirroring
 * the ngx-grm app's convertStationNumberToEpaNumber.
 */
function epaNumberToEpaId(stationNumber: number): number | null {
  const match = /^51(0*)(\d+)$/.exec(String(stationNumber));
  if (!match || match[2] === "") return null;
  return Number(match[2]);
}

async function resolveStopStationName(
  stationNumber: number,
  config: HarRequestConfig,
): Promise<string> {
  const epaId = epaNumberToEpaId(stationNumber);
  if (epaId !== null) {
    try {
      return await postText(config.epaStationNameUrl, config.headers, { epaId });
    } catch (error) {
      if (!(error instanceof HttpError)) {
        throw error;
      }
      // fall through to hafasStationName
    }
  }
  return await postText(config.hafasStationNameUrl, config.headers, {
    hafasId: String(stationNumber),
  });
}

function buildSegmentPayload(
  config: HarRequestConfig,
  vehicleNumber: number,
  fromStop: GrmStop,
  toStop: GrmStop,
): JsonObject {
  return {
    stationFrom: fromStop.stationNumber,
    stationTo: toStop.stationNumber,
    stationNumberingSystem: "EPA",
    vehicleNumber,
    departureDate: fromStop.epaDepartureDate,
    arrivalDate: toStop.epaArrivalDate,
    type: "CARRIAGE",
    returnAllSectionsAvailableAtStationFrom: true,
    returnBGMRecordsInfo: false,
  };
}

function journeyVehicleNumber(
  journeyResponse: JsonObject,
  config: HarRequestConfig,
): number {
  const vehicle = journeyResponse.vehicle;
  if (vehicle && typeof vehicle === "object" && !Array.isArray(vehicle)) {
    const epaNumer = (vehicle as JsonObject).epaNumer;
    if (typeof epaNumer === "number" && epaNumer > 0) {
      return epaNumer;
    }
  }
  const fromPayload = config.payload.vehicleNumber;
  if (typeof fromPayload === "number" && fromPayload > 0) {
    return fromPayload;
  }
  throw new Error("Unable to determine vehicle number for segment requests");
}

export async function buildSegmentsOutput(config: HarRequestConfig): Promise<SegmentsOutput> {
  const journeyResponse = await postJson<JsonObject>(config.grmUrl, config.headers, config.payload);
  const stops = parseJourneyStops(journeyResponse);
  const vehicleNumber = journeyVehicleNumber(journeyResponse, config);

  const stationNames = new Map<number, string>();
  for (const stop of stops) {
    if (!stationNames.has(stop.stationNumber)) {
      const name = await resolveStopStationName(stop.stationNumber, config);
      stationNames.set(stop.stationNumber, name);
    }
  }

  const segments: SegmentOutputItem[] = [];
  for (let i = 0; i < stops.length - 1; i += 1) {
    const fromStop = stops[i];
    const toStop = stops[i + 1];
    const segmentPayload = buildSegmentPayload(config, vehicleNumber, fromStop, toStop);
    const segmentResponse = await postJson<JsonObject>(config.grmUrl, config.headers, segmentPayload);
    segments.push({
      segmentIndex: i + 1,
      stationFromName: stationNames.get(fromStop.stationNumber),
      stationToName: stationNames.get(toStop.stationNumber),
      departureTime: fromStop.epaDepartureDate,
      arrivalTime: toStop.epaArrivalDate,
      request: segmentPayload,
      response: segmentResponse,
    });
  }

  return {
    stations: Object.fromEntries(
      [...stationNames.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([station, name]) => [String(station), name]),
    ),
    segments,
  };
}
