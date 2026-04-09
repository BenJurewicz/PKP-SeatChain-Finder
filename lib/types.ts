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

export interface BlockedSeat {
  seatNumber: number;
  carriageNumber: number;
  trainClass: "CLASS_1" | "CLASS_2";
  position: "AISLE" | "MIDDLE" | "WINDOW";
  reason: string;
  validTo: string;
  firstSegmentIndex: number;
  lastSegmentIndex: number;
  firstStationName?: string;
  lastStationName?: string;
  firstDepartureTime?: string;
  lastArrivalTime?: string;
}

export type SpecialSeatProperty =
  | "HANDICAPPED_GUARDIAN"
  | "HANDICAPPED_WITH_WHEELCHAIR"
  | "HANDICAPPED_WITHOUT_WHEELCHAIR"
  | "BIKE"
  | "PERSON_WITH_CHILD";

export interface SpecialSeatFilters {
  [property: string]: boolean;
}

export const SPECIAL_SEAT_LABELS: Record<SpecialSeatProperty, string> = {
  HANDICAPPED_GUARDIAN: "Guardian seats (for accompanying handicapped passengers)",
  HANDICAPPED_WITH_WHEELCHAIR: "Wheelchair accessible seats",
  HANDICAPPED_WITHOUT_WHEELCHAIR: "Handicapped seats (no wheelchair required)",
  BIKE: "Bike storage seats",
  PERSON_WITH_CHILD: "Seats for persons with children",
};
