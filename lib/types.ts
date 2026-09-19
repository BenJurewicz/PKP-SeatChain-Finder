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

/** A single direct TRAIN leg as parsed from the podroz page. */
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
  segmentRequest: TripSegmentRequest;
}

/** Payload the seat-map (GRM) endpoint needs for one train's full journey. */
export interface TripSegmentRequest {
  stationFrom: number;
  stationTo: number;
  stationNumberingSystem: string;
  vehicleNumber: number;
  departureDate: string;
  arrivalDate: string;
  type: string;
}

/** Train identity + timing for display and deep links. */
export interface TripInfo {
  trainName: string;
  trainNumber: string;
  carrierId: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
}

/**
 * A seat that is currently RESERVED or BLOCKED but whose special restriction
 * (e.g. politician, person with child) expires at `validTo`, after which the
 * seat becomes bookable by anyone.
 */
export interface SeatRelease {
  seatNumber: number;
  carriageNumber: number;
  trainClass: "CLASS_1" | "CLASS_2";
  position: "AISLE" | "MIDDLE" | "WINDOW";
  /** Human-readable reason the seat is currently unavailable. */
  reason: string;
  /** Raw special property from the API (e.g. "POLITICIAN"). */
  specialProperty: string;
  /** Current spot status in the API (RESERVED or BLOCKED). */
  status: "RESERVED" | "BLOCKED";
  /** When the special restriction expires (Warsaw-local ISO string). */
  validTo: string;
  /** True when the seat frees up before the journey departs. */
  availableBeforeDeparture: boolean;
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
