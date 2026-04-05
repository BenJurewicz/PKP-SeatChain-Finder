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
  request: JsonObject;
  response: JsonObject;
}

export interface SegmentsOutput {
  stations: Record<string, string>;
  segments: SegmentOutputItem[];
}
