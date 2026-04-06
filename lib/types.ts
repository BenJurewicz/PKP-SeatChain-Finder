export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export interface HarRequestConfig {
  grmUrl: string;
  epaStationNameUrl: string;
  hafasStationNameUrl: string;
  headers: Record<string, string>;
  payload: JsonObject;
}

export interface SegmentOutputItem {
  segmentIndex: number;
  stationFromName?: string;
  stationToName?: string;
  departureTime?: string;
  arrivalTime?: string;
  request: JsonObject;
  response: JsonObject;
}

export interface SegmentsOutput {
  stations: Record<string, string>;
  segments: SegmentOutputItem[];
}

export interface Station {
  name: string;
  extId: string;
  id: string;
  geoPoint?: {
    lat: number;
    lon: number;
  };
}

export interface TripStop {
  stationId: string;
  stationName: string;
  arrivalDate: string | null;
  departureDate: string | null;
  platform?: string;
  track?: string;
}

export interface Trip {
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
  stops: TripStop[];
  segmentRequest: JsonObject;
}
