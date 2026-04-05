import { HttpError, postJson, postText } from "@/lib/http";
import type { HarRequestConfig, JsonObject, SegmentsOutput, SegmentOutputItem } from "@/lib/types";

function requireField(
  obj: Record<string, unknown>,
  field: string,
  label: string,
): unknown {
  const value = obj[field];
  if (value === undefined) {
    throw new Error(`Missing field '${field}' in ${label}`);
  }
  return value;
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid object for ${label}`);
  }
  return value as Record<string, unknown>;
}

function asStop(value: unknown, index: number): Record<string, unknown> {
  return asObject(value, `stops[${index}]`);
}

function buildSegmentPayload(
  basePayload: JsonObject,
  fromStop: Record<string, unknown>,
  toStop: Record<string, unknown>,
  fromIndex: number,
  toIndex: number,
): JsonObject {
  const stationFrom = requireField(fromStop, "stationNumber", `stops[${fromIndex}]`);
  const stationTo = requireField(toStop, "stationNumber", `stops[${toIndex}]`);
  const departureDate = requireField(fromStop, "epaDepartureDate", `stops[${fromIndex}]`);
  const arrivalDate = requireField(toStop, "epaArrivalDate", `stops[${toIndex}]`);

  if (typeof stationFrom !== "number" || typeof stationTo !== "number") {
    throw new Error(`Invalid station number type in stops[${fromIndex}] or stops[${toIndex}]`);
  }
  if (typeof departureDate !== "string" || typeof arrivalDate !== "string") {
    throw new Error(`Invalid date type in stops[${fromIndex}] or stops[${toIndex}]`);
  }

  return {
    ...basePayload,
    stationFrom,
    stationTo,
    stationNumberingSystem: "EPA",
    departureDate,
    arrivalDate,
  };
}

async function resolveStationName(stationNumber: number, config: HarRequestConfig): Promise<string> {
  const epaId = stationNumber % 10000;
  try {
    return await postText(config.epaStationNameUrl, config.headers, { epaId });
  } catch (error) {
    if (!(error instanceof HttpError)) {
      throw error;
    }
    return await postText(config.hafasStationNameUrl, config.headers, {
      hafasId: String(stationNumber),
    });
  }
}

export async function buildSegmentsOutput(config: HarRequestConfig): Promise<SegmentsOutput> {
  const journeyResponse = await postJson<JsonObject>(config.grmUrl, config.headers, config.payload);
  const stopsRaw = journeyResponse.stops;
  if (!Array.isArray(stopsRaw)) {
    throw new Error("Journey response does not contain a valid 'stops' array");
  }
  if (stopsRaw.length < 2) {
    throw new Error("Need at least 2 stops to build segment requests");
  }

  const stops = stopsRaw.map((stop, index) => asStop(stop, index));

  const stationNames = new Map<number, string>();
  for (let i = 0; i < stops.length; i += 1) {
    const station = requireField(stops[i], "stationNumber", `stops[${i}]`);
    if (typeof station !== "number") {
      throw new Error(`Invalid stationNumber type in stops[${i}]`);
    }
    if (!stationNames.has(station)) {
      const name = await resolveStationName(station, config);
      stationNames.set(station, name);
    }
  }

  const segments: SegmentOutputItem[] = [];
  for (let i = 0; i < stops.length - 1; i += 1) {
    const segmentPayload = buildSegmentPayload(config.payload, stops[i], stops[i + 1], i, i + 1);
    const segmentResponse = await postJson<JsonObject>(config.grmUrl, config.headers, segmentPayload);
    const stationFrom = segmentPayload.stationFrom;
    const stationTo = segmentPayload.stationTo;
    if (typeof stationFrom !== "number" || typeof stationTo !== "number") {
      throw new Error(`Invalid generated station numbers for segment ${i + 1}`);
    }
    segments.push({
      segmentIndex: i + 1,
      stationFromName: stationNames.get(stationFrom),
      stationToName: stationNames.get(stationTo),
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
