import type { JsonObject } from "./types";
import { DEFAULT_BILKOM_GRM_URL, DEFAULT_BILKOM_HEADERS } from "./constants";

export interface SegmentRequestConfig {
  stationFrom: number;
  stationTo: number;
  vehicleNumber: number;
  departureDate: string;
  arrivalDate: string;
  stationNumberingSystem?: string;
  type?: string;
}

export function buildSegmentPayload(config: SegmentRequestConfig): JsonObject {
  return {
    stationFrom: config.stationFrom,
    stationTo: config.stationTo,
    stationNumberingSystem: config.stationNumberingSystem ?? "HAFAS",
    vehicleNumber: config.vehicleNumber,
    departureDate: config.departureDate,
    arrivalDate: config.arrivalDate,
    type: config.type ?? "CARRIAGE",
    returnAllSectionsAvailableAtStationFrom: true,
    returnBGMRecordsInfo: false,
  };
}

export function buildHarConfigFromSegmentRequest(config: SegmentRequestConfig): {
  grmUrl: string;
  epaStationNameUrl: string;
  hafasStationNameUrl: string;
  headers: Record<string, string>;
  payload: JsonObject;
} {
  const grmUrl = DEFAULT_BILKOM_GRM_URL;
  const payload = buildSegmentPayload(config);

  return {
    grmUrl,
    epaStationNameUrl: `${grmUrl}/epaStationName`,
    hafasStationNameUrl: `${grmUrl}/hafasStationName`,
    headers: DEFAULT_BILKOM_HEADERS,
    payload,
  };
}